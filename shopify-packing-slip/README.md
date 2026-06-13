# مطحنة المعلم · Al Moallem Mill — Premium Packing Slip

Enterprise-grade, print-ready packing slip templates built on your store's brand
identity: the smiling-chef logo, the deep-brown / bronze / cream / fez-red /
herb-green palette pulled straight from that logo, full RTL Arabic with English
sub-labels for warehouse staff, and A4 / Letter print optimisation.

Templates are provided so you can use whichever printing system and look you
prefer. All share the same brand tokens and the same premium feature set (QR
code, order barcode, pick-&-pack checklist, warehouse notes, signature line,
returns + customer-care footer).

| File | For | Look / advantage |
|------|-----|------------------|
| `packing-slip-native.liquid` | **Native Shopify packing slips** (Settings → Shipping and delivery → Packing slips) | Bold design — dark-brown header, bronze meta strip, zebra product table. Uses `line_items_in_shipment`, supports partial shipments |
| `packing-slip-editorial.liquid` | **Native Shopify packing slips** | Boutique/editorial design tuned to **one A4 page** — ivory certificate frame, centred logo crest, Amiri serif, hairline rules. Shows the variant subtitle and per-line **prices** by matching each shipment line back to `order.line_items` (native slips omit prices), and prints **COD vs Online Payment** automatically. No Bill-To / checklist / warehouse-notes / customer-care blocks |
| `packing-slip-order-printer.liquid` | **Order Printer app** (Apps → Order Printer) | Adds product **image thumbnails**, barcodes, vendor, product type, per-line discounts, and a full financial breakdown the native engine can't render |

The two native files are interchangeable — pick the one whose look you prefer
and paste it into the same packing-slip editor. Previews of each render
(with sample data) are in `preview/`.

---

## 1. Setup

### A. Native packing slip (recommended — matches your current setup)

1. Shopify admin → **Settings → Shipping and delivery**.
2. Scroll to **Packing slips** → **Edit packing slip template**.
3. Delete everything in the editor and paste the contents of
   `packing-slip-native.liquid`.
4. **Save**. Open any order → **More actions → Print packing slips** to preview.

### B. Order Printer app (for the image-rich version)

1. Install **Order Printer** (free, by Shopify) from the App Store.
2. Apps → **Order Printer** → **Manage templates → Add template**.
3. Name it `Packing Slip — Premium`, paste `packing-slip-order-printer.liquid`,
   **Save**.
4. Open an order → **More actions → Print with Order Printer** → pick the template.

> **Legacy Order Printer note:** if product thumbnails come out blank, your app
> version uses the old image filter. Find `image_url: width: 92` (two places) and
> replace with `img_url: '92x92'`.

### C. Customise (top of each file — the `SETTINGS` / `:root` blocks)

- **Logo** — already wired to your live CDN URL
  (`.../IMG_8323_3fabdbaa-...png`). Replace only if you re-upload the logo.
- **Brand colours** — defined once in `:root` (e.g. `--red: #c0392b`). Change a
  hex there and it cascades through the whole slip.
- **Contact / legal** — `store_phone`, `store_country`, `store_tax_number`,
  `support_hours`, `returns_window`.
- **Feature toggles** — `show_qr`, `show_barcode`, `show_checklist`,
  `show_signature`, `show_prices` (set `show_prices = false` for a gift slip),
  and `show_images` (Order Printer only).

### D. QR & barcode (important)

The QR and barcode are rendered as images by external services
(`api.qrserver.com` and `barcode.tec-it.com`) so they work without any app or
JavaScript. They load when the slip is previewed/printed in the browser.

- If your warehouse network blocks outside requests, either self-host a barcode
  image generator and update `qr_provider` / `barcode_provider`, or set
  `show_qr = false` / `show_barcode = false`.
- No order data leaves your network beyond the order number + recipient name
  that get encoded into the code image request.

---

## 2. Shopify variables used

### Native packing slip (`packing-slip-native.liquid`)

**Store** — `shop.name`, `shop.domain`, `shop.email`
**Order** — `order.name`, `order.created_at`, `order.note`, `order.total_price`,
`order.total_discounts`, `order.shipping_price`, `order.tax_price`,
`order.fulfillment_status`, `order.payment_gateway_names`, `order.po_number`
**Shipment items** — `line_items_in_shipment` →
`.title`, `.variant_title`, `.sku`, `.vendor`, `.price`, `.line_price`,
`.quantity`, `.shipping_quantity`, `.properties`, `.groups` (`.title`,
`.deliverable?`)
**Shipping address** — `shipping_address.name`, `.company`, `.address1`,
`.address2`, `.city_province_zip`, `.country`, `.phone`
**Billing address** — `billing_address.name`, `.company`, `.address1`,
`.address2`, `.city_province_zip`, `.country`
**Delivery** — `delivery_method.title`, `delivery_method.instructions`
**Control** — `includes_all_line_items_in_order`

