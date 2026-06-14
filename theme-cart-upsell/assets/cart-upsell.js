/**
 * Cart Upsell — <cart-upsell> custom element.
 *
 * Theme-native cart-drawer upsell. Zero dependencies, no jQuery. Coexists with
 * any AJAX cart. Responsibilities:
 *   - resolve client-side sources (automatic / related) via the Shopify
 *     Product Recommendations API + Section Rendering
 *   - horizontal carousel: arrows, dots, autoplay, scroll-snap (native swipe,
 *     momentum), RTL-aware paging
 *   - quick add: variant resolution (dropdown / buttons / swatches) + quantity,
 *     /cart/add.js with loading → success → error states and inventory errors
 *   - refresh the host theme's cart drawer via Section Rendering, with event
 *     fallbacks for themes that re-render themselves
 *   - re-anchor itself to the configured position inside the drawer
 *
 * Re-runs cleanly: when the drawer re-renders, the element re-initialises in
 * connectedCallback.
 */
(function () {
  'use strict';

  if (customElements.get('cart-upsell')) return;

  var SECTION_SELECTORS = [
    'cart-drawer', '#CartDrawer', '.cart-drawer', '.drawer--cart',
    'cart-items', '#main-cart-items', '#CartContainer', '.js-cart-drawer'
  ];

  class CartUpsell extends HTMLElement {
    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.cfg = this._json('[data-cu-config]') || {};
      this.i18n = this._json('[data-cu-i18n]') || {};
      this.track = this.querySelector('[data-cu-track]');
      this.viewport = this.querySelector('[data-cu-viewport]');
      this.status = this.querySelector('[data-cu-status]');
      this._debTimer = null;

      this._reanchor();
      if (this.cfg.useApi && this.cfg.seedId) {
        this._loadRecommendations();
      } else {
        this._ready();
      }
    }

    /* ── parsing helpers ─────────────────────────────────────────────── */
    _json(sel) {
      var el = this.querySelector(sel);
      if (!el) return null;
      try { return JSON.parse(el.textContent); } catch (e) { return null; }
    }
    _t(key, params) {
      var s = this.i18n[key] || key;
      if (params) Object.keys(params).forEach(function (k) {
        s = s.replace('[' + k + ']', params[k]).replace('{{ ' + k + ' }}', params[k]);
      });
      return s;
    }
    _say(msg) { if (this.status) this.status.textContent = msg; }

    /* ── client-rendered sources (automatic / related) ───────────────── */
    _loadRecommendations() {
      var self = this;
      var sid = this.dataset.sectionId;
      if (!sid) return this._ready();
      var url = '/recommendations/products'
        + '?section_id=' + encodeURIComponent(sid)
        + '&product_id=' + encodeURIComponent(this.cfg.seedId)
        + '&limit=' + encodeURIComponent(this.cfg.limit || 8)
        + '&intent=' + encodeURIComponent(this.cfg.intent === 'collection' ? 'related' : (this.cfg.intent || 'related'));

      fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var fresh = doc.querySelector('[data-cu-track]');
          if (fresh && fresh.children.length && self.track) {
            self.track.innerHTML = fresh.innerHTML;
          }
          self._ready();
        })
        .catch(function () { self._ready(); });
    }

    _ready() {
      var cells = this.querySelectorAll('[data-cu-card]');
      var empty = this.querySelector('[data-cu-empty]');
      if (!cells.length) { if (empty) empty.hidden = false; return; }
      this._bindCards();
      if (this.cfg.layout === 'carousel') this._initCarousel();
    }

    /* ── carousel ────────────────────────────────────────────────────── */
    _initCarousel() {
      var self = this;
      var track = this.track;
      if (!track) return;
      var prev = this.querySelector('[data-cu-prev]');
      var next = this.querySelector('[data-cu-next]');
      var dotsWrap = this.querySelector('[data-cu-dots]');
      var overflowing = track.scrollWidth > track.clientWidth + 4;

      if (!overflowing) {
        if (prev) prev.hidden = true;
        if (next) next.hidden = true;
        return;
      }

      function step() {
        var cell = track.querySelector('[data-cu-card]');
        var w = cell ? cell.getBoundingClientRect().width : track.clientWidth;
        return w + parseFloat(getComputedStyle(track).columnGap || 12);
      }
      // Inline-direction aware paging (handles RTL where scrollLeft is negative)
      function page(dir) {
        var rtl = self.getAttribute('dir') === 'rtl';
        var delta = step() * (rtl ? -dir : dir);
        track.scrollBy({ left: delta, behavior: 'smooth' });
      }

      if (prev) { prev.hidden = false; prev.addEventListener('click', function () { page(-1); }); }
      if (next) { next.hidden = false; next.addEventListener('click', function () { page(1); }); }

      // Dots
      var dots = [];
      if (dotsWrap) {
        var count = track.querySelectorAll('[data-cu-card]').length;
        for (var i = 0; i < count; i++) {
          var d = document.createElement('button');
          d.type = 'button';
          d.className = 'cu__dot' + (i === 0 ? ' is-active' : '');
          d.setAttribute('role', 'tab');
          d.setAttribute('aria-label', String(i + 1));
          (function (idx) {
            d.addEventListener('click', function () {
              var cell = track.querySelectorAll('[data-cu-card]')[idx];
              if (cell) cell.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
            });
          })(i);
          dotsWrap.appendChild(d);
          dots.push(d);
        }
      }

      function syncControls() {
        var max = track.scrollWidth - track.clientWidth;
        var pos = Math.abs(track.scrollLeft);
        if (prev) prev.disabled = pos <= 2;
        if (next) next.disabled = pos >= max - 2;
        if (dots.length) {
          var idx = Math.round((pos / max) * (dots.length - 1)) || 0;
          dots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === idx); });
        }
      }
      track.addEventListener('scroll', function () {
        window.requestAnimationFrame(syncControls);
      }, { passive: true });
      syncControls();

      // Keyboard nav on the viewport
      track.setAttribute('tabindex', '0');
      track.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { page(1); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { page(-1); e.preventDefault(); }
      });

      // Autoplay (pauses on hover/focus/touch + when tab hidden)
      if (this.cfg.autoplay) {
        var timer = null;
        var run = function () {
          timer = setInterval(function () {
            var max = track.scrollWidth - track.clientWidth;
            if (Math.abs(track.scrollLeft) >= max - 2) {
              if (self.cfg.infiniteLoop) track.scrollTo({ left: 0, behavior: 'smooth' });
            } else { page(1); }
          }, self.cfg.autoplaySpeed || 5000);
        };
        var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
        run();
        ['mouseenter', 'touchstart', 'focusin'].forEach(function (ev) { self.addEventListener(ev, stop, { passive: true }); });
        ['mouseleave', 'focusout'].forEach(function (ev) { self.addEventListener(ev, function () { stop(); run(); }); });
        document.addEventListener('visibilitychange', function () { document.hidden ? stop() : (stop(), run()); });
      }
    }

    /* ── card binding ────────────────────────────────────────────────── */
    _bindCards() {
      var self = this;
      this.querySelectorAll('[data-cu-card]').forEach(function (card) {
        var add = card.querySelector('[data-cu-add]');
        if (add && !add.dataset.bound) {
          add.dataset.bound = '1';
          add.addEventListener('click', function () { self._add(card, add); });
        }
        // Variant dropdown → update active variant id + price availability
        var sel = card.querySelector('[data-cu-variant-select]');
        if (sel && !sel.dataset.bound) {
          sel.dataset.bound = '1';
          sel.addEventListener('change', function () { self._syncVariant(card); });
        }
        card.querySelectorAll('[data-cu-opt-input]').forEach(function (input) {
          if (input.dataset.bound) return;
          input.dataset.bound = '1';
          input.addEventListener('change', function () { self._syncVariant(card); });
        });
        // Quantity steppers
        var qty = card.querySelector('[data-cu-qty]');
        var minus = card.querySelector('[data-cu-qty-minus]');
        var plus = card.querySelector('[data-cu-qty-plus]');
        if (minus) minus.addEventListener('click', function () { self._stepQty(qty, -1); });
        if (plus) plus.addEventListener('click', function () { self._stepQty(qty, 1); });
        self._syncVariant(card);
      });
    }

    _stepQty(input, dir) {
      if (!input) return;
      var v = Math.max(1, (parseInt(input.value, 10) || 1) + dir);
      input.value = v;
    }

    _variants(card) {
      try { return JSON.parse(card.dataset.variants || '[]'); } catch (e) { return []; }
    }

    _selectedVariant(card) {
      var variants = this._variants(card);
      if (!variants.length) return null;
      var sel = card.querySelector('[data-cu-variant-select]');
      if (sel) {
        var id = Number(sel.value);
        return variants.find(function (v) { return v.id === id; }) || variants[0];
      }
      var opts = card.querySelectorAll('[data-cu-opt]');
      if (opts.length) {
        var chosen = [];
        opts.forEach(function (fs) {
          var checked = fs.querySelector('[data-cu-opt-input]:checked');
          chosen.push(checked ? checked.value : null);
        });
        var match = variants.find(function (v) {
          return (v.options || []).every(function (val, i) { return chosen[i] == null || val === chosen[i]; });
        });
        return match || variants[0];
      }
      return variants[0];
    }

    _syncVariant(card) {
      var v = this._selectedVariant(card);
      var add = card.querySelector('[data-cu-add]');
      if (!v || !add) return;
      add.dataset.variantId = v.id;
      // Reflect availability
      var unavailable = !v.available;
      add.disabled = unavailable;
      add.classList.toggle('cu-card__add--disabled', unavailable);
      var label = add.querySelector('[data-cu-add-label]');
      if (label) label.textContent = unavailable ? this._t('sold_out') : this._t('add_to_cart');
      // Reflect price only when the shopper can actually switch variants —
      // otherwise keep the theme's server-rendered (correctly formatted) price.
      var priceEl = card.querySelector('[data-cu-price]');
      if (priceEl && v.price != null && this._variants(card).length > 1) {
        var money = this._money(v.price);
        if (v.compare_at > v.price) {
          priceEl.innerHTML = '<span class="cu-card__price-sale">' + money + '</span> <s class="cu-card__price-was">' + this._money(v.compare_at) + '</s>';
        } else {
          priceEl.textContent = money;
        }
      }
    }

    _money(cents) {
      var fmt = this.cfg.moneyFormat || '${{amount}}';
      var dec = (this.dataset.currency === 'KWD' || this.dataset.currency === 'BHD' || this.dataset.currency === 'OMR') ? 3 : 2;
      var value = (cents / Math.pow(10, dec)).toFixed(dec);
      var grouped = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return fmt
        .replace(/\{\{\s*amount(_with_comma_separator)?\s*\}\}/g, grouped)
        .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, grouped.split('.')[0]);
    }

    /* ── add to cart ─────────────────────────────────────────────────── */
    _add(card, btn) {
      var self = this;
      if (btn.classList.contains('is-loading')) return;
      var variant = this._selectedVariant(card);
      if (!variant) return;
      if (!variant.available) { this._flash(btn, 'error', this._t('sold_out')); return; }

      var qtyInput = card.querySelector('[data-cu-qty]');
      var qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;

      btn.classList.add('is-loading');
      btn.classList.remove('is-success', 'is-error');
      btn.setAttribute('aria-busy', 'true');
      this._say(this._t('adding'));

      var sections = this._drawerSections();
      var body = {
        items: [{ id: variant.id, quantity: qty }],
        sections: sections.ids.join(','),
        sections_url: window.location.pathname
      };

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(body)
      })
        .then(function (r) {
          return r.json().then(function (data) {
            if (!r.ok) throw new Error(data.description || self._t('cart_error'));
            return data;
          });
        })
        .then(function (data) {
          btn.classList.remove('is-loading');
          btn.classList.add('is-success');
          self._say(self._t('added'));
          var label = btn.querySelector('[data-cu-add-label]');
          var prevText = label ? label.textContent : '';
          if (label) label.textContent = self._t('added');
          self._refreshDrawer(sections, data && data.sections);
          self._announceCartUpdate();
          setTimeout(function () {
            btn.classList.remove('is-success');
            btn.removeAttribute('aria-busy');
            if (label) label.textContent = prevText || self._t('add_to_cart');
          }, 1600);
          if (self.cfg.redirectToCart) window.location.href = '/cart';
        })
        .catch(function (err) {
          btn.classList.remove('is-loading');
          btn.removeAttribute('aria-busy');
          self._flash(btn, 'error', (err && err.message) || self._t('cart_error'));
        });
    }

    _flash(btn, state, msg) {
      btn.classList.add('is-' + state);
      this._say(msg);
      var label = btn.querySelector('[data-cu-add-label]');
      var prev = label ? label.textContent : '';
      if (label) label.textContent = msg;
      setTimeout(function () {
        btn.classList.remove('is-' + state);
        if (label) label.textContent = prev || msg;
      }, 2200);
    }

    /* ── drawer refresh (Section Rendering + event fallbacks) ─────────── */
    _drawerSections() {
      var ids = [];
      var map = {};
      SECTION_SELECTORS.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (el) {
          var host = el.closest('.shopify-section') || (el.id && el.id.indexOf('shopify-section-') === 0 ? el : null);
          if (!host || !host.id) return;
          var id = host.id.replace('shopify-section-', '');
          if (ids.indexOf(id) === -1) { ids.push(id); map[id] = host; }
        });
      });
      return { ids: ids, map: map };
    }

    _refreshDrawer(sections, rendered) {
      if (!rendered) return;
      Object.keys(rendered).forEach(function (id) {
        var host = sections.map[id];
        if (!host || !rendered[id]) return;
        var doc = new DOMParser().parseFromString(rendered[id], 'text/html');
        var fresh = doc.querySelector('#shopify-section-' + id) || doc.body.firstElementChild;
        if (fresh) host.innerHTML = fresh.innerHTML;
      });
    }

    // Debounced broadcast so themes that own the drawer can re-render too.
    _announceCartUpdate() {
      var self = this;
      clearTimeout(this._debTimer);
      this._debTimer = setTimeout(function () {
        fetch('/cart.js', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
          .then(function (r) { return r.json(); })
          .then(function (cart) {
            ['cart:refresh', 'cart:updated', 'cart:build'].forEach(function (name) {
              document.dispatchEvent(new CustomEvent(name, { detail: { cart: cart, source: 'cart-upsell' } }));
            });
            if (window.Shopify && typeof window.Shopify.onCartUpdate === 'function') {
              try { window.Shopify.onCartUpdate(cart); } catch (e) { /* noop */ }
            }
          })
          .catch(function () { /* events are best-effort */ });
      }, this.cfg.debounce || 350);
    }

    /* ── placement inside the drawer ─────────────────────────────────── */
    _reanchor() {
      var pos = this.cfg.position;
      if (!pos || this.dataset.anchored) return;
      var checkout = document.querySelector('[name="checkout"], #CartDrawer-Checkout, .cart__checkout-button, .drawer__checkout');
      var items = document.querySelector('cart-items, #CartDrawer-CartItems, #main-cart-items, .cart-items, .drawer__cart-items');
      var target = null, where = 'after';
      if (pos === 'above_checkout' && checkout) { target = checkout; where = 'before'; }
      else if (pos === 'below_checkout' && checkout) { target = checkout; where = 'after'; }
      else if (pos === 'above_items' && items) { target = items; where = 'before'; }
      else if (pos === 'below_items' && items) { target = items; where = 'after'; }
      if (!target || target.contains(this)) return;
      this.dataset.anchored = '1';
      if (where === 'before') target.parentNode.insertBefore(this, target);
      else target.parentNode.insertBefore(this, target.nextSibling);
    }
  }

  customElements.define('cart-upsell', CartUpsell);
})();
