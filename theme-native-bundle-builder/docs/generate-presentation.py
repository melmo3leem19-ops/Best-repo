#!/usr/bin/env python3
"""Generate the Bundle Builder Pro training deck (.pptx) for store admins.

Covers: architecture, metaobjects, metafields, bundle types, theme settings,
admin workflow, customer journey, technical implementation, customization,
troubleshooting. Diagrams are drawn with native PowerPoint shapes so the
deck stays editable.

Usage: python3 generate-presentation.py [output.pptx]
"""

import sys
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ── Brand palette (matches the section's default theme) ──
INK = RGBColor(0x14, 0x14, 0x14)
PAPER = RGBColor(0xF1, 0xF0, 0xEC)
ACCENT = RGBColor(0xC0, 0x39, 0x2B)
SAVE = RGBColor(0x0A, 0x7D, 0x36)
MUTED = RGBColor(0x6B, 0x72, 0x80)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
CARD = RGBColor(0xFF, 0xFF, 0xFF)
BORDER = RGBColor(0xE2, 0xDE, 0xD6)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H
BLANK = prs.slide_layouts[6]


def slide():
    s = prs.slides.add_slide(BLANK)
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, SLIDE_H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = PAPER
    bg.line.fill.background()
    bg.shadow.inherit = False
    return s


def text(s, x, y, w, h, content, size=18, color=INK, bold=False, align=PP_ALIGN.LEFT, font="Calibri"):
    box = s.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    first = True
    for line in content.split("\n"):
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = align
        run = p.add_run()
        run.text = line
        run.font.size = Pt(size)
        run.font.color.rgb = color
        run.font.bold = bold
        run.font.name = font
    return box


def bullets(s, x, y, w, h, items, size=15, gap=6):
    box = s.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    for i, (head, body) in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(gap)
        r1 = p.add_run()
        r1.text = "▪  " + head
        r1.font.size = Pt(size)
        r1.font.bold = True
        r1.font.color.rgb = INK
        if body:
            r2 = p.add_run()
            r2.text = " — " + body
            r2.font.size = Pt(size)
            r2.font.color.rgb = MUTED
    return box


def card(s, x, y, w, h, title, body="", fill=CARD, title_color=INK, body_size=12):
    shape = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    shape.adjustments[0] = 0.08
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = BORDER
    shape.line.width = Pt(1)
    shape.shadow.inherit = False
    tf = shape.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = Pt(10)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = title
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = title_color
    if body:
        p2 = tf.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        r2 = p2.add_run()
        r2.text = body
        r2.font.size = Pt(body_size)
        r2.font.color.rgb = MUTED
    return shape


def arrow(s, x1, y1, x2, y2):
    conn = s.shapes.add_connector(2, x1, y1, x2, y2)  # 2 = straight
    conn.line.color.rgb = INK
    conn.line.width = Pt(2)
    return conn


def header(s, title, subtitle=""):
    bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, Inches(1.1))
    bar.fill.solid()
    bar.fill.fore_color.rgb = INK
    bar.line.fill.background()
    bar.shadow.inherit = False
    text(s, Inches(0.5), Inches(0.18), Inches(10), Inches(0.6), title, size=28, color=WHITE, bold=True)
    if subtitle:
        text(s, Inches(0.5), Inches(0.72), Inches(12), Inches(0.35), subtitle, size=13, color=RGBColor(0xCC, 0xCC, 0xCC))


# ════════════════════════════════════════════════════════════════════════
# 1 · Title
# ════════════════════════════════════════════════════════════════════════
s = slide()
band = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(2.4), SLIDE_W, Inches(2.4))
band.fill.solid(); band.fill.fore_color.rgb = INK; band.line.fill.background(); band.shadow.inherit = False
text(s, Inches(0.8), Inches(2.7), Inches(11.7), Inches(0.9), "BUNDLE BUILDER PRO", size=44, color=WHITE, bold=True)
text(s, Inches(0.8), Inches(3.6), Inches(11.7), Inches(0.5),
     "Theme-native bundles for Al Moallem Mill · Metaobjects + Metafields · Arabic & English",
     size=18, color=RGBColor(0xDD, 0xDD, 0xDD))