> Some extended order fields (`payment_gateway_names`, `po_number`, `tax_price`)
> populate only on certain plans/checkouts; every one is wrapped in an
> `{% if %}` so a blank value never breaks the layout.

### Order Printer (`packing-slip-order-printer.liquid`)

Everything above **plus** the richer Order Printer objects:
**Order** — `order.subtotal_price`, `order.total_tax`, `order.tax_lines`
(`.title`, `.rate`, `.price`), `order.total_duties`, `order.total_refunded`,
`order.total_outstanding`, `order.discount_codes`, `order.tags`,
`order.transactions.first.gateway`, `order.shipping_method.title`,
`order.shipping_lines`, `order.attributes` (Gift message / Delivery instructions)
**Customer** — `order.customer.name`, `.email`, `.phone`, `.id`
**Line items** — `line_item.image` / `line_item.product.featured_image`,
`line_item.variant.barcode`, `line_item.vendor`, `line_item.product.type`,
`line_item.total_discount`, `line_item.final_line_price`, `line_item.properties`
**Billing/Shipping** — `order.shipping_address.*`, `order.billing_address.*`

---

## 3. Layout (top → bottom)

1. **Header** — circular logo (auto-fallback to a "م م" monogram if the image
   fails), Arabic + English store name, domain / phone / country, and a red
   "Packing Slip · إيصال الشحن" badge.
2. **Order meta strip** — order number, date, payment, piece count, a green
   fulfilment status pill, PO number.
3. **Info grid** — three cards: order/customer · shipping address · billing
   address.
4. **Products table** — numbered rows, product + variant chip, SKU, vendor,
   line-item notes (gift/personalisation), quantity (shipped/ordered), unit and
   line totals; image thumbnails in the Order Printer version.
5. **Totals** — subtotal, discount, shipping, tax, (duties/refund/balance in
   Order Printer), bold grand total in the dark panel with red figure.
6. **Operations grid** — pick-&-pack checklist + warehouse notes on one side,
   QR (order summary) and Code128 order barcode on the other.
7. **Signature** — recipient signature + date lines.
8. **Policy footer** — returns/exchange window and customer-care contacts, then
   the spice-ornament divider and dark thank-you footer.

---

## 4. Preview mockup — what prints

A 780-px-wide ivory (`#f5edd6`) slip on a clean page. A thin red-to-bronze
gradient ribbon runs across the very top, above a **deep-brown header** carrying
your circular chef logo (red-ringed), "مطحنة المعلم / AL MOALLEM MILL" in the
Amiri display face, and a red **Packing Slip** badge on the left. A red hairline
separates the header from a **bronze-tinted meta strip** of centred pill stats
(الطلب، التاريخ، الدفع، القطع، الحالة) where the order number is red and the
status sits in a green rounded badge.

Below, **three bordered cards** lay out order/customer, shipping, and billing
details in Cairo at comfortable RTL line-height. A **dark section bar** ("المنتجات
المشحونة / Items in this shipment") introduces the **zebra-striped product table**
— bronze header row, alternating cream/white rows, variant shown as a pill chip,
SKU and vendor in muted bronze, and any gift/personalisation note flagged with a
red right-border callout. The shipment subtotal closes the table.

The **totals card** floats with a dark-brown grand-total bar and the amount in
bold fez-red. Underneath, a two-column **operations zone**: a checkbox pick-&-pack
list with handwriting lines for warehouse notes and a packer signature, beside a
centred **QR code** (scan for order summary) and a **Code128 barcode** of the
order number for scanning. A **signature line** for the recipient follows, then a
dashed **returns + customer-care** panel, a small spice-diamond ornament, and the
**dark footer** ("شكراً لثقتكم ✦") with domain, phone, and email — capped by a
solid red base band.

In **colour** the brand accents (red, bronze, green) sing; on a **black-and-white**
printer every coloured panel pairs a dark fill with light text, so nothing relies
on colour to stay legible — status, totals, and headings all read clearly in
greyscale.
