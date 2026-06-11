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

### English

Your existing Featured Products section (used twice on the homepage) was
upgraded in place — **everything you configured before renders exactly the
same** until you opt into the new options.

**New layout modes** (separate selects for desktop and mobile, alongside the
existing grid/carousel):
- **Bento** — first product becomes a large hero tile in a dense grid.
- **Editorial** — asymmetric magazine-style spans with offset whitespace.
- **Luxury** — centered 960px column, triple spacing, large serif titles,
  subtle reveal animation.
- **Storytelling** — alternating full-width image/text rows (mirrors in Arabic).

**New controls** (all default to "no change"): animation preset (fade-up /
stagger), card hover effect (lift / glass overlay), shadow intensity, heading
alignment, separate desktop/mobile gaps, title & price font weight and letter
spacing, and a **Show badges** toggle — product badges from the Badge System
now appear on these cards automatically.

### العربية

تم تطوير قسم «المنتجات المميزة» الحالي (المستخدم مرتين في الرئيسية) دون أي
تغيير على شكله الحالي — كل إعداداتك السابقة تعمل كما هي حتى تختار الجديد.

**أنماط جديدة** (اختيار مستقل للكمبيوتر والجوال إضافةً إلى الشبكة والكاروسيل):
- **بينتو** — أول منتج يظهر كبطاقة كبيرة بارزة ضمن شبكة مدمجة.
- **افتتاحي** — تنسيق مجلة غير متماثل بمساحات بيضاء.
- **فاخر** — عمود متوسط 960 بكسل، مسافات واسعة، عناوين كبيرة، ظهور ناعم.
- **قصصي** — صفوف متناوبة صورة/نص بعرض كامل (تنعكس تلقائياً في العربية).

**تحكمات جديدة** (كلها افتراضياً «بدون تغيير»): حركة الظهور، تأثير المرور
(رفع / زجاجي)، قوة الظل، محاذاة العنوان، مسافات منفصلة للجوال والكمبيوتر، وزن
خط العنوان والسعر، وزر **إظهار الشارات** — شارات نظام الشارات تظهر الآن على
هذه البطاقات تلقائياً.

---

## 4. Variant picker / منتقي الخيارات

### English

Two fixes on product pages using the variant cards picker:

1. **Discount display** — every discounted variant card now shows one clean
   inline row: sale price, struck-through original price, and an exact "−NN%"
   chip (e.g. 4.500 KWD ~~6.500~~ −31%). Enable/disable the chip per block via
   **Show discount badge** (we turned it ON on the product template).
2. **Two option types** — products with two options (e.g. الحجم + الكمية) now
   render as two clearly separated groups, each with its option name as a
   visible header. The first option keeps the card style; further options use
   compact pills. You can override per block: **First option style** /
   **Other options style** (cards or pills).

Note: if any *other* product mixes sizes and weights inside a single option,
split it into two real options in Admin → Product → Options to benefit from
the grouping.

### العربية

إصلاحان في صفحة المنتج لمنتقي الخيارات بنمط البطاقات:

1. **عرض الخصم** — كل خيار مخفّض يعرض الآن سطراً واحداً أنيقاً: السعر بعد
   الخصم، والسعر الأصلي مشطوباً، وشارة نسبة دقيقة «−31%». يمكن تفعيل/تعطيل
   الشارة من إعداد **Show discount badge** (تم تفعيلها في قالب المنتج).
2. **خياران مختلفان** — المنتجات التي لها خياران (مثل الحجم + الكمية) تظهر الآن
   كمجموعتين منفصلتين بوضوح، لكل مجموعة عنوانها الظاهر. الخيار الأول يبقى
   بنمط البطاقات، والخيارات التالية تظهر كأزرار صغيرة (Pills). يمكن التبديل من
   إعدادات البلوك: **First option style** / **Other options style**.

ملاحظة: إذا كان أي منتج آخر يجمع المقاسات والأوزان في خيار واحد، قم بفصلها إلى
خيارين حقيقيين من لوحة التحكم ← المنتج ← Options للاستفادة من التجميع.

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