text(s, Inches(0.8), Inches(5.2), Inches(11.7), Inches(0.4),
     "Administrator training deck · almoallemmill.com · KWD", size=14, color=MUTED)
text(s, Inches(0.8), Inches(1.2), Inches(11.7), Inches(0.6), "📦  اصنع طقمك الخاص — Build Your Own Bundle", size=22, color=INK, bold=True)

# ════════════════════════════════════════════════════════════════════════
# 2 · System Architecture
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "System Architecture", "100% theme-native — no external app, no external server")
y1 = Inches(1.6)
card(s, Inches(0.6), y1, Inches(3.6), Inches(1.5), "SHOPIFY ADMIN", "Metaobjects (bundle_v4)\nProduct metafields (bundle.*)\nDiscount codes (tier minimums)")
card(s, Inches(4.9), y1, Inches(3.6), Inches(1.5), "THEME (Copy of v4)", "sections/bundle-builder-pro.liquid\nsnippets/bundle-pro-card.liquid\nassets/bundle-pro.js + .css")
card(s, Inches(9.2), y1, Inches(3.6), Inches(1.5), "STOREFRONT", "<bundle-builder-pro> element\nLive pricing · drag & drop\nAjax Cart + discount code")
arrow(s, Inches(4.2), Inches(2.35), Inches(4.9), Inches(2.35))
arrow(s, Inches(8.5), Inches(2.35), Inches(9.2), Inches(2.35))
bullets(s, Inches(0.6), Inches(3.5), Inches(12.2), Inches(3.3), [
    ("Liquid renders everything server-side", "bundle config, products, prices come straight from Shopify — fast and SEO-friendly"),
    ("JavaScript only manages interaction", "selection, live totals, wizard steps, add-to-cart — ~12 KB, zero dependencies"),
    ("Checkout integrity", "every discount tier maps to a real Shopify discount code with a minimum-quantity rule; Shopify validates server-side"),
    ("Coexists with the legacy builder", "the original settings-driven bundle-builder section keeps powering existing pages"),
], size=15)

# ════════════════════════════════════════════════════════════════════════
# 3 · Metaobjects Structure
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "Metaobjects Structure — bundle_v4", "Admin → Content → Metaobjects → Bundle V4 Configuration")
cols = [
    ("Identity", ["name / name_ar", "description / description_ar", "image (hero)", "badge / badge_ar", "custom_css_class"]),
    ("Rules", ["bundle_type", "min_products / max_products", "bundle_limit", "status (active/inactive)", "start_date / end_date", "priority (sort order)"]),
    ("Products", ["collections (source)", "required_products", "excluded_products", "tag_filter", "vendor_filter"]),
    ("Discounts", ["discount_type", "discount_value", "discount_code", "tier_discounts (JSON + per-tier code)", "free_gift_product", "free_gift_threshold"]),
    ("Display", ["show_savings", "show_progress_bar", "enable_search", "desktop_columns", "mobile_columns"]),
]
x = Inches(0.45)
for title, fields in cols:
    c = card(s, x, Inches(1.5), Inches(2.4), Inches(4.6), title)
    c.text_frame.vertical_anchor = MSO_ANCHOR.TOP
    for f in fields:
        p = c.text_frame.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        r = p.add_run(); r.text = "· " + f
        r.font.size = Pt(11.5); r.font.color.rgb = MUTED
    x += Inches(2.55)
text(s, Inches(0.45), Inches(6.4), Inches(12.4), Inches(0.8),
     "Tier JSON example:  [{\"min_qty\":3, \"discount\":10, \"code\":\"NUTSBOX10\", \"label\":\"Choose 3: Save 10%\", \"label_ar\":\"اختر 3: وفر 10%\"}]",
     size=12, color=INK)

