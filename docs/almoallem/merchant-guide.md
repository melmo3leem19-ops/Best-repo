# Almoallem Store — Merchant User Guide / دليل التاجر

Theme: **Copy of Copy of v4** (unpublished work copy). Everything below works in
**Online Store → Themes → Copy of Copy of v4 → Customize** unless noted.
كل ما يلي يتم من خلال: **المتجر الإلكتروني ← الثيمات ← Copy of Copy of v4 ← تخصيص**.

---

## 1. Badge System / نظام الشارات

### English

Badges appear automatically on product cards (collections, search, featured
products, recommendations), product pages, and quick view.

**Choosing a badge design per product (5 layouts):**
1. Admin → Products → open a product.
2. Scroll to **Metafields → badge layout** and pick one:
   - `layout_1` — minimal luxury pill (solid/gradient)
   - `layout_2` — glassmorphism chip (frosted glass)
   - `layout_3` — corner ribbon
   - `layout_4` — outlined chip with icon
   - `layout_5` — premium glow card (the most luxurious)
3. Save. The badge text comes from (in priority order):
   1. **custom badge** metafield (links a Badge metaobject — your own text/color)
   2. **Best seller** checkbox metafield → "الأكثر مبيعاً / Best seller"
   3. **Best value** checkbox metafield → "أفضل قيمة / Best value"
   4. Automatic **Sale** badge when compare-at price is set → "تخفيض / Sale"
   5. Automatic **Sold out** badge → "نفدت الكمية / Sold out"

**Global styling (Theme settings → Badge System):**
- Enable/disable badges store-wide.
- Position per device: top-start / top-end / bottom-start / bottom-end / center
  / custom coordinates (two % sliders). Positions flip automatically in Arabic.
- Animation preset: shine, glow, pulse, float, bounce, wave, scale, luxury, none
  — with a separate "disable animation on mobile" switch. Animations
  automatically turn off for visitors with reduced-motion enabled.
- Per-layout styling: colors, gradient stops, border, radius, shadow/glow,
  font size for mobile and desktop, letter spacing, icon toggle (layout 4).

### العربية

تظهر الشارات تلقائياً على بطاقات المنتجات (المجموعات، البحث، المنتجات المميزة،
التوصيات) وصفحة المنتج والعرض السريع.

**اختيار تصميم الشارة لكل منتج (5 تصاميم):**
1. لوحة التحكم ← المنتجات ← افتح المنتج.
2. انزل إلى **Metafields ← badge layout** واختر:
   - `layout_1` — شارة فاخرة بسيطة (لون/تدرج)
   - `layout_2` — شارة زجاجية (تأثير الزجاج الضبابي)
   - `layout_3` — شريط زاوية
   - `layout_4` — إطار مع أيقونة
   - `layout_5` — شارة متوهجة فاخرة (الأفخم)
3. احفظ. نص الشارة يأتي حسب الأولوية:
   1. حقل **custom badge** (نص ولون من اختيارك عبر Badge metaobject)
   2. حقل **Best seller** ← «الأكثر مبيعاً»
   3. حقل **Best value** ← «أفضل قيمة»
   4. شارة **تخفيض** تلقائية عند وجود سعر قبل الخصم
   5. شارة **نفدت الكمية** تلقائية

**التحكم العام (إعدادات الثيم ← Badge System):**
- تفعيل/تعطيل الشارات في كامل المتجر.
- الموضع لكل جهاز (يَنعكس تلقائياً في العربية) أو إحداثيات مخصصة.
- حركة الشارة: لمعان، توهج، نبض، طفو، قفز، موجة، تكبير، فاخر، بدون — مع خيار
  إيقاف الحركة على الجوال، وإيقاف تلقائي لمن فعّل «تقليل الحركة» في جهازه.
- تخصيص كامل لكل تصميم: ألوان، تدرج، حدود، ظل/توهج، حجم خط للجوال والكمبيوتر.

---

## 2. Universal Collection Showcase / واجهة عرض المجموعات

### English

A new homepage-ready section that displays your collections in 9 styles.

**Adding it:** Customize → Add section → **Collection Showcase** (already added
on the homepage with بهارات / مكسرات / دراجية).

**Picking collections:** each collection is a block — add/remove/reorder blocks
to control what shows and in what order (2–12 collections).

**Desktop settings:** layout (carousel / grid / bento / masonry / editorial /
magazine / split / storytelling / luxury), columns (2–6), gap, card aspect
ratio, hover effect (zoom / lift / reveal text / glass overlay), navigation
style (arrows, dots, progress bar, counter).

**Mobile settings (independent):** its own layout, columns (1–2), card width
for carousel peek, aspect ratio, swipe on/off, animation on/off.

**Other:** autoplay + speed, infinite loop, product count display, text overlay
position + scrim strength, color scheme, reveal-on-scroll animation, and
"virtual rendering" (keeps the page fast by skipping offscreen work). Fully
mirrored for Arabic: swiping, arrows, keyboard navigation and progress all flip.

### العربية

قسم جديد يعرض مجموعاتك بـ 9 أنماط.

**الإضافة:** تخصيص ← إضافة قسم ← **Collection Showcase** (مضاف مسبقاً في
الصفحة الرئيسية بمجموعات: بهارات، مكسرات، دراجية).

**اختيار المجموعات:** كل مجموعة عبارة عن «بلوك» — أضف/احذف/رتّب البلوكات
للتحكم بالمعروض وترتيبه (من 2 إلى 12 مجموعة).

**إعدادات الكمبيوتر:** النمط (كاروسيل / شبكة / بينتو / متدرج / افتتاحي / مجلة /
مقسوم / قصصي / فاخر)، عدد الأعمدة (2–6)، المسافات، نسبة أبعاد البطاقة، تأثير
المرور، نمط التنقل (أسهم، نقاط، شريط تقدم، عداد).

**إعدادات الجوال (مستقلة):** نمط خاص، أعمدة (1–2)، عرض البطاقة للكاروسيل،
نسبة الأبعاد، تفعيل/تعطيل السحب، تفعيل/تعطيل الحركة.

**أخرى:** تشغيل تلقائي + السرعة، تكرار لا نهائي، عدد المنتجات، موضع النص وقوة
التظليل، نظام الألوان، حركة الظهور عند التمرير، و«العرض الافتراضي» للحفاظ على
سرعة الصفحة. القسم يدعم العربية بالكامل: السحب والأسهم ولوحة المفاتيح وشريط
التقدم كلها تنعكس تلقائياً.

---

## 3. Featured Products / المنتجات المميزة

*(Section being upgraded — this chapter will be completed when Phase 4 lands. /
هذا الفصل سيُستكمل بعد اكتمال المرحلة الرابعة.)*

---

## 4. Variant picker / منتقي الخيارات

*(Being fixed — this chapter will be completed when the fix lands. /
هذا الفصل سيُستكمل بعد اكتمال الإصلاح.)*

---

## 5. Going live checklist / قائمة ما قبل النشر

1. Preview the theme copy and test: homepage showcase, a product with badges
   (layouts already set on two products), a discounted product page, cart,
   Arabic and English, mobile and desktop.
2. In the code editor, physically delete the 14 neutralized Bundle Builder stub
   files (list in `docs/almoallem/phase1-bundle-cleanup.md`).
3. Publish the theme.
4. AFTER publishing, optionally remove the old Bundle Builder store data
   (metaobjects + `bundle` namespace metafields) using the exact mutations in
   the Phase 1 report — they are kept for now because the LIVE v4 theme still
   references them.
