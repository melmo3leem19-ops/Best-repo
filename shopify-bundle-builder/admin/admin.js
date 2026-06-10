/**
 * Bundle Builder — embedded admin panel.
 *
 * A dependency-free SPA served at /admin. Talks to /api/* (verifyAdmin).
 * The `shop` query param is forwarded on every request via the X-Shop
 * header. Supports an Arabic/English toggle that also flips the document
 * direction, mirroring the merchant-facing UI exactly like the storefront.
 */
(function () {
  'use strict';

  /* ------------------------------ i18n ------------------------------ */

  var I18N = {
    en: {
      loading: 'Loading…', new_bundle: 'New bundle', bundles: 'Bundles', title: 'Title',
      type: 'Type', status: 'Status', views: 'Views', conversion: 'Conversion', revenue: 'Revenue',
      edit: 'Edit', delete: 'Delete', activate: 'Activate', deactivate: 'Deactivate',
      save: 'Save bundle', cancel: 'Cancel', description: 'Description',
      min_items: 'Min items', max_items: 'Max items', products: 'Products',
      search_products: 'Search products…', add: 'Add', remove: 'Remove',
      steps: 'Steps (box builder)', add_step: 'Add step', step_title: 'Step title',
      discounts: 'Discount rules', add_rule: 'Add rule', rule_type: 'Rule type',
      stacking: 'When multiple rules match', best: 'Apply best discount', stack: 'Stack discounts',
      template: 'Template', minimal: 'Minimal', premium: 'Premium', box: 'Box Builder',
      handle_hint: 'Storefront handle (used in the theme block):', no_bundles: 'No bundles yet. Create your first one!',
      confirm_delete: 'Delete this bundle? This cannot be undone.',
      saved: 'Saved ✓', error: 'Error: ', qty: 'Qty', max_qty: 'Max qty', step: 'Step',
      add_to_cart: 'Adds to cart', empty: '—'
    },
    ar: {
      loading: 'جارٍ التحميل…', new_bundle: 'باقة جديدة', bundles: 'الباقات', title: 'العنوان',
      type: 'النوع', status: 'الحالة', views: 'المشاهدات', conversion: 'التحويل', revenue: 'الإيراد',
      edit: 'تعديل', delete: 'حذف', activate: 'تفعيل', deactivate: 'إيقاف',
      save: 'حفظ الباقة', cancel: 'إلغاء', description: 'الوصف',
      min_items: 'الحد الأدنى', max_items: 'الحد الأقصى', products: 'المنتجات',
      search_products: 'ابحث عن المنتجات…', add: 'إضافة', remove: 'إزالة',
      steps: 'الخطوات (بناء الصندوق)', add_step: 'إضافة خطوة', step_title: 'عنوان الخطوة',
      discounts: 'قواعد الخصم', add_rule: 'إضافة قاعدة', rule_type: 'نوع القاعدة',
      stacking: 'عند تطابق عدة قواعد', best: 'تطبيق أفضل خصم', stack: 'جمع الخصومات',
      template: 'القالب', minimal: 'بسيط', premium: 'فاخر', box: 'بناء الصندوق',
      handle_hint: 'معرّف الواجهة (يُستخدم في بلوك الثيم):', no_bundles: 'لا توجد باقات بعد. أنشئ أول باقة!',
      confirm_delete: 'حذف هذه الباقة؟ لا يمكن التراجع.',
      saved: 'تم الحفظ ✓', error: 'خطأ: ', qty: 'الكمية', max_qty: 'الحد الأقصى', step: 'الخطوة',
      add_to_cart: 'إضافات للسلة', empty: '—'
    }
  };

  var BUNDLE_TYPES = ['mix_match', 'byob', 'box_builder', 'fixed', 'infinite_options', 'combo'];
  var RULE_TYPES = ['tiered', 'volume', 'bogo', 'buy_x_get_y', 'fixed_price', 'progressive', 'free_gift'];

  var state = {
    shop: new URLSearchParams(location.search).get('shop') || '',
    lang: localStorage.getItem('bb-admin-lang') || 'en',
    bundles: [],
    editing: null // bundle being edited, or null for the list view
  };

  function t(key) {
    return (I18N[state.lang] || I18N.en)[key] || key;
  }

  function api(path, options) {
    options = options || {};
    options.headers = Object.assign(
      { 'Content-Type': 'application/json', 'X-Shop': state.shop },
      options.headers || {}
    );
    return fetch('/api' + path, options).then(function (res) {
      if (res.status === 204) return null;
      return res.json().then(function (data) {
        if (!res.ok) throw new Error((data.errors || [data.error]).join(', '));
        return data;
      });
    });
  }

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'onclick' || k === 'oninput' || k === 'onchange') node[k] = attrs[k];
      else if (k === 'value') node.value = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (child) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function money(minorUnits) {
    // currency comes from the API (1000/3 for KWD, 100/2 default)
    var factor = (state.currency && state.currency.factor) || 100;
    var decimals = (state.currency && state.currency.decimals) || 2;
    return (minorUnits / factor).toLocaleString(state.lang === 'ar' ? 'ar' : 'en', { minimumFractionDigits: decimals });
  }

  /* ----------------------------- list view ----------------------------- */

  function renderList() {
    var app = document.getElementById('app');
    app.innerHTML = '';

    if (state.bundles.length === 0) {
      app.appendChild(h('p', { class: 'empty-state' }, [t('no_bundles')]));
      return;
    }

    var table = h('table', { class: 'bundle-table' }, [
      h('thead', {}, [h('tr', {}, [
        h('th', {}, [t('title')]), h('th', {}, [t('type')]), h('th', {}, [t('status')]),
        h('th', {}, [t('views')]), h('th', {}, [t('add_to_cart')]), h('th', {}, [t('conversion')]),
        h('th', {}, [t('revenue')]), h('th', {}, [''])
      ])])
    ]);

    var tbody = h('tbody');
    state.bundles.forEach(function (bundle) {
      var a = bundle.analytics || {};
      tbody.appendChild(h('tr', {}, [
        h('td', {}, [
          h('strong', {}, [bundle.title]),
          h('div', { class: 'muted small' }, [bundle.handle])
        ]),
        h('td', {}, [bundle.type]),
        h('td', {}, [h('span', { class: 'badge badge--' + bundle.status }, [bundle.status])]),
        h('td', {}, [String(a.views || 0)]),
        h('td', {}, [String(a.addToCarts || 0)]),
        h('td', {}, [(a.conversionRate || 0) + '%']),
        h('td', {}, [money(a.revenue || 0)]),
        h('td', { class: 'row-actions' }, [
          h('button', { class: 'btn btn--small', onclick: function () { openEditor(bundle); } }, [t('edit')]),
          h('button', {
            class: 'btn btn--small',
            onclick: function () { toggleStatus(bundle); }
          }, [bundle.status === 'active' ? t('deactivate') : t('activate')]),
          h('button', {
            class: 'btn btn--small btn--danger',
            onclick: function () { removeBundle(bundle); }
          }, [t('delete')])
        ])
      ]));
    });
    table.appendChild(tbody);
    app.appendChild(table);
  }

  function toggleStatus(bundle) {
    var next = bundle.status === 'active' ? 'draft' : 'active';
    api('/bundles/' + bundle.id + '/status', { method: 'POST', body: JSON.stringify({ status: next }) })
      .then(loadBundles)
      .catch(function (err) { alert(t('error') + err.message); });
  }

  function removeBundle(bundle) {
    if (!confirm(t('confirm_delete'))) return;
    api('/bundles/' + bundle.id, { method: 'DELETE' })
      .then(loadBundles)
      .catch(function (err) { alert(t('error') + err.message); });
  }

  /* ---------------------------- editor view ---------------------------- */

  function blankBundle() {
    return {
      title: '', description: '', type: 'mix_match', status: 'draft',
      rules: { minItems: 2, maxItems: null },
      products: [], steps: [], discountRules: [],
      discountStacking: 'best', template: { name: 'minimal' }
    };
  }

  function openEditor(bundle) {
    state.editing = JSON.parse(JSON.stringify(bundle || blankBundle()));
    renderEditor();
  }

  function renderEditor() {
    var b = state.editing;
    var app = document.getElementById('app');
    app.innerHTML = '';

    var form = h('div', { class: 'editor' });

    /* basics */
    form.appendChild(field(t('title'), h('input', {
      type: 'text', value: b.title,
      oninput: function (e) { b.title = e.target.value; }
    })));
    form.appendChild(field(t('description'), h('textarea', {
      oninput: function (e) { b.description = e.target.value; }
    }, [b.description || ''])));
    form.appendChild(field(t('type'), select(BUNDLE_TYPES, b.type, function (v) { b.type = v; renderEditor(); })));
    if (b.handle) form.appendChild(h('p', { class: 'muted small' }, [t('handle_hint') + ' ' + b.handle]));

    /* selection rules */
    form.appendChild(h('div', { class: 'field-row' }, [
      field(t('min_items'), numberInput(b.rules.minItems, function (v) { b.rules.minItems = v; })),
      field(t('max_items'), numberInput(b.rules.maxItems, function (v) { b.rules.maxItems = v; }))
    ]));

    /* products */
    form.appendChild(renderProductPicker(b));

    /* steps for box builder */
    if (b.type === 'box_builder') form.appendChild(renderSteps(b));

    /* discounts */
    form.appendChild(renderDiscountRules(b));
    form.appendChild(field(t('stacking'), select(
      ['best', 'stack'], b.discountStacking,
      function (v) { b.discountStacking = v; },
      { best: t('best'), stack: t('stack') }
    )));

    /* template */
    form.appendChild(field(t('template'), select(
      ['minimal', 'premium', 'box'], (b.template || {}).name || 'minimal',
      function (v) { b.template = { name: v }; },
      { minimal: t('minimal'), premium: t('premium'), box: t('box') }
    )));

    /* actions */
    form.appendChild(h('div', { class: 'editor__actions' }, [
      h('button', { class: 'btn btn--primary', onclick: saveBundle }, [t('save')]),
      h('button', { class: 'btn btn--ghost', onclick: function () { state.editing = null; renderList(); } }, [t('cancel')])
    ]));

    app.appendChild(form);
  }

  function field(label, control) {
    return h('label', { class: 'field' }, [h('span', { class: 'field__label' }, [label]), control]);
  }

  function select(values, current, onChange, labels) {
    var node = h('select', { onchange: function (e) { onChange(e.target.value); } });
    values.forEach(function (v) {
      var opt = h('option', { value: v }, [(labels && labels[v]) || v]);
      if (v === current) opt.selected = true;
      node.appendChild(opt);
    });
    return node;
  }

  function numberInput(value, onChange) {
    return h('input', {
      type: 'number', min: '0', value: value == null ? '' : value,
      oninput: function (e) { onChange(e.target.value === '' ? null : Number(e.target.value)); }
    });
  }

  /* product picker with live Shopify search */

  function renderProductPicker(b) {
    var wrap = h('section', { class: 'panel' }, [h('h2', {}, [t('products')])]);

    var results = h('div', { class: 'search-results' });
    var search = h('input', {
      type: 'search', placeholder: t('search_products'),
      oninput: debounce(function (e) {
        var q = e.target.value.trim();
        if (!q) { results.innerHTML = ''; return; }
        api('/products/search?q=' + encodeURIComponent(q)).then(function (data) {
          results.innerHTML = '';
          data.products.forEach(function (p) {
            var id = p.id.split('/').pop();
            results.appendChild(h('div', { class: 'search-result' }, [
              h('span', {}, [p.title]),
              h('button', {
                class: 'btn btn--small',
                onclick: function () {
                  if (!b.products.some(function (x) { return String(x.productId) === id; })) {
                    b.products.push({ productId: id, title: p.title, quantity: 1, maxQuantity: null, step: null });
                    renderEditor();
                  }
                }
              }, [t('add')])
            ]));
          });
        }).catch(function () { /* search errors are non-fatal */ });
      }, 300)
    });
    wrap.appendChild(search);
    wrap.appendChild(results);

    var list = h('div', { class: 'picked-products' });
    b.products.forEach(function (p, i) {
      list.appendChild(h('div', { class: 'picked-product' }, [
        h('span', { class: 'picked-product__title' }, [p.title || ('#' + p.productId)]),
        field(b.type === 'fixed' ? t('qty') : t('max_qty'),
          numberInput(b.type === 'fixed' ? p.quantity : p.maxQuantity, function (v) {
            if (b.type === 'fixed') p.quantity = v || 1; else p.maxQuantity = v;
          })),
        b.type === 'box_builder'
          ? field(t('step'), numberInput(p.step, function (v) { p.step = v; }))
          : h('span'),
        h('button', { class: 'btn btn--small btn--danger', onclick: function () { b.products.splice(i, 1); renderEditor(); } }, [t('remove')])
      ]));
    });
    wrap.appendChild(list);
    return wrap;
  }

  function renderSteps(b) {
    var wrap = h('section', { class: 'panel' }, [h('h2', {}, [t('steps')])]);
    (b.steps || []).forEach(function (step, i) {
      wrap.appendChild(h('div', { class: 'field-row' }, [
        field(t('step_title'), h('input', {
          type: 'text', value: step.title || '',
          oninput: function (e) { step.title = e.target.value; }
        })),
        field(t('min_items'), numberInput(step.minItems, function (v) { step.minItems = v; })),
        field(t('max_items'), numberInput(step.maxItems, function (v) { step.maxItems = v; })),
        h('button', { class: 'btn btn--small btn--danger', onclick: function () { b.steps.splice(i, 1); renderEditor(); } }, [t('remove')])
      ]));
    });
    wrap.appendChild(h('button', {
      class: 'btn btn--small',
      onclick: function () {
        b.steps = b.steps || [];
        b.steps.push({ position: b.steps.length, title: '', minItems: 1, maxItems: null });
        renderEditor();
      }
    }, [t('add_step')]));
    return wrap;
  }

  /**
   * Discount rule editor. Rules are stored as JSON; the textarea exposes the
   * exact rule object so every option the engine supports is reachable —
   * the type dropdown seeds a sensible default shape.
   */
  function renderDiscountRules(b) {
    var wrap = h('section', { class: 'panel' }, [h('h2', {}, [t('discounts')])]);

    var defaults = {
      tiered: { type: 'tiered', label: 'Buy more, save more', tiers: [{ minQty: 3, discountPercent: 10 }, { minQty: 5, discountPercent: 20 }] },
      volume: { type: 'volume', label: 'Volume pricing', tiers: [{ minQty: 6, unitPrice: 900 }] },
      bogo: { type: 'bogo', label: 'Buy 1 get 1 free', buyQty: 1, getQty: 1, discountPercent: 100 },
      buy_x_get_y: { type: 'buy_x_get_y', label: 'Buy X get Y', buyProductIds: [], buyQty: 2, getProductIds: [], getQty: 1, discountPercent: 50, repeat: false },
      fixed_price: { type: 'fixed_price', label: 'Bundle price', price: 4900 },
      progressive: { type: 'progressive', label: 'Complete steps, save more', steps: [{ minSteps: 2, discountPercent: 5 }, { minSteps: 3, discountPercent: 12 }] },
      free_gift: { type: 'free_gift', label: 'Free gift', minSubtotal: 10000, giftVariantId: '', giftQuantity: 1 }
    };

    (b.discountRules || []).forEach(function (rule, i) {
      var textarea = h('textarea', {
        class: 'rule-json', spellcheck: 'false',
        oninput: function (e) {
          try {
            b.discountRules[i] = JSON.parse(e.target.value);
            e.target.classList.remove('invalid');
          } catch (err) {
            e.target.classList.add('invalid');
          }
        }
      }, [JSON.stringify(rule, null, 2)]);
      wrap.appendChild(h('div', { class: 'rule' }, [
        h('div', { class: 'rule__head' }, [
          h('strong', {}, [rule.label || rule.type]),
          h('button', { class: 'btn btn--small btn--danger', onclick: function () { b.discountRules.splice(i, 1); renderEditor(); } }, [t('remove')])
        ]),
        textarea
      ]));
    });

    var typePicker = select(RULE_TYPES, 'tiered', function () {});
    wrap.appendChild(h('div', { class: 'rule-add' }, [
      typePicker,
      h('button', {
        class: 'btn btn--small',
        onclick: function () {
          b.discountRules = b.discountRules || [];
          b.discountRules.push(JSON.parse(JSON.stringify(defaults[typePicker.value])));
          renderEditor();
        }
      }, [t('add_rule')])
    ]));
    return wrap;
  }

  function saveBundle() {
    var b = state.editing;
    var isNew = !b.id;
    var req = isNew
      ? api('/bundles', { method: 'POST', body: JSON.stringify(b) })
      : api('/bundles/' + b.id, { method: 'PUT', body: JSON.stringify(b) });
    req
      .then(function () {
        state.editing = null;
        return loadBundles();
      })
      .then(function () { flash(t('saved')); })
      .catch(function (err) { alert(t('error') + err.message); });
  }

  /* ----------------------------- helpers ----------------------------- */

  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  function flash(message) {
    var node = h('div', { class: 'flash' }, [message]);
    document.body.appendChild(node);
    setTimeout(function () { node.remove(); }, 2500);
  }

  function applyLang() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      node.textContent = t(node.dataset.i18n);
    });
  }

  function loadBundles() {
    return api('/bundles').then(function (data) {
      state.bundles = data.bundles;
      state.currency = data.currency || null;
      if (!state.editing) renderList();
    });
  }

  /* ------------------------------- boot ------------------------------- */

  document.getElementById('new-bundle').onclick = function () { openEditor(null); };
  document.getElementById('lang-toggle').onclick = function () {
    state.lang = state.lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('bb-admin-lang', state.lang);
    applyLang();
    state.editing ? renderEditor() : renderList();
  };

  applyLang();
  loadBundles().catch(function (err) {
    document.getElementById('app').innerHTML =
      '<p class="empty-state">' + t('error') + err.message + '</p>';
  });
})();