# ════════════════════════════════════════════════════════════════════════
# 4 · Metafields Structure
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "Product Metafields — namespace `bundle`", "Admin → Products → (product) → Metafields · fine-grained per-product control")
rows = [
    ("enable_bundle_builder", "boolean", "Opt the product into bundle features"),
    ("bundle_eligibility", "text (all / bundle_only / excluded)", "Where the product may appear"),
    ("bundle_priority", "integer", "Lower numbers sort first in bundle grids"),
    ("bundle_category", "text", "Free-form grouping label for steps"),
    ("badge", "text", "Badge shown on the product's bundle card"),
    ("exclude_from_bundle", "boolean", "Hide from every bundle builder"),
    ("bundle_image_override", "file", "Alternate image inside the builder"),
    ("bundle_price_override", "money", "Display-only price inside bundles"),
]
y = Inches(1.5)
for key, typ, desc in rows:
    text(s, Inches(0.6), y, Inches(3.6), Inches(0.4), key, size=14, bold=True)
    text(s, Inches(4.3), y, Inches(3.3), Inches(0.4), typ, size=13, color=ACCENT)
    text(s, Inches(7.7), y, Inches(5.2), Inches(0.4), desc, size=13, color=MUTED)
    y += Inches(0.62)
text(s, Inches(0.6), y + Inches(0.15), Inches(12), Inches(0.5),
     "Already set as examples: بهارات مشكلة (badge + priority 1) · بهارات ماجي (priority 2) · بابونج (excluded)", size=13, color=SAVE, bold=True)

# ════════════════════════════════════════════════════════════════════════
# 5 · Bundle Types
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "Bundle Types", "Set per bundle in the metaobject's bundle_type field")
types = [
    ("mix_match", "Mix & Match", "Pick freely from source collections; tiered savings as quantity grows"),
    ("fixed", "Fixed Bundle", "Locked contents from required_products; one-click add at bundle price"),
    ("wizard", "Box Builder (steps)", "One collection = one step; guided next/back flow"),
    ("quantity_break", "Quantity Break", "Per-unit price improves at tier quantities"),
    ("bxgy", "Buy X Get Y", "Cheapest item per group discounted (100% = free)"),
    ("box", "Collection Box", "Grid of all source collections with a side rail"),
]
positions = [(0.6, 1.6), (4.9, 1.6), (9.2, 1.6), (0.6, 3.6), (4.9, 3.6), (9.2, 3.6)]
for (code, name, desc), (px, py) in zip(types, positions):
    c = card(s, Inches(px), Inches(py), Inches(3.6), Inches(1.7), name, desc)
    tag = s.shapes.add_textbox(Inches(px + 0.1), Inches(py + 1.32), Inches(3.4), Inches(0.3))
    p = tag.text_frame.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = code; r.font.size = Pt(11); r.font.color.rgb = ACCENT; r.font.bold = True
text(s, Inches(0.6), Inches(5.7), Inches(12.2), Inches(1.2),
     "Live examples on your store:\n· Premium Spice Gift Box (mix_match, 3→10% / 5→20%)   · Build Your Own Nuts Box (3→10% / 5→20% / 7→25%)   · Ramadan Gift Hamper (wizard, 6→15% / 9→20%)",
     size=14, color=INK)

# ════════════════════════════════════════════════════════════════════════
# 6 · Discount Calculation & Checkout Flow
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "How Discounts Are Calculated", "UI shows it live — Shopify enforces it at checkout")
steps = [
    ("1 · Select", "Customer adds items;\nJS totals quantity"),
    ("2 · Match tier", "tier_discounts JSON:\nhighest tier ≤ quantity wins"),
    ("3 · Show savings", "Subtotal − tier % =\nlive total in the rail"),
    ("4 · Apply code", "/discount/CODE primes the\ntier's real discount code"),
    ("5 · Checkout", "Shopify validates the code's\nmin-quantity rule server-side"),
]
x = Inches(0.45)
for title, body in steps:
    card(s, x, Inches(1.7), Inches(2.35), Inches(1.7), title, body)
    if x > Inches(0.5):
        arrow(s, x - Inches(0.18), Inches(2.55), x, Inches(2.55))
    x += Inches(2.55)
