# Product and order API

The routes below are mounted under the configured `API_URL` prefix. Admin routes
require the existing authentication token (Bearer token or auth cookie) and an
account with `isAdmin: true`.

## Products

### `POST /products/create`

Creates and publishes (or drafts) a product using `multipart/form-data`.
Every request must include:

| Field | Required | Description |
| --- | --- | --- |
| `name` | Yes | Non-empty product name, up to 200 characters |
| `description` | Yes | Non-empty description, up to 5,000 characters |
| `price` | Yes | Positive numeric price in RWF |
| `stock` | Yes | Integer greater than or equal to zero |
| `serviceType` | Yes | `stationery`, `hardware`, `book`, `car`, or `food` |
| `isPublished` | Yes | `true` or `false` (multipart string) |
| `file` | Usually | JPEG, PNG, WebP, or GIF image, up to 5 MB |
| `category` | No | Existing category ID or name; resolved and validated server-side |

Any product may omit `file` when it provides a valid HTTPS `imageUrl`.
Optional book-cover metadata includes `imageSource` and `isbn`. Book details
include `author`, `publisher`, and `isbn`. Hardware details include `size`,
`unit`, `brand`, `color`, `material`, and `warranty`.

Car products must also provide `listingType` (`sale` or `rent`), `make`, `model`,
and a valid `year`. Optional car details include `trim`, `mileage`, `fuelType`,
`transmission`, `bodyStyle`, `seats`, `range`, `color`, `condition`, and
`location`. Rental `price` is per day; rental listings are enquiry/contact-only
and cannot be purchased through `POST /orders/create`.

If `category` is omitted, the backend resolves or creates a category through
the existing category mechanism: stationery and books use `schoolmatetial`,
hardware uses `hardware`, and cars use `carservices`. The persisted
`serviceType` is authoritative. A successful response contains the saved
product in `product`, including `images: [{ "url": "..." }]`.
Food products use the `food` category.

### Product interest and launch email

- `POST /products/:id/cart-interest` requires a signed-in customer and should
  be called after a successful add-to-cart action. It accepts no client-supplied
  email or category: the API derives the interest from the published product.
- Successful product orders also record the customer's category interest.
- Book and stationery interests are grouped together; hardware, cars, and food
  each have separate groups. Product-launch emails are sent only to verified
  customers whose recorded interests match the newly published product.
- Product views do not record interest. Draft listings do not trigger launch
  emails; publishing a draft does. Cart interest is deduplicated per customer.
- The responsive HTML email includes product details and a product link.
  Configure `BRAND_LOGO_URL` to a direct, public HTTPS image URL for the
  KarKelly logo. The website root itself is not an image URL. Without
  `BRAND_LOGO_URL`, the email displays a text brand mark. `FRONTEND_URL`
  controls the product link and defaults to `https://karkelly.site/`.

### Product reads

- `GET /products/get-all` returns `{ "products": [...] }` and only published
  products to public callers. It supports `category`, `search`, `sortBy`,
  `page`, `limit`, `fuelType`, `seats`, `minPrice`, and `maxPrice`.
- `GET /products/get-all?category=carservices` returns published car sale and
  rental listings. `category=schoolmatetial` returns stationery and books.
  Existing category IDs and names continue to filter by category.
- Search is a literal, case-insensitive match across product names,
  descriptions, book/hardware fields, and car fields.
- `GET /products/top` returns only published products.
- `GET /products/admin/get-all` is the authenticated admin inventory read and
  includes drafts and archived listings.
- `GET /products/admin/:id` is the authenticated admin detail read, including
  unpublished listings.

### Product administration

- `PUT /products/:id` updates validated product fields. Send JSON with an
  optional HTTPS `imageUrl`, or multipart data with an optional `file` image;
  saved images become the primary `image_url` and `images[0].url`. To change
  publication state, send `isPublished: true` or `isPublished: false`.
  Stock-only updates preserve the current publication state.
- `POST /products/admin/import/preview` accepts one `.xlsx` workbook in the
  multipart `file` field. The first worksheet must contain `name`, `price`,
  and `in stock` columns; `description`, `category`, `service type`, and
  `image url` are optional. Rows default to stationery in the
  `schoolmatetial` category unless the service type/category identifies
  hardware. The endpoint validates and returns product rows without writing
  anything to MongoDB. It supports up to 100 non-empty rows.
