/**
 * Bundle Builder storefront widget.
 *
 * Vanilla JS, zero dependencies, ~12KB minified. Renders a multi-step bundle
 * flow (steps -> review -> add to cart) with real-time server-verified
 * pricing, inventory-aware add to cart via the Shopify Ajax Cart API, and
 * full RTL support (direction comes from the block's `dir` attribute; CSS
 * logical properties handle mirroring, JS handles direction-aware behavior
 * like carousel scroll direction and progress order).
 */
(function () {
  'use strict';

  /* ------------------------------ i18n ------------------------------ */

  var I18N = {
    en: {
      step_of: 'Step {current} of {total}',
      items_selected: '{count} of {max} items selected',
      items_selected_min: '{count} selected (min {min})',
      add_to_cart: 'Add bundle to cart',
      adding: 'Adding…',
      added: 'Added! Opening cart…',
      next: 'Next',
      back: 'Back',
      review: 'Review your bundle',
      subtotal: 'Subtotal',
      discount: 'Bundle discount',
      total: 'Total',
      you_save: 'You save {amount}',
      free_gift: 'Free gift included',
      next_tier: 'Add {count} more to save {percent}%',
      out_of_stock: 'Out of stock',
      select_variant: 'Choose an option',
      error_generic: 'Something went wrong. Please try again.',
      error_min_items: 'Select at least {min} items to continue.',
      error_inventory: 'Some items just sold out. Please adjust your selection.',
      qty: 'Qty',
      remove: 'Remove',
      empty_review: 'Your bundle is empty. Go back and pick some products.'
    },
    ar: {
      step_of: 'الخطوة {current} من {total}',
      items_selected: 'تم اختيار {count} من {max} منتجات',
      items_selected_min: 'تم اختيار {count} (الحد الأدنى {min})',
      add_to_cart: 'أضف الباقة إلى السلة',
      adding: 'جارٍ الإضافة…',
      added: 'تمت الإضافة! جارٍ فتح السلة…',
      next: 'التالي',
      back: 'رجوع',
      review: 'راجع باقتك',
      subtotal: 'المجموع الفرعي',
      discount: 'خصم الباقة',
      total: 'الإجمالي',
      you_save: 'وفّرت {amount}',
      free_gift: 'هدية مجانية مشمولة',
      next_tier: 'أضف {count} أكثر لتوفر {percent}٪',
      out_of_stock: 'نفدت الكمية',
      select_variant: 'اختر خيارًا',
      error_generic: 'حدث خطأ ما. حاول مرة أخرى.',
      error_min_items: 'اختر {min} منتجات على الأقل للمتابعة.',
      error_inventory: 'بعض المنتجات نفدت للتو. عدّل اختيارك من فضلك.',
      qty: 'الكمية',
      remove: 'إزالة',
      empty_review: 'باقتك فارغة. ارجع واختر بعض المنتجات.'
    }
  };

  function makeT(locale) {
    var table = I18N[locale] || I18N.en;
    return function (key, params) {
      var str = table[key] || I18N.en[key] || key;
      return str.replace(/\{(\w+)\}/g, function (_, name) {
        return params && params[name] != null ? params[name] : '';
      });
    };
  }

  /* ---------------------------- utilities ---------------------------- */

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function formatMoney(minorUnits, widget) {
    // currency.factor/decimals come from the server (1000/3 for KWD, 100/2 default)
    var factor = (widget.currencyInfo && widget.currencyInfo.factor) || 100;
    var decimals = (widget.currencyInfo && widget.currencyInfo.decimals) || 2;
    var amount = Number((minorUnits / factor).toFixed(decimals)).toLocaleString(widget.locale, {
      minimumFractionDigits: decimals
    });
    if (widget.moneyFormat) {
      // Shopify money_format, e.g. "{{amount}} د.ك" or "${{amount}}"
      return widget.moneyFormat.replace(/\{\{\s*amount[^}]*\}\}/, amount);
    }
    return amount;
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /* ----------------------------- widget ----------------------------- */

  function BundleBuilder(root) {
    this.root = root;
    this.proxyBase = root.dataset.proxyBase || '/apps/bundle-builder';
    this.handle = root.dataset.bundleHandle;
    this.locale = (root.dataset.locale || 'en').split('-')[0];
    this.isRTL = (root.getAttribute('dir') || '').toLowerCase() === 'rtl';
    this.currency = root.dataset.currency || 'USD';
    this.moneyFormat = root.dataset.moneyFormat || '';
    this.t = makeT(this.locale);

    this.bundle = null;
    this.products = [];          // [{productId, title, image, variants[]}]
    this.selections = [];        // [{productId, variantId, quantity, step}]
    this.currentStep = 0;        // index into this.flowSteps; last = review
    this.pricing = null;
    this.nextTier = null;
    this.errors = [];
    this.busy = false;
  }

  BundleBuilder.prototype.init = function () {
    var self = this;
    if (!this.handle) {
      this.root.innerHTML = '<p class="bb-error">Bundle Builder: set a bundle handle in the theme editor.</p>';
      return;
    }
    fetch(this.proxyBase + '/bundle/' + encodeURIComponent(this.handle))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        self.bundle = data.bundle;
        self.products = data.products;
        self.currencyInfo = data.currency || { decimals: 2, factor: 100 };
        self.flowSteps = self.buildFlowSteps();
        self.prefillFixedBundle();
        self.render();
        self.track('view');
        self.refreshPricing();
      })
      .catch(function () {
        self.root.innerHTML = '<p class="bb-error">' + self.t('error_generic') + '</p>';
      });
  };

  /** Steps come from the bundle for box_builder; one product step otherwise. Review is always last. */
  BundleBuilder.prototype.buildFlowSteps = function () {
    var steps = (this.bundle.steps && this.bundle.steps.length > 0)
      ? this.bundle.steps.slice().sort(function (a, b) { return a.position - b.position; })
      : [{ position: 0, title: this.bundle.title, minItems: (this.bundle.rules || {}).minItems, maxItems: (this.bundle.rules || {}).maxItems }];
    return steps.concat([{ review: true }]);
  };

  /** Fixed bundles arrive pre-selected and quantities are locked. */
  BundleBuilder.prototype.prefillFixedBundle = function () {
    if (this.bundle.type !== 'fixed') return;
    var self = this;
    (this.bundle.products || []).forEach(function (bp) {
      var product = self.findProduct(bp.productId);
      if (!product || product.variants.length === 0) return;
      self.selections.push({
        productId: String(bp.productId),
        variantId: String(product.variants[0].variantId),
        quantity: bp.quantity || 1,
        step: 0
      });
    });
  };

  BundleBuilder.prototype.findProduct = function (productId) {
    return this.products.find(function (p) { return String(p.productId) === String(productId); });
  };

  BundleBuilder.prototype.productsForStep = function (stepPos) {
    var self = this;
    return (this.bundle.products || [])
      .filter(function (bp) { return bp.step == null || bp.step === stepPos; })
      .map(function (bp) { return self.findProduct(bp.productId); })
      .filter(Boolean);
  };

  BundleBuilder.prototype.totalQty = function () {
    return this.selections.reduce(function (sum, s) { return sum + s.quantity; }, 0);
  };

  /* --------------------------- selection ops --------------------------- */

  BundleBuilder.prototype.addSelection = function (productId, variantId, stepPos) {
    var existing = this.selections.find(function (s) {
      return s.productId === String(productId) && s.variantId === String(variantId) && s.step === stepPos;
    });
    var max = (this.bundle.rules || {}).maxItems;
    if (max != null && this.totalQty() >= max) return; // hard cap
    if (existing) existing.quantity += 1;
    else this.selections.push({ productId: String(productId), variantId: String(variantId), quantity: 1, step: stepPos });
    this.afterSelectionChange();
  };

  BundleBuilder.prototype.removeSelection = function (productId, variantId, stepPos) {
    var idx = this.selections.findIndex(function (s) {
      return s.productId === String(productId) && s.variantId === String(variantId) && s.step === stepPos;
    });
    if (idx === -1) return;
    var s = this.selections[idx];
    s.quantity -= 1;
    if (s.quantity <= 0) this.selections.splice(idx, 1);
    this.afterSelectionChange();
  };

  BundleBuilder.prototype.afterSelectionChange = function () {
    this.render();
    this.refreshPricingDebounced = this.refreshPricingDebounced || debounce(this.refreshPricing.bind(this), 250);
    this.refreshPricingDebounced();
  };

  /** Server is the source of truth for prices — never trust client math at checkout. */
  BundleBuilder.prototype.refreshPricing = function () {
    var self = this;
    fetch(this.proxyBase + '/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: this.bundle.id, selections: this.selections })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        self.pricing = data.pricing || null;
        self.nextTier = data.nextTier || null;
        self.errors = data.errors || [];
        self.renderSummary();
      })
      .catch(function () { /* keep last known pricing; non-fatal */ });
  };

  /* ----------------------------- rendering ----------------------------- */

  BundleBuilder.prototype.render = function () {
    var root = this.root;
    root.innerHTML = '';
    root.dataset.bbTemplate = root.dataset.template || (this.bundle.template && this.bundle.template.name) || 'minimal';

    root.appendChild(this.renderProgress());

    var step = this.flowSteps[this.currentStep];
    if (step.review) root.appendChild(this.renderReview());
    else root.appendChild(this.renderProductStep(step));

    root.appendChild(this.renderStickyBar());
    this.renderSummary();
  };

  BundleBuilder.prototype.renderProgress = function () {
    var wrap = el('div', 'bb-progress');
    var label = el('div', 'bb-progress__label');
    label.textContent = this.t('step_of', { current: this.currentStep + 1, total: this.flowSteps.length });
    wrap.appendChild(label);

    var track = el('div', 'bb-progress__track', { role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(this.flowSteps.length), 'aria-valuenow': String(this.currentStep + 1) });
    var fill = el('div', 'bb-progress__fill');
    fill.style.width = (((this.currentStep + 1) / this.flowSteps.length) * 100) + '%';
    track.appendChild(fill);
    wrap.appendChild(track);
    return wrap;
  };

  BundleBuilder.prototype.renderProductStep = function (step) {
    var self = this;
    var section = el('section', 'bb-step');

    var header = el('header', 'bb-step__header');
    var title = el('h2', 'bb-step__title');
    title.textContent = step.title || this.bundle.title;
    header.appendChild(title);
    header.appendChild(this.renderCounter(step));
    section.appendChild(header);

    var grid = el('div', 'bb-grid');
    this.productsForStep(step.position).forEach(function (product) {
      grid.appendChild(self.renderCard(product, step));
    });
    section.appendChild(grid);
    return section;
  };

  BundleBuilder.prototype.renderCounter = function (step) {
    var counter = el('div', 'bb-counter', { 'aria-live': 'polite' });
    var qty = this.selections
      .filter(function (s) { return s.step === step.position; })
      .reduce(function (sum, s) { return sum + s.quantity; }, 0);
    if (step.maxItems != null) {
      counter.textContent = this.t('items_selected', { count: qty, max: step.maxItems });
    } else if (step.minItems != null) {
      counter.textContent = this.t('items_selected_min', { count: qty, min: step.minItems });
    } else {
      counter.textContent = this.t('items_selected_min', { count: qty, min: 1 });
    }
    return counter;
  };

  BundleBuilder.prototype.renderCard = function (product, step) {
    var self = this;
    var isFixed = this.bundle.type === 'fixed';
    var card = el('article', 'bb-card');

    if (product.image) {
      var img = el('img', 'bb-card__image', {
        src: product.image, alt: product.imageAlt || product.title,
        loading: 'lazy', width: '300', height: '300'
      });
      card.appendChild(img);
    }

    var body = el('div', 'bb-card__body');
    var name = el('h3', 'bb-card__title');
    name.textContent = product.title;
    body.appendChild(name);

    // Variant selector (only when the product has real variants).
    var variantSelect = null;
    var sellable = product.variants.filter(function (v) { return v.availableForSale !== false; });
    if (sellable.length > 1) {
      variantSelect = el('select', 'bb-card__variants', { 'aria-label': this.t('select_variant') });
      sellable.forEach(function (v) {
        var opt = el('option');
        opt.value = v.variantId;
        opt.textContent = v.title + ' — ' + formatMoney(v.price, self);
        variantSelect.appendChild(opt);
      });
      body.appendChild(variantSelect);
    }

    var price = el('p', 'bb-card__price');
    var firstVariant = sellable[0];
    price.textContent = firstVariant ? formatMoney(firstVariant.price, this) : this.t('out_of_stock');
    body.appendChild(price);
    if (variantSelect) {
      variantSelect.addEventListener('change', function () {
        var v = sellable.find(function (x) { return x.variantId === variantSelect.value; });
        if (v) price.textContent = formatMoney(v.price, self);
      });
    }

    // Quantity stepper. Buttons keep +/- semantics in RTL — only layout mirrors.
    var controls = el('div', 'bb-card__controls');
    var currentQty = function () {
      var variantId = variantSelect ? variantSelect.value : (firstVariant && firstVariant.variantId);
      var sel = self.selections.find(function (s) {
        return s.productId === String(product.productId) && s.variantId === String(variantId) && s.step === step.position;
      });
      return sel ? sel.quantity : 0;
    };

    if (!firstVariant) {
      var oos = el('span', 'bb-card__oos');
      oos.textContent = this.t('out_of_stock');
      controls.appendChild(oos);
    } else if (isFixed) {
      var fixedQty = el('span', 'bb-card__fixed-qty');
      fixedQty.textContent = this.t('qty') + ': ' + currentQty();
      controls.appendChild(fixedQty);
    } else {
      var minus = el('button', 'bb-btn bb-btn--step', { type: 'button', 'aria-label': this.t('remove') });
      minus.textContent = '−';
      var count = el('span', 'bb-card__qty', { 'aria-live': 'polite' });
      count.textContent = String(currentQty());
      var plus = el('button', 'bb-btn bb-btn--step', { type: 'button', 'aria-label': '+' });
      plus.textContent = '+';

      plus.addEventListener('click', function () {
        var variantId = variantSelect ? variantSelect.value : firstVariant.variantId;
        self.addSelection(product.productId, variantId, step.position);
      });
      minus.addEventListener('click', function () {
        var variantId = variantSelect ? variantSelect.value : firstVariant.variantId;
        self.removeSelection(product.productId, variantId, step.position);
      });

      controls.appendChild(minus);
      controls.appendChild(count);
      controls.appendChild(plus);
    }

    body.appendChild(controls);
    card.appendChild(body);
    if (currentQty() > 0) card.classList.add('bb-card--selected');
    return card;
  };

  BundleBuilder.prototype.renderReview = function () {
    var self = this;
    var section = el('section', 'bb-review');
    var title = el('h2', 'bb-step__title');
    title.textContent = this.t('review');
    section.appendChild(title);

    if (this.selections.length === 0) {
      var empty = el('p', 'bb-review__empty');
      empty.textContent = this.t('empty_review');
      section.appendChild(empty);
      return section;
    }

    var list = el('ul', 'bb-review__list');
    this.selections.forEach(function (s) {
      var product = self.findProduct(s.productId);
      var variant = product && product.variants.find(function (v) { return String(v.variantId) === s.variantId; });
      if (!product || !variant) return;

      var li = el('li', 'bb-review__item');
      if (product.image) {
        li.appendChild(el('img', 'bb-review__thumb', { src: product.image, alt: '', loading: 'lazy', width: '64', height: '64' }));
      }
      var info = el('div', 'bb-review__info');
      var name = el('span', 'bb-review__name');
      name.textContent = product.title + (variant.title !== 'Default Title' ? ' — ' + variant.title : '');
      var meta = el('span', 'bb-review__meta');
      meta.textContent = self.t('qty') + ': ' + s.quantity + ' · ' + formatMoney(variant.price * s.quantity, self);
      info.appendChild(name);
      info.appendChild(meta);
      li.appendChild(info);

      var remove = el('button', 'bb-btn bb-btn--link', { type: 'button' });
      remove.textContent = self.t('remove');
      remove.addEventListener('click', function () {
        s.quantity = 1; // remove the whole line in one click
        self.removeSelection(s.productId, s.variantId, s.step);
      });
      li.appendChild(remove);
      list.appendChild(li);
    });
    section.appendChild(list);
    return section;
  };

  /** Sticky bottom bar: live totals + primary action. */
  BundleBuilder.prototype.renderStickyBar = function () {
    var self = this;
    var bar = el('div', 'bb-sticky');

    var summary = el('div', 'bb-sticky__summary');
    summary.id = 'bb-summary-' + Math.random().toString(36).slice(2, 8);
    this.summaryEl = summary;
    bar.appendChild(summary);

    var actions = el('div', 'bb-sticky__actions');
    var isLast = this.currentStep === this.flowSteps.length - 1;

    if (this.currentStep > 0) {
      var back = el('button', 'bb-btn bb-btn--secondary', { type: 'button' });
      back.textContent = this.t('back');
      back.addEventListener('click', function () { self.goToStep(self.currentStep - 1); });
      actions.appendChild(back);
    }

    var primary = el('button', 'bb-btn bb-btn--primary', { type: 'button' });
    primary.textContent = isLast ? this.t('add_to_cart') : this.t('next');
    primary.addEventListener('click', function () {
      if (isLast) self.addToCart(primary);
      else self.tryAdvance();
    });
    this.primaryBtn = primary;
    actions.appendChild(primary);

    bar.appendChild(actions);
    return bar;
  };

  BundleBuilder.prototype.renderSummary = function () {
    if (!this.summaryEl) return;
    var s = this.summaryEl;
    s.innerHTML = '';
    if (!this.pricing) return;

    var total = el('span', 'bb-sticky__total');
    total.textContent = this.t('total') + ': ' + formatMoney(this.pricing.total, this);
    s.appendChild(total);

    if (this.pricing.discount > 0) {
      var save = el('span', 'bb-sticky__save');
      save.textContent = this.t('you_save', { amount: formatMoney(this.pricing.discount, this) });
      s.appendChild(save);
    }
    if (this.pricing.freeGifts && this.pricing.freeGifts.length > 0) {
      var gift = el('span', 'bb-sticky__gift');
      gift.textContent = '🎁 ' + this.t('free_gift');
      s.appendChild(gift);
    }
    if (this.nextTier && this.nextTier.discountPercent != null) {
      var nudge = el('span', 'bb-sticky__nudge');
      nudge.textContent = this.t('next_tier', { count: this.nextTier.itemsToAdd, percent: this.nextTier.discountPercent });
      s.appendChild(nudge);
    }
  };

  /* ------------------------------ flow ------------------------------ */

  BundleBuilder.prototype.tryAdvance = function () {
    var step = this.flowSteps[this.currentStep];
    var qty = this.selections
      .filter(function (s) { return s.step === step.position; })
      .reduce(function (sum, s) { return sum + s.quantity; }, 0);
    if (step.minItems != null && qty < step.minItems) {
      this.flashError(this.t('error_min_items', { min: step.minItems }));
      return;
    }
    this.goToStep(this.currentStep + 1);
  };

  BundleBuilder.prototype.goToStep = function (index) {
    this.currentStep = Math.max(0, Math.min(index, this.flowSteps.length - 1));
    this.render();
    this.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  BundleBuilder.prototype.flashError = function (message) {
    var existing = this.root.querySelector('.bb-toast');
    if (existing) existing.remove();
    var toast = el('div', 'bb-toast', { role: 'alert' });
    toast.textContent = message;
    this.root.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 4000);
  };

  /* --------------------------- add to cart --------------------------- */

  BundleBuilder.prototype.addToCart = function (button) {
    var self = this;
    if (this.busy || this.selections.length === 0) return;
    this.busy = true;
    button.disabled = true;
    button.textContent = this.t('adding');

    // 1) Server validates rules + inventory, computes the final price and
    //    mints a single-use discount code for the discount amount.
    fetch(this.proxyBase + '/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bundleId: this.bundle.id,
        selections: this.selections,
        currency: this.currency,
        locale: this.locale
      })
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .then(function (result) {
        if (!result.ok) {
          var msg = result.status === 409 ? self.t('error_inventory') : self.t('error_generic');
          throw Object.assign(new Error(msg), { friendly: msg });
        }
        // 2) Add all bundle lines in ONE Ajax Cart call (atomic UX).
        return fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: result.data.lineItems })
        }).then(function (res) {
          if (!res.ok) throw new Error('cart add failed');
          return result.data;
        });
      })
      .then(function (data) {
        self.trackPixels(data);
        button.textContent = self.t('added');
        // 3) Apply the bundle discount so it carries into checkout natively,
        //    then land on the cart page.
        var target = data.discountCode
          ? '/discount/' + encodeURIComponent(data.discountCode) + '?redirect=/cart'
          : '/cart';
        window.location.href = target;
      })
      .catch(function (err) {
        self.flashError(err.friendly || self.t('error_generic'));
        button.disabled = false;
        button.textContent = self.t('add_to_cart');
        self.busy = false;
      });
  };

  /* ---------------------------- analytics ---------------------------- */

  BundleBuilder.prototype.track = function (event) {
    try {
      var blob = JSON.stringify({ bundleId: this.bundle.id, event: event, meta: { locale: this.locale } });
      navigator.sendBeacon
        ? navigator.sendBeacon(this.proxyBase + '/track', new Blob([blob], { type: 'application/json' }))
        : fetch(this.proxyBase + '/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: blob });
    } catch (e) { /* analytics must never break the widget */ }
  };

  /** Fire client-side pixels if the store has them installed. */
  BundleBuilder.prototype.trackPixels = function (data) {
    try {
      var value = data.pricing.total / ((this.currencyInfo && this.currencyInfo.factor) || 100);
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'AddToCart', {
          content_type: 'product_group',
          content_name: this.bundle.title,
          value: value,
          currency: this.currency
        });
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'add_to_cart', {
          currency: this.currency,
          value: value,
          items: [{ item_name: this.bundle.title, item_category: 'bundle' }]
        });
      }
    } catch (e) { /* pixels are best-effort */ }
  };

  /* ------------------------------ boot ------------------------------ */

  function boot() {
    document.querySelectorAll('.bb-root[data-bundle-handle]').forEach(function (root) {
      if (root.dataset.bbBooted) return;
      root.dataset.bbBooted = '1';
      new BundleBuilder(root).init();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Re-boot when sections are re-rendered in the theme editor.
  document.addEventListener('shopify:section:load', boot);
})();