bullets(s, Inches(0.6), Inches(3.9), Inches(12.2), Inches(2.8), [
    ("Why discount codes?", "a theme cannot create discounts by itself — codes created once in Admin keep checkout honest with zero apps"),
    ("Per-tier codes with minimums", "NUTSBOX25 requires 7+ items from the nuts collection; customers can't misuse a deep code on one item"),
    ("Code scoping", "each code only discounts the bundle's source collections, so unrelated cart items are never discounted"),
    ("KWD precision", "all math uses 3-decimal minor units (fils) — totals always match Shopify to the fils"),
], size=15)

# ════════════════════════════════════════════════════════════════════════
# 7 · Theme Settings
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "Theme Customizer Settings", "Online Store → Customize → Bundle Builder Pro section")
groups = [
    ("Bundle source", "Pick a Bundle V4 metaobject (or auto-show highest priority active) · products per collection · hide sold-out · redirect to cart"),
    ("Layout", "Catalog + side rail or stacked · grid/list view · desktop columns 2–6 · mobile columns 1–3"),
    ("Colors", "Background, text, accent, button text, card, borders, badge bg/text, savings highlight"),
    ("Typography", "Heading size 20–64px · body size 12–20px"),
    ("Cards & buttons", "Soft shadow / outlined / flat cards · corner radius · button radius · border width"),
    ("Badges / progress / discounts", "Pill, ribbon or minimal badges · tiered / simple / dots progress · % and/or amount display"),
    ("Motion & spacing", "Animations on/off (respects prefers-reduced-motion) · grid gap · section padding"),
    ("Language & direction", "RTL automatic for Arabic · force-RTL switch for testing"),
]
y = Inches(1.45)
for name, desc in groups:
    text(s, Inches(0.6), y, Inches(3.4), Inches(0.5), name, size=15, bold=True)
    text(s, Inches(4.1), y, Inches(8.8), Inches(0.5), desc, size=13, color=MUTED)
    y += Inches(0.68)

# ════════════════════════════════════════════════════════════════════════
# 8 · Admin Workflow — creating a bundle
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "Admin Workflow — Create a Bundle in 5 Steps", "No code, no theme edits — pure Shopify Admin")
flow = [
    ("1 · Metaobject", "Content → Metaobjects →\nBundle V4 → Add entry"),
    ("2 · Fill fields", "Name AR/EN, type, min/max,\ncollections, tiers JSON"),
    ("3 · Discount codes", "Discounts → create one code\nper tier with min quantity"),
    ("4 · Set active", "status = active\n(+ optional start/end dates)"),
    ("5 · Publish page", "Pages → new page with\ntemplate page.bundle-pro"),
]
x = Inches(0.45)
for title, body in flow:
    card(s, x, Inches(1.7), Inches(2.35), Inches(1.8), title, body)
    if x > Inches(0.5):
        arrow(s, x - Inches(0.18), Inches(2.6), x, Inches(2.6))
    x += Inches(2.55)
bullets(s, Inches(0.6), Inches(4.0), Inches(12.2), Inches(2.6), [
    ("Managing bundles", "edit the metaobject — changes appear on the storefront immediately, no theme publish needed"),
    ("Scheduling", "start_date / end_date auto-show and auto-hide the bundle; status=inactive hides it instantly"),
    ("Multiple bundles", "create unlimited entries; each page section picks its own bundle, or auto-shows the top-priority active one"),
    ("Seasonal swaps", "duplicate an entry, adjust collections + tiers, flip statuses — the Eid box becomes the National Day box in minutes"),
], size=15)