- After reviewing/editing the preview rows and adding an HTTPS `imageUrl` to
  each product, submit the complete array as JSON to `POST /products/bulk`:
  `{ "products": [{ "name": "...", "description": "...", "price": 0,
  "stock": 0, "category": "schoolmatetial", "serviceType": "stationery",
  "imageUrl": "https://..." }] }`. The bulk endpoint creates the products
  with their primary `image_url` and `images[0].url`; existing image URL
  validation remains in effect.
- Both the preview and bulk-create endpoints require an authenticated admin.
  The workbook limit is 5 MB. No spreadsheet rows or products are saved until
  the bulk-create request succeeds.
- `GET /products/admin/get-all` includes published, draft, and archived
  products for the admin inventory; the public product list only includes
  published products.
- `DELETE /products/delete/:id` deletes the product, or archives it when it
  has order history. The response includes `archived: true` when preserving
  the record is necessary.
- Create, update, and delete operations require an authenticated admin.

## Categories

- `GET /category/get-all` returns configured categories.
- `POST /category/create` creates a category and requires an authenticated
  admin.

## Orders and inventory

`POST /orders/create` requires authentication and accepts only published
products with sufficient stock. Product prices and names are read from the
database. Stock decrements and order creation run in the existing MongoDB
transaction, so the database must support transactions (a replica set or
MongoDB Atlas). Insufficient stock and rental-product order attempts return a
conflict response without creating an order or decrementing inventory.

Admins can retrieve all orders with `GET /orders/admin/get-all-orders` and
retrieve a single order, including customer contact details and saved item
images, with `GET /orders/admin/order/:id`. Both endpoints require admin
authentication. Customers can retrieve only their own order through
`GET /orders/my-orders/:id`.

## Configuration

Product launch email reuses the existing `EMAIL_USER` and `EMAIL_PASS`
credentials. Set `BRAND_LOGO_URL` to a direct public HTTPS logo image URL;
`FRONTEND_URL` defaults to `https://karkelly.site` and is used for product
links. Add `productInterests` to existing customer records through normal
cart-interest calls or successful orders; no migration is required because
Mongoose defaults the field to an empty array.

For new-order notifications, set `EMAIL_USER` and `EMAIL_PASS`, plus valid
Twilio `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and
`ADMIN_PHONE_NUMBER` values. `ORDER_NOTIFICATION_EMAILS` is a comma-separated
list of order notification recipients; it defaults to
`ndayiyasoni@gmail.com,musany89@gmail.com`. Customer receipt and admin order
emails include saved product images, line items, totals, and order details.
Email, SMS, and Discord webhook delivery failures are logged but do not turn a
saved order into a failed checkout response. To send admin order notifications
to Discord, configure `DISCORD_WEBHOOK_URL` and `ADMIN_LINK_BASE` in the
backend environment. The Discord message includes the order number, customer
name and phone, total, and a direct link to the authenticated admin order
details page, where an admin can mark the order delivered or cancel it.

The app uses `MONGO_URL` for MongoDB and the existing Cloudinary settings for
uploaded images. In `app.js` those settings are named `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. MongoDB transaction support
is required for order placement. Missing mapped product categories are created
on demand; no manual category seed is required.

### School and office starter catalog

Run `npm run import:school-office-catalog` on the backend after configuring
`MONGO_URL`. The importer creates only missing catalog records, skips existing
name/category matches, and does not search for or download images. Prices,
stock quantities, and descriptions for newly created catalog products are
starter values.

Set `PIXABAY_API_KEY` only in the backend environment (or an uncommitted server
`.env` file) and configure the existing Cloudinary variables
(`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET`). Never expose the Pixabay key in frontend code or API
responses.

### Admin Pixabay image review

These endpoints require authentication and an admin account:

- `GET /admin/products/:id/pixabay-images` searches Pixabay using the product
  name read from MongoDB. It returns temporary candidate preview URLs, Pixabay
  page URLs, tags, and contributor names. Search results are cached in MongoDB
  for 25 hours. Requests are serialized through a shared MongoDB rate gate at
  one request per second (at most 60 provider requests per minute).
- `POST /admin/products/:id/pixabay-images/approve` accepts
  `{ "candidateId": "..." }`. The ID must belong to that product's unexpired
  cached search. Only that explicitly selected candidate is downloaded,
  validated as image content, uploaded to Cloudinary, and saved as the
  product's primary image. Pixabay source, page, and contributor metadata are
  retained.

The workflow never automatically selects or downloads search results. Admins
must review candidate tags and previews before approval. Product image fields
are saved as `image_url` and `images[0].url` for existing frontend
compatibility. `npm run backfill:school-office-images` is read-only and reports
catalog image status; automated image-backfill commands are disabled to avoid
unreviewed or bulk image selection.
