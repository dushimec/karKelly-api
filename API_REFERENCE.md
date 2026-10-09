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

A `book` may omit `file` only when it provides a valid HTTPS `imageUrl`.
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

- `PUT /products/:id` updates validated product fields. To change publication
  state, send `isPublished: true` or `isPublished: false`. Stock-only updates
  preserve the current publication state.
- `DELETE /products/delete/:id` deletes the product, or archives it when it
  has order history.
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

## Configuration

Product launch email reuses the existing `EMAIL_USER` and `EMAIL_PASS`
credentials. Set `BRAND_LOGO_URL` to a direct public HTTPS logo image URL;
`FRONTEND_URL` defaults to `https://karkelly.site` and is used for product
links. Add `productInterests` to existing customer records through normal
cart-interest calls or successful orders; no migration is required because
Mongoose defaults the field to an empty array.

The app uses `MONGO_URL` for MongoDB and the existing Cloudinary settings for
uploaded images. In `app.js` those settings are named `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. MongoDB transaction support
is required for order placement. Missing mapped product categories are created
on demand; no manual category seed is required.