# ════════════════════════════════════════════════════════════════════════
# 9 · Customer Journey
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "Customer Journey", "Mobile-first, Arabic RTL & English LTR")
journey = [
    ("Land", "Hero, badge, bilingual copy;\nprogress bar with tier markers"),
    ("Build", "Tap + or drag to the rail;\nvariant & quantity per product"),
    ("See savings", "Live subtotal, −%, total;\n“Add 2 more to save 25%”"),
    ("Unlock", "Tier celebrate message;\nfree gift slot fills at threshold"),
    ("Add to cart", "One atomic Ajax add;\ncode pre-applied → checkout"),
]
x = Inches(0.45)
for title, body in journey:
    card(s, x, Inches(1.7), Inches(2.35), Inches(1.8), title, body)
    if x > Inches(0.5):
        arrow(s, x - Inches(0.18), Inches(2.6), x, Inches(2.6))
    x += Inches(2.55)
bullets(s, Inches(0.6), Inches(4.0), Inches(12.2), Inches(2.6), [
    ("RTL Arabic", "layout mirrors automatically via CSS logical properties; all UI strings ship in both languages"),
    ("Out of stock", "sold-out variants are disabled, tracked inventory caps quantities, sold-out products can be hidden"),
    ("Mobile", "rail becomes a bottom sheet with safe-area padding; quick-view always visible (no hover on touch)"),
    ("Accessibility", "aria-live totals, focus-visible controls, keyboard path (+/−) equivalent to drag & drop, reduced-motion support"),
], size=15)

# ════════════════════════════════════════════════════════════════════════
# 10 · Technical Implementation
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "Technical Implementation", "Files added to theme 'Copy of v4'")
rows = [
    ("sections/bundle-builder-pro.liquid", "Reads the metaobject, validates status/schedule, renders groups, prints config JSON, 40+ customizer settings"),
    ("snippets/bundle-pro-card.liquid", "Product card honoring bundle.* metafields (badge, image/price override), variant select, stepper, quick view"),
    ("assets/bundle-pro.js", "<bundle-builder-pro> custom element — selection, pricing engines, drag & drop, wizard, cart, analytics"),
    ("assets/bundle-pro.css", "Logical-properties CSS (auto-RTL), 3 card styles, 3 progress styles, bottom-sheet mobile rail"),
    ("templates/page.bundle-pro.json", "OS 2.0 page template — assign to any page to get a full bundle page"),
]
y = Inches(1.5)
for f, desc in rows:
    text(s, Inches(0.6), y, Inches(4.6), Inches(0.5), f, size=13, bold=True, color=ACCENT)
    text(s, Inches(5.3), y, Inches(7.6), Inches(0.6), desc, size=12.5, color=MUTED)
    y += Inches(0.72)
bullets(s, Inches(0.6), y + Inches(0.1), Inches(12.2), Inches(1.8), [
    ("Events for tracking", "bundle:view, bundle:item_added, bundle:add_to_cart CustomEvents + GA4 dataLayer + Meta fbq + Shopify.analytics"),
    ("Cart drawer", "dispatches the theme's cart:refresh event after adding — same hook the legacy builder uses"),
    ("Performance", "lazy images via Shopify CDN, deferred JS, sticky elements over scroll listeners, zero dependencies"),
], size=14)

