/**
 * Bundle Builder Pro — <bundle-builder-pro> custom element.
 *
 * Metaobject-driven storefront logic for the bundle-builder-pro section.
 * Zero dependencies. Coexists with the legacy <bundle-builder> element.
 *
 * Responsibilities:
 *  - selection state (click + drag & drop), variant + quantity handling
 *  - live pricing for: percentage, fixed_amount, tiered, quantity_break, bxgy
 *  - inventory-aware add buttons (uses per-variant data printed by Liquid)
 *  - free-gift unlocking
 *  - wizard step navigation
 *  - add-to-cart via /cart/add.js + automatic discount-code application so
 *    checkout totals always match the UI (codes are created in Admin with
 *    minimum-quantity requirements — Shopify enforces them server-side)
 *  - analytics: CustomEvents, dataLayer (GA4), fbq (Meta), Shopify.analytics
 *
 * Currency note: Liquid prints variant prices in the currency's minor units.
 * KWD/BHD/OMR use 3 decimals — same convention as the legacy builder.
 */
(function () {
  'use strict';

  if (customElements.get('bundle-builder-pro')) return;

  class BundleBuilderPro extends HTMLElement {
    #config = {};
    #i18n = {};
    #sel = new Map(); // key: `${productId}:${variantId}` -> {productId, variantId, title, image, price, qty, step, available}
    #wizardStep = 0;
    #busy = false;
    #viewTracked = false;

    connectedCallback() {
      this.#config = this.#json('[data-bbp-config]');
      this.#i18n = this.#json('[data-bbp-i18n]');
      this.#bindCards();
      this.#bindRail();
      this.#bindWizard();
      this.#bindSubmit();
      if (this.#config.type === 'fixed') this.#prefillFixed();
      this.#renderAll();
      this.#trackView();
    }

    #json(selector) {
      try { return JSON.parse(this.querySelector(selector).textContent); }
      catch (e) { return {}; }
    }

    #t(key, params) {
      var str = this.#i18n[key] || key;
      return str.replace(/\{(\w+)\}/g, function (_, k) {
        return params && params[k] != null ? params[k] : '';
      });
    }

    /* ── Cards ─────────────────────────────────────────────────────────── */

    #cards() { return Array.from(this.querySelectorAll('[data-bbp-card]')); }

    #cardVariant(card) {
      var variants = JSON.parse(card.dataset.variants || '[]');
      var select = card.querySelector('[data-bbp-variant]');
      var id = select ? Number(select.value) : (variants[0] && variants[0].id);
      return variants.find(function (v) { return v.id === id; }) || variants[0] || null;
    }

    #bindCards() {
      var self = this;
      this.#cards().forEach(function (card) {
        var plus = card.querySelector('[data-bbp-plus]');
        var minus = card.querySelector('[data-bbp-minus]');
        if (plus) plus.addEventListener('click', function () { self.#add(card); });
        if (minus) minus.addEventListener('click', function () { self.#remove(card); });

        var select = card.querySelector('[data-bbp-variant]');
        if (select) select.addEventListener('change', function () { self.#renderCard(card); });

        // HTML5 drag & drop (desktop); + buttons remain the accessible path.
        card.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/bbp-product', card.dataset.productId);
          e.dataTransfer.effectAllowed = 'copy';
          card.classList.add('is-dragging');
        });
        card.addEventListener('dragend', function () { card.classList.remove('is-dragging'); });
      });
    }

    #bindRail() {
      var self = this;
      var rail = this.querySelector('[data-bbp-rail]');
      if (!rail) return;
      rail.addEventListener('dragover', function (e) {
        if (e.dataTransfer.types.indexOf('text/bbp-product') !== -1) {
          e.preventDefault();
          rail.classList.add('is-dropping');
        }
      });
      rail.addEventListener('dragleave', function () { rail.classList.remove('is-dropping'); });
      rail.addEventListener('drop', function (e) {
        e.preventDefault();
        rail.classList.remove('is-dropping');
        var productId = e.dataTransfer.getData('text/bbp-product');
        var card = self.querySelector('[data-bbp-card][data-product-id="' + productId + '"]');
        if (card) self.#add(card);
      });
    }

    /* ── Selection state ───────────────────────────────────────────────── */

    #totalQty() {
      var total = 0;
      this.#sel.forEach(function (e) { total += e.qty; });
      return total;
    }

    #add(card) {
      var variant = this.#cardVariant(card);
      if (!variant || !variant.available) return this.#hint(this.#t('sold_out'), 'error');
      if (this.#totalQty() >= this.#config.maxQty) return;

      var key = card.dataset.productId + ':' + variant.id;
      var entry = this.#sel.get(key);

      // Respect tracked inventory (qty === -1 means untracked/unknown).
      var nextQty = (entry ? entry.qty : 0) + 1;
      if (variant.managed && variant.policy !== 'continue' && variant.qty >= 0 && nextQty > variant.qty) {
        return this.#hint(this.#t('sold_out'), 'error');
      }

      if (entry) entry.qty = nextQty;
      else this.#sel.set(key, {
        productId: Number(card.dataset.productId),
        variantId: variant.id,
        title: card.dataset.productTitle,
        image: card.dataset.image,
        price: variant.price,
        qty: 1,
        step: Number(card.dataset.step || 0)
      });
      this.#renderAll();
      this.#emit('bundle:item_added', { variantId: variant.id });
    }

    #remove(card) {
      var variant = this.#cardVariant(card);
      if (!variant) return;
      var key = card.dataset.productId + ':' + variant.id;
      var entry = this.#sel.get(key);
      if (!entry) return;
      entry.qty -= 1;
      if (entry.qty <= 0) this.#sel.delete(key);
      this.#renderAll();
    }

    #removeKey(key) {
      this.#sel.delete(key);
      this.#renderAll();
    }

    #prefillFixed() {
      // Fixed bundles: every rendered card is required at qty 1, locked.
      var self = this;
      this.#cards().forEach(function (card) {
        var variant = self.#cardVariant(card);
        if (!variant) return;
        self.#sel.set(card.dataset.productId + ':' + variant.id, {
          productId: Number(card.dataset.productId),
          variantId: variant.id,
          title: card.dataset.productTitle,
          image: card.dataset.image,
          price: variant.price,
          qty: 1,
          step: 0,
          locked: true
        });
      });
    }

    /* ── Pricing ───────────────────────────────────────────────────────── */

    #subtotal() {
      var total = 0;
      this.#sel.forEach(function (e) { total += e.price * e.qty; });
      return total;
    }

    #sortedTiers() {
      return (this.#config.tiers || []).slice().sort(function (a, b) { return a.min_qty - b.min_qty; });
    }

    #activeTier() {
      var qty = this.#totalQty();
      var active = null;
      this.#sortedTiers().forEach(function (t) { if (qty >= t.min_qty) active = t; });
      return active;
    }

    #nextTier() {
      var qty = this.#totalQty();
      return this.#sortedTiers().find(function (t) { return t.min_qty > qty; }) || null;
    }

    /**
     * Discount in minor units for the current selection.
     * tiered / quantity_break — % from the active tier
     * percentage              — flat % once minQty reached
     * fixed_amount            — flat amount once minQty reached
     * bxgy                    — cheapest unit per (minQty+1) group discounted
     *                           by discountValue % (100 = free)
     */
    #discount() {
      var sub = this.#subtotal();
      var qty = this.#totalQty();
      var cfg = this.#config;
      if (qty === 0) return 0;

      switch (cfg.discountType) {
        case 'tiered':
        case 'quantity_break': {
          var tier = this.#activeTier();
          return tier ? Math.round(sub * tier.discount / 100) : 0;
        }
        case 'percentage':
          return qty >= cfg.minQty ? Math.round(sub * cfg.discountValue / 100) : 0;
        case 'fixed_amount':
          return qty >= cfg.minQty ? Math.min(Math.round(cfg.discountValue), sub) : 0;
        case 'bxgy': {
          var groupSize = cfg.minQty + 1;
          var groups = Math.floor(qty / groupSize);
          if (groups === 0) return 0;
          var units = [];
          this.#sel.forEach(function (e) { for (var i = 0; i < e.qty; i++) units.push(e.price); });
          units.sort(function (a, b) { return a - b; });
          var pct = cfg.discountValue || 100;
          return units.slice(0, groups).reduce(function (s, p) { return s + Math.round(p * pct / 100); }, 0);
        }
        default:
          return 0;
      }
    }

    /** The discount code to apply at checkout for the current state. */
    #activeCode() {
      var tier = this.#activeTier();
      if (tier && tier.code) return tier.code;
      return this.#config.discountCode || null;
    }

    #giftUnlocked() {
      var gift = this.#config.freeGift;
      return !!(gift && gift.threshold > 0 && this.#totalQty() >= gift.threshold);
    }

    /* ── Rendering ─────────────────────────────────────────────────────── */

    #renderAll() {
      var self = this;
      this.#cards().forEach(function (card) { self.#renderCard(card); });
      this.#renderRail();
      this.#renderProgress();
      this.#renderSummary();
      this.#renderCTA();
    }

    #renderCard(card) {
      var variant = this.#cardVariant(card);
      var key = variant ? card.dataset.productId + ':' + variant.id : null;
      var entry = key ? this.#sel.get(key) : null;
      var qty = entry ? entry.qty : 0;
      var qtyEl = card.querySelector('[data-bbp-qty]');
      var minus = card.querySelector('[data-bbp-minus]');
      if (qtyEl) { qtyEl.textContent = String(qty); qtyEl.hidden = qty === 0; }
      if (minus) minus.hidden = qty === 0;
      card.classList.toggle('is-selected', qty > 0);
    }

    #renderRail() {
      var slots = this.querySelector('[data-bbp-slots]');
      if (!slots) return;
      var self = this;
      slots.innerHTML = '';
      var max = this.#config.maxQty;
      var filled = [];
      this.#sel.forEach(function (e, key) {
        for (var i = 0; i < e.qty; i++) filled.push({ entry: e, key: key });
      });

      for (var i = 0; i < max; i++) {
        var slot = document.createElement('div');
        slot.className = 'bbp__slot' + (filled[i] ? ' bbp__slot--filled' : '');
        if (filled[i]) {
          var img = document.createElement('img');
          img.src = filled[i].entry.image;
          img.alt = filled[i].entry.title;
          img.width = 56; img.height = 56; img.loading = 'lazy';
          slot.appendChild(img);
          if (!filled[i].entry.locked) {
            var x = document.createElement('button');
            x.type = 'button';
            x.className = 'bbp__slot-remove';
            x.setAttribute('aria-label', this.#t('remove') + ' ' + filled[i].entry.title);
            x.textContent = '×';
            (function (key) {
              x.addEventListener('click', function () {
                var entry = self.#sel.get(key);
                if (!entry) return;
                entry.qty -= 1;
                if (entry.qty <= 0) self.#removeKey(key); else self.#renderAll();
              });
            })(filled[i].key);
            slot.appendChild(x);
          }
        } else if (i < this.#config.minQty) {
          slot.classList.add('bbp__slot--required');
        }
        slots.appendChild(slot);
      }

      // Free gift slot
      if (this.#config.freeGift && this.#giftUnlocked()) {
        var giftSlot = document.createElement('div');
        giftSlot.className = 'bbp__slot bbp__slot--filled bbp__slot--gift';
        giftSlot.title = this.#t('gift_unlocked');
        var giftImg = document.createElement('img');
        giftImg.src = this.#config.freeGift.image;
        giftImg.alt = this.#config.freeGift.title;
        giftImg.width = 56; giftImg.height = 56;
        giftSlot.appendChild(giftImg);
        slots.appendChild(giftSlot);
      }
    }

    #renderProgress() {
      var fill = this.querySelector('[data-bbp-progress-fill]');
      var label = this.querySelector('[data-bbp-progress-label]');
      var markers = this.querySelector('[data-bbp-tier-markers]');
      if (!fill) return;
      var qty = this.#totalQty();
      var max = this.#config.maxQty;
      fill.style.width = Math.min(100, (qty / max) * 100) + '%';
      if (label) label.textContent = this.#t('progress', { n: qty, max: max });

      if (markers && !markers.dataset.built) {
        markers.dataset.built = '1';
        var self = this;
        this.#sortedTiers().forEach(function (t) {
          var m = document.createElement('span');
          m.className = 'bbp__tier-marker';
          m.style.insetInlineStart = Math.min(100, (t.min_qty / max) * 100) + '%';
          m.textContent = (self.dataset.locale === 'ar' && t.label_ar) ? t.label_ar : (t.label || ('-' + t.discount + '%'));
          markers.appendChild(m);
        });
      }
      if (markers) {
        Array.from(markers.children).forEach(function (m, idx) {
          var tier = this.#sortedTiers()[idx];
          m.classList.toggle('is-reached', tier && qty >= tier.min_qty);
        }, this);
      }
    }

    #renderSummary() {
      var box = this.querySelector('[data-bbp-summary]');
      if (!box) return;
      var sub = this.#subtotal();
      var disc = this.#discount();
      var display = this.#config.discountDisplay || 'both';
      var rows = [];

      rows.push('<div class="bbp__sum-row"><span>' + this.#t('subtotal') + '</span><strong>' + this.#money(sub) + '</strong></div>');
      if (disc > 0) {
        var tier = this.#activeTier();
        var pct = tier ? tier.discount : this.#config.discountValue;
        var label = this.#t('discount');
        if (display !== 'amount' && pct) label += ' (' + pct + '%)';
        var amount = display === 'percent' ? '' : '−' + this.#money(disc);
        rows.push('<div class="bbp__sum-row bbp__sum-row--save"><span>' + label + '</span><strong>' + amount + '</strong></div>');
      }
      rows.push('<div class="bbp__sum-row bbp__sum-row--total"><span>' + this.#t('total') + '</span><strong>' + this.#money(sub - disc) + '</strong></div>');

      // Upsell nudges
      var next = this.#nextTier();
      if (next) {
        rows.push('<p class="bbp__nudge">' + this.#t('next_tier', { n: next.min_qty - this.#totalQty(), d: next.discount }) + '</p>');
      } else if (this.#activeTier()) {
        rows.push('<p class="bbp__nudge bbp__nudge--done">' + this.#t('tier_unlocked', { d: this.#activeTier().discount }) + '</p>');
      }
      var gift = this.#config.freeGift;
      if (gift && gift.threshold > 0) {
        rows.push('<p class="bbp__nudge bbp__nudge--gift">' + (this.#giftUnlocked()
          ? this.#t('gift_unlocked')
          : this.#t('gift_progress', { n: gift.threshold - this.#totalQty() })) + '</p>');
      }
      box.innerHTML = rows.join('');
    }

    #renderCTA() {
      var btn = this.querySelector('[data-bbp-submit]');
      if (!btn) return;
      var qty = this.#totalQty();
      var ready = qty >= this.#config.minQty;
      btn.disabled = !ready || this.#busy;
      var label = btn.querySelector('[data-bbp-cta-label]');
      if (label && !this.#busy) {
        label.textContent = ready
          ? this.#t('add_bundle')
          : this.#t('min_hint', { n: Math.max(0, this.#config.minQty - qty) });
      }
    }

    /* ── Wizard ────────────────────────────────────────────────────────── */

    #bindWizard() {
      var self = this;
      var prev = this.querySelector('[data-bbp-wizard-prev]');
      var next = this.querySelector('[data-bbp-wizard-next]');
      if (!next) return;
      var steps = Array.from(this.querySelectorAll('[data-bbp-step]'))
        .map(function (el) { return Number(el.dataset.bbpStep); })
        .filter(function (v, i, arr) { return arr.indexOf(v) === i; });
      var maxStep = Math.max.apply(null, steps);

      function show(step) {
        self.#wizardStep = step;
        self.querySelectorAll('[data-bbp-step]').forEach(function (el) {
          el.hidden = Number(el.dataset.bbpStep) !== step;
        });
        if (prev) prev.hidden = step === 0;
        next.hidden = step === maxStep;
        self.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      next.addEventListener('click', function () { show(Math.min(maxStep, self.#wizardStep + 1)); });
      if (prev) prev.addEventListener('click', function () { show(Math.max(0, self.#wizardStep - 1)); });
    }

    /* ── Add to cart ───────────────────────────────────────────────────── */

    #bindSubmit() {
      var self = this;
      var btn = this.querySelector('[data-bbp-submit]');
      if (btn) btn.addEventListener('click', function () { self.#submit(btn); });
    }

    async #submit(btn) {
      if (this.#busy || this.#totalQty() < this.#config.minQty) return;
      this.#busy = true;
      btn.disabled = true;
      var label = btn.querySelector('[data-bbp-cta-label]');
      if (label) label.textContent = this.#t('adding');

      var bundleKey = 'bbp-' + Date.now();
      var items = [];
      this.#sel.forEach(function (e) {
        items.push({ id: e.variantId, quantity: e.qty, properties: { _bundle_id: bundleKey, _bundle_handle: this.dataset.bundleHandle || '' } });
      }, this);
      if (this.#giftUnlocked()) {
        items.push({ id: this.#config.freeGift.variantId, quantity: 1, properties: { _bundle_id: bundleKey, _free_gift: 'true' } });
      }

      try {
        // 1) Pre-arm the discount code so Shopify applies it in checkout.
        //    /discount/CODE stores the code in the cart session; harmless if
        //    requirements aren't met (Shopify validates server-side).
        var code = this.#activeCode();
        if (code) {
          await fetch('/discount/' + encodeURIComponent(code), { method: 'GET', credentials: 'same-origin' }).catch(function () {});
        }

        // 2) Atomic add of all bundle lines.
        var resp = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ items: items })
        });
        if (!resp.ok) {
          var er = await resp.json().catch(function () { return {}; });
          throw new Error(er.description || resp.statusText);
        }

        this.#hint(this.#t('added_cart'), 'success');
        this.#announce(this.#t('added_cart'));
        this.#trackAddToCart(bundleKey);

        if (this.dataset.redirect === 'true') window.location.href = '/cart';
        else document.dispatchEvent(new CustomEvent('cart:refresh')); // theme cart drawer hook
      } catch (err) {
        this.#hint(err.message || this.#t('cart_err'), 'error');
      } finally {
        this.#busy = false;
        this.#renderCTA();
      }
    }

    /* ── Analytics ─────────────────────────────────────────────────────── */

    #emit(name, detail) {
      document.dispatchEvent(new CustomEvent(name, { detail: Object.assign({ bundle: this.dataset.bundleHandle }, detail || {}) }));
    }

    #trackView() {
      if (this.#viewTracked || !this.#config.analytics) return;
      this.#viewTracked = true;
      this.#emit('bundle:view', {});
      try {
        if (window.dataLayer) window.dataLayer.push({ event: 'bundle_view', bundle_handle: this.dataset.bundleHandle });
        if (typeof window.fbq === 'function') window.fbq('trackCustom', 'BundleView', { bundle: this.dataset.bundleHandle });
      } catch (e) { /* analytics must never break the UI */ }
    }

    #trackAddToCart(bundleKey) {
      if (!this.#config.analytics) return;
      var value = (this.#subtotal() - this.#discount()) / Math.pow(10, this.#decimals());
      var currency = this.dataset.currency || 'KWD';
      this.#emit('bundle:add_to_cart', { key: bundleKey, value: value, currency: currency });
      try {
        if (window.dataLayer) window.dataLayer.push({
          event: 'add_to_cart',
          ecommerce: { currency: currency, value: value, items: [{ item_name: this.dataset.bundleHandle, item_category: 'bundle', quantity: this.#totalQty() }] }
        });
        if (typeof window.fbq === 'function') window.fbq('track', 'AddToCart', { content_type: 'product_group', content_name: this.dataset.bundleHandle, value: value, currency: currency });
        if (window.Shopify && window.Shopify.analytics && typeof window.Shopify.analytics.publish === 'function') {
          window.Shopify.analytics.publish('bundle_add_to_cart', { bundle: this.dataset.bundleHandle, value: value, currency: currency });
        }
      } catch (e) { /* best-effort */ }
    }

    /* ── Helpers ───────────────────────────────────────────────────────── */

    #decimals() {
      var c = this.dataset.currency || 'KWD';
      return (c === 'KWD' || c === 'BHD' || c === 'OMR') ? 3 : 2;
    }

    #money(minorUnits) {
      var dec = this.#decimals();
      var amount = (minorUnits / Math.pow(10, dec)).toFixed(dec);
      var formatted = Number(amount).toLocaleString(this.dataset.locale === 'ar' ? 'ar-KW' : 'en', { minimumFractionDigits: dec });
      return (this.dataset.currency || 'KWD') + ' ' + formatted;
    }

    #hint(msg, type) {
      var h = this.querySelector('[data-bbp-hint]');
      if (!h) return;
      h.textContent = msg;
      h.classList.toggle('is-error', type === 'error');
      h.classList.toggle('is-success', type === 'success');
      setTimeout(function () { h.classList.remove('is-error', 'is-success'); h.textContent = ''; }, 4000);
    }

    #announce(msg) {
      var sr = this.querySelector('[data-bbp-sr]');
      if (sr) sr.textContent = msg;
    }
  }

  customElements.define('bundle-builder-pro', BundleBuilderPro);
})();