# ════════════════════════════════════════════════════════════════════════
# 11 · Customization Guide
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "Customization Guide")
bullets(s, Inches(0.6), Inches(1.5), Inches(12.2), Inches(5.6), [
    ("Change look & feel", "everything visual lives in the section's customizer settings — colors, typography, card style, radius, spacing, animations"),
    ("Per-bundle CSS", "set custom_css_class on the metaobject (e.g. 'eid-theme') and target .eid-theme in custom CSS for one-off styling"),
    ("New tier structure", "edit tier_discounts JSON; create a matching discount code with the same minimum quantity; add the code to the tier"),
    ("Free gift", "set free_gift_product + free_gift_threshold on the metaobject — the gift slot and messaging appear automatically"),
    ("Another bundle page", "Pages → Add page → theme template 'bundle-pro' → in the customizer pick the bundle for that page's section"),
    ("Embed on any page", "the section has a preset — add 'Bundle Builder Pro' from Add section → pick a bundle; works on home, collection, landing pages"),
    ("Translations", "metaobject *_ar fields drive Arabic content; UI strings auto-switch by locale; add languages by extending the i18n JSON in the section"),
    ("Developer extension points", "discount engines live in #discount() in bundle-pro.js; new bundle types = one switch case + a bundle_type value"),
], size=15, gap=10)

# ════════════════════════════════════════════════════════════════════════
# 12 · Troubleshooting
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "Troubleshooting Guide")
rows = [
    ("Bundle doesn't appear", "Check status=active, start/end dates, and that the section picked the right metaobject (or any active one exists)"),
    ("Discount not at checkout", "The tier's code must exist in Discounts, be active, and its minimum quantity must match the tier's min_qty"),
    ("Wrong products showing", "Check source collections, excluded_products, tag/vendor filters, and the product's exclude_from_bundle metafield"),
    ("Prices look wrong", "KWD uses 3 decimals — compare with the variant price in Admin; price_override is display-only by design"),
    ("Arabic not mirrored", "RTL keys off the ar locale — verify Arabic is published in Settings → Languages and the URL is the /ar route"),
    ("Section missing in editor", "Files live on 'Copy of v4' — preview/publish that theme, or copy the 5 files to another theme"),
    ("Free gift not added", "free_gift_product must have an available variant and threshold > 0; gift adds at cart time with _free_gift property"),
    ("Drag & drop not working", "Drag is desktop-only by design — the + button is the universal path (and the accessible one)"),
]
y = Inches(1.45)
for prob, fix in rows:
    text(s, Inches(0.6), y, Inches(3.9), Inches(0.5), "⚠ " + prob, size=13.5, bold=True)
    text(s, Inches(4.7), y, Inches(8.2), Inches(0.6), fix, size=12.5, color=MUTED)
    y += Inches(0.68)

# ════════════════════════════════════════════════════════════════════════
# 13 · Quick Reference / Close
# ════════════════════════════════════════════════════════════════════════
s = slide()
header(s, "Quick Reference")
bullets(s, Inches(0.6), Inches(1.5), Inches(12.2), Inches(4.2), [
    ("Create / edit bundles", "Admin → Content → Metaobjects → Bundle V4 Configuration"),
    ("Per-product control", "Admin → Products → Metafields (bundle.* fields)"),
    ("Discount codes", "Admin → Discounts (one code per tier, minimum quantity = tier min_qty)"),
    ("Design", "Online Store → Customize → Bundle Builder Pro section settings"),
    ("Bundle pages", "Online Store → Pages → template 'bundle-pro'"),
    ("Live samples", "Premium Spice Gift Box · Build Your Own Nuts Box · Ramadan Gift Hamper"),
], size=16, gap=10)
band = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(6.1), SLIDE_W, Inches(1.4))
band.fill.solid(); band.fill.fore_color.rgb = SAVE; band.line.fill.background(); band.shadow.inherit = False
text(s, Inches(0.8), Inches(6.45), Inches(11.7), Inches(0.7),
     "Bundles managed entirely from Shopify Admin — no app fees, no external servers, AR + EN, KWD-exact.",
     size=18, color=WHITE, bold=True)

out = sys.argv[1] if len(sys.argv) > 1 else "bundle-builder-pro-training.pptx"
prs.save(out)
print(f"Saved {out} ({len(prs.slides.slides if hasattr(prs.slides, 'slides') else prs.slides._sldIdLst)} slides)")
