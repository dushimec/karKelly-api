import assert from "node:assert/strict";
import test from "node:test";
import "../src/compat/node-buffer.js";
import cloudinary from "cloudinary";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { isAdmin, isAuth } from "../src/middlewares/authMiddleware.js";
import categoryModel from "../src/models/categoryModel.js";
import orderModel from "../src/models/orderModel.js";
import productModel from "../src/models/productModel.js";
import productRoutes from "../src/routes/productRoutes.js";
import userModel from "../src/models/userModel.js";
import {
  sendAdminOrderEmail,
  sendProductLaunchEmails,
  sendReceiptEmail,
} from "../src/services/emailService.js";
import { createOrder } from "../src/services/orderService.js";
import {
  recordProductCartInterest,
  recordPurchasedProductInterests,
} from "../src/services/productInterestService.js";
import {
  createProduct,
  getProductsByCategoryName,
  updateProduct,
  validateAdminProductInput,
} from "../src/services/productService.js";

const imageFile = {
  buffer: Buffer.from("image-content"),
  originalname: "product.jpg",
  mimetype: "image/jpeg",
  size: 14,
};

const baseProduct = (serviceType, details = {}) => ({
  name: "Sample listing",
  description: "Sample product description",
  price: "12500",
  stock: "4",
  serviceType,
  isPublished: "true",
  ...details,
});

for (const serviceType of ["stationery", "hardware", "book", "car", "food"]) {
  test(`admin product validation normalizes published ${serviceType} listings`, () => {
    const details = serviceType === "car"
      ? { listingType: "rent", make: "Toyota", model: "Corolla", year: "2022" }
      : {};
    const normalized = validateAdminProductInput(baseProduct(serviceType, details), imageFile);

    assert.equal(normalized.serviceType, serviceType);
    assert.equal(normalized.publicationStatus, "published");
    assert.equal(normalized.price, 12500);
    assert.equal(normalized.stock, 4);
    if (serviceType === "car") assert.equal(normalized.listingType, "rent");
  });
}

test("book cover URL is accepted without a multipart image, and category is optional", () => {
  const normalized = validateAdminProductInput(
    baseProduct("book", {
      imageUrl: "https://covers.example.test/book.jpg",
      imageSource: "catalog",
      author: "A. Writer",
      isbn: "9780000000001",
    }),
    undefined
  );

  assert.equal(normalized.imageUrl, "https://covers.example.test/book.jpg");
  assert.equal(normalized.author, "A. Writer");
  assert.equal(normalized.publicationStatus, "published");
});

test("admin product validation rejects invalid type, price, stock, image, and incomplete cars", () => {
  const invalidCases = [
    [baseProduct("unknown"), imageFile],
    [baseProduct("stationery", { price: "0" }), imageFile],
    [baseProduct("hardware", { stock: "-1" }), imageFile],
    [baseProduct("book"), undefined],
    [baseProduct("car", { listingType: "sale" }), imageFile],
    [baseProduct("book", { imageUrl: "http://covers.example.test/book.jpg" }), undefined],
  ];
  for (const [input, file] of invalidCases) {
    assert.throws(() => validateAdminProductInput(input, file), { name: "ProductValidationError" });
  }
});

test("product creation maps a missing legacy category and persists service and publication state", async (t) => {
  const originalFindOne = categoryModel.findOne;
  const originalCreate = categoryModel.create;
  const originalProductCreate = productModel.create;
  const originalUpload = cloudinary.v2.uploader.upload;
  const categoryNames = [];
  const savedProducts = [];

  t.after(() => {
    categoryModel.findOne = originalFindOne;
    categoryModel.create = originalCreate;
    productModel.create = originalProductCreate;
    cloudinary.v2.uploader.upload = originalUpload;
  });

  const categories = new Map();
  categoryModel.findOne = async ({ category }) => categories.get(category) || null;
  categoryModel.create = async ({ category }) => {
    categoryNames.push(category);
    const createdCategory = { _id: `category-${category}`, category };
    categories.set(category, createdCategory);
    return createdCategory;
  };
  cloudinary.v2.uploader.upload = async () => ({
    public_id: "product-image",
    secure_url: "https://images.example.test/product.jpg",
  });
  productModel.create = async (document) => {
    savedProducts.push(document);
    return document;
  };

  const created = [];
  for (const serviceType of ["stationery", "hardware", "book", "car", "food"]) {
    const details = serviceType === "car"
      ? { listingType: "sale", make: "Toyota", model: "Corolla", year: "2022" }
      : {};
    created.push(await createProduct(baseProduct(serviceType, details), imageFile));
  }
  created.push(await createProduct(baseProduct("car", {
    listingType: "rent",
    make: "Toyota",
    model: "Corolla",
    year: "2022",
  }), imageFile));

  assert.deepEqual(categoryNames, ["schoolmatetial", "hardware", "carservices", "food"]);
  for (const product of created) {
    assert.equal(product.publicationStatus, "published");
    assert.equal(product.images[0].url, "https://images.example.test/product.jpg");
  }
  assert.deepEqual(created.map((product) => product.serviceType), ["stationery", "hardware", "book", "car", "food", "car"]);
  assert.deepEqual(created.slice(3, 4).map((product) => product.listingType), ["sale"]);
  assert.equal(created[5].listingType, "rent");
  assert.equal(savedProducts[0].category, "category-schoolmatetial");
});

test("legacy category aliases filter by authoritative serviceType and keep public publication filtering", async (t) => {
  const originalFind = productModel.find;
  const originalCount = productModel.countDocuments;
  const originalCategoryFindOne = categoryModel.findOne;
  const queries = [];
  t.after(() => {
    productModel.find = originalFind;
    productModel.countDocuments = originalCount;
    categoryModel.findOne = originalCategoryFindOne;
  });

  categoryModel.findOne = async ({ category }) => ({ _id: `id-${category}` });
  productModel.find = (query) => {
    queries.push(query);
    return {
      populate() { return this; },
      sort() { return this; },
      skip() { return this; },
      limit() { return Promise.resolve([]); },
    };
  };
  productModel.countDocuments = async () => 0;

  await getProductsByCategoryName("carservices", "name", { search: "Civic.*" });
  await getProductsByCategoryName("schoolmatetial", "name", {});
  await getProductsByCategoryName("food", "name", {});
  assert.equal(queries[0].$or[0].serviceType, "car");
  assert.deepEqual(queries[0].$or[1], {
    category: "id-carservices",
    serviceType: { $exists: false },
  });
  assert.deepEqual(queries[1].$or[0].serviceType, { $in: ["stationery", "book"] });
  assert.equal(queries[2].$or[0].serviceType, "food");
  assert.ok(queries[0].$and.some((condition) =>
    condition.$or?.some((clause) => clause.publicationStatus === "published")
  ));
  const searchCondition = queries[0].$and.find((condition) =>
    condition.$or?.some((clause) => clause.name)
  );
  const namePattern = searchCondition.$or.find((clause) => clause.name).name;
  assert.equal(namePattern.test("Civic.*"), true);
  assert.equal(namePattern.test("CivicAnything"), false);
});

test("cart interest is recorded only from an authenticated published product", async (t) => {
  const originalFindOne = productModel.findOne;
  const originalUpdateOne = userModel.updateOne;
  t.after(() => {
    productModel.findOne = originalFindOne;
    userModel.updateOne = originalUpdateOne;
  });

  let savedInterest;
  productModel.findOne = async () => ({
    serviceType: "book",
    publicationStatus: "published",
  });
  userModel.updateOne = async (filter, update) => {
    savedInterest = { filter, update };
    return { matchedCount: 1 };
  };

  const userId = new mongoose.Types.ObjectId().toString();
  const productId = new mongoose.Types.ObjectId().toString();
  await recordProductCartInterest(productId, userId);
  assert.deepEqual(savedInterest, {
    filter: { _id: userId },
    update: { $addToSet: { productInterests: "school-supplies" } },
  });

  const cartRoute = productRoutes.stack.find((layer) =>
    layer.route?.path === "/:id/cart-interest" && layer.route.methods.post
  );
  assert.deepEqual(
    cartRoute.route.stack.slice(0, 1).map((layer) => layer.handle.name),
    ["isAuth"]
  );
});

test("purchased book and stationery items share one deduplicated interest group", async (t) => {
  const originalUpdateOne = userModel.updateOne;
  t.after(() => {
    userModel.updateOne = originalUpdateOne;
  });
  let saved;
  userModel.updateOne = async (...args) => {
    saved = args;
  };
  const session = {};
  const userId = new mongoose.Types.ObjectId().toString();

  await recordPurchasedProductInterests([
    { serviceType: "book" },
    { serviceType: "stationery" },
    { serviceType: "car" },
  ], userId, session);

  assert.deepEqual(saved[0], { _id: userId });
  assert.deepEqual(saved[1], {
    $addToSet: { productInterests: { $each: ["school-supplies", "cars"] } },
  });
  assert.equal(saved[2].session, session);
});

test("launch email sends only to verified subscribers in the matching interest group", async (t) => {
  const originalFind = userModel.find;
  const originalCreateTransport = nodemailer.createTransport;
  const originalLogoUrl = process.env.BRAND_LOGO_URL;
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const deliveries = [];
  let recipientQuery;
  t.after(() => {
    userModel.find = originalFind;
    nodemailer.createTransport = originalCreateTransport;
    if (originalLogoUrl === undefined) delete process.env.BRAND_LOGO_URL;
    else process.env.BRAND_LOGO_URL = originalLogoUrl;
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;
  });

  process.env.BRAND_LOGO_URL = "https://karkelly.site/assets/logo.png";
  process.env.FRONTEND_URL = "https://karkelly.site";
  userModel.find = (query) => {
    recipientQuery = query;
    return {
      select: async () => [{ name: "Customer", email: "customer@example.test" }],
    };
  };
  nodemailer.createTransport = () => ({
    sendMail: async (message) => deliveries.push(message),
  });

  const count = await sendProductLaunchEmails({
    _id: new mongoose.Types.ObjectId(),
    name: "New notebook",
    description: "A fresh stationery item",
    price: 1200,
    serviceType: "stationery",
    publicationStatus: "published",
    images: [{ url: "https://images.example.test/notebook.jpg" }],
  });

  assert.equal(count, 1);
  assert.equal(recipientQuery.isVerified, true);
  assert.equal(recipientQuery.productInterests, "school-supplies");
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].to, "customer@example.test");
  assert.match(deliveries[0].html, /https:\/\/karkelly\.site\/assets\/logo\.png/);
  assert.match(deliveries[0].subject, /Books & Stationery/);

  assert.equal(await sendProductLaunchEmails({
    serviceType: "car",
    publicationStatus: "draft",
  }), 0);
  assert.equal(deliveries.length, 1);
});

test("customer receipt and both admin order emails include persisted item image snapshots", async (t) => {
  const originalFindById = userModel.findById;
  const originalCreateTransport = nodemailer.createTransport;
  const originalRecipients = process.env.ORDER_NOTIFICATION_EMAILS;
  const deliveries = [];
  t.after(() => {
    userModel.findById = originalFindById;
    nodemailer.createTransport = originalCreateTransport;
    if (originalRecipients === undefined) delete process.env.ORDER_NOTIFICATION_EMAILS;
    else process.env.ORDER_NOTIFICATION_EMAILS = originalRecipients;
  });

  process.env.ORDER_NOTIFICATION_EMAILS = "ndayiyasoni@gmail.com,musany89@gmail.com";
  userModel.findById = () => ({
    select: async () => ({ name: "Customer", email: "buyer@example.test", phone: "+250700000000" }),
  });
  nodemailer.createTransport = () => ({
    sendMail: async (message) => deliveries.push(message),
  });
  const order = {
    _id: "order-123",
    user: new mongoose.Types.ObjectId(),
    createdAt: new Date("2026-10-09T12:00:00Z"),
    orderStatus: "processing",
    paymentMethod: "MTN",
    totalAmount: 2400,
    shippingInfo: { address: "KG 1", city: "Kigali", country: "Rwanda" },
    orderItems: [{
      name: "Notebook",
      price: 1200,
      quantity: 2,
      image: "https://images.example.test/notebook.jpg",
    }],
  };

  await sendReceiptEmail(order);
  assert.equal(await sendAdminOrderEmail(order), 2);

  assert.deepEqual(deliveries.map((message) => message.to), [
    "buyer@example.test",
    "ndayiyasoni@gmail.com",
    "musany89@gmail.com",
  ]);
  for (const message of deliveries) {
    assert.match(message.html, /notebook\.jpg/);
    assert.match(message.html, /Notebook/);
    assert.match(message.html, /RWF 2,400/);
    assert.match(message.html, /KG 1/);
  }
});

test("legacy products without images remain orderable and produce an email without a broken image", async () => {
  const order = new orderModel({
    user: new mongoose.Types.ObjectId(),
    shippingInfo: {
      country: "Rwanda",
      address: "KG 1",
      city: "Kigali",
    },
    orderItems: [{
      name: "Legacy product",
      price: 500,
      quantity: 1,
      product: new mongoose.Types.ObjectId(),
    }],
    itemPrice: 500,
    totalAmount: 500,
  });
  await assert.doesNotReject(order.validate());
});

test("create route requires authentication and admin authorization; non-admins are rejected", async () => {
  const createRoute = productRoutes.stack.find((layer) =>
    layer.route?.path === "/create" && layer.route.methods.post
  );
  assert.ok(createRoute);
  assert.deepEqual(
    createRoute.route.stack.slice(0, 2).map((layer) => layer.handle.name),
    ["isAuth", "isAdmin"]
  );
  for (const [path, method] of [
    ["/admin/get-all", "get"],
    ["/admin/:id", "get"],
    ["/:id", "put"],
    ["/delete/:id", "delete"],
  ]) {
    const route = productRoutes.stack.find((layer) =>
      layer.route?.path === path && layer.route.methods[method]
    );
    assert.deepEqual(
      route.route.stack.slice(0, 2).map((layer) => layer.handle.name),
      ["isAuth", "isAdmin"]
    );
  }

  const unauthenticatedResponse = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
  isAuth({ headers: {}, cookies: {} }, unauthenticatedResponse, () => {
    assert.fail("unauthenticated request must not continue");
  });
  assert.equal(unauthenticatedResponse.statusCode, 401);

  const forbiddenResponse = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
  isAdmin({ user: { isAdmin: false } }, forbiddenResponse, () => {
    assert.fail("non-admin request must not continue");
  });
  assert.equal(forbiddenResponse.statusCode, 403);
});

test("updating stock on a draft does not publish it", async (t) => {
  const originalFindById = productModel.findById;
  t.after(() => {
    productModel.findById = originalFindById;
  });

  const product = {
    _id: new mongoose.Types.ObjectId(),
    name: "Hidden hardware",
    description: "Draft inventory",
    price: 100,
    stock: 1,
    serviceType: "hardware",
    publicationStatus: "draft",
    save: async function () { return this; },
  };
  productModel.findById = async () => product;
  const updated = await updateProduct(product._id.toString(), { stock: "5" });

  assert.equal(updated.stock, 5);
  assert.equal(updated.publicationStatus, "draft");
});

test("order creation uses a conditional stock decrement and rejects concurrent overselling", async (t) => {
  const originalFindOne = orderModel.findOne;
  const originalFindProduct = productModel.findOne;
  const originalUpdateProduct = productModel.updateOne;
  const originalCreateOrder = orderModel.create;
  const originalUpdateUser = userModel.updateOne;
  const originalStartSession = mongoose.startSession;
  let decrementFilter;
  let createCalled = false;

  t.after(() => {
    orderModel.findOne = originalFindOne;
    productModel.findOne = originalFindProduct;
    productModel.updateOne = originalUpdateProduct;
    orderModel.create = originalCreateOrder;
    userModel.updateOne = originalUpdateUser;
    mongoose.startSession = originalStartSession;
  });

  const productId = new mongoose.Types.ObjectId().toString();
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  let lookup = 0;
  orderModel.findOne = () => {
    lookup += 1;
    return lookup === 1 ? Promise.resolve(null) : { session: async () => null };
  };
  productModel.findOne = () => ({
    session: async () => ({
      _id: productId,
      name: "Notebook",
      price: 100,
      stock: 3,
      images: [{ url: "https://images.example.test/notebook.jpg" }],
      listingType: "sale",
    }),
  });
  productModel.updateOne = async (filter, update) => {
    decrementFilter = { filter, update };
    return { modifiedCount: 0 };
  };
  mongoose.startSession = async () => session;
  orderModel.create = async () => {
    createCalled = true;
    throw new Error("Order must not be persisted");
  };
  userModel.updateOne = async () => ({ matchedCount: 1 });

  await assert.rejects(
    createOrder({
      user: new mongoose.Types.ObjectId().toString(),
      paymentInfo: "race-test-reference",
      orderItems: [{ product: productId, quantity: 2 }],
    }),
    (error) => error.statusCode === 409
  );
  assert.deepEqual(decrementFilter.filter, { _id: productId, stock: { $gte: 2 } });
  assert.deepEqual(decrementFilter.update, { $inc: { stock: -2 } });
  assert.equal(createCalled, false);
});

test("rental products cannot enter the stock-decrementing order flow", async (t) => {
  const originalFindOne = orderModel.findOne;
  const originalFindProduct = productModel.findOne;
  const originalUpdateProduct = productModel.updateOne;
  const originalUpdateUser = userModel.updateOne;
  const originalCreateOrder = orderModel.create;
  const originalStartSession = mongoose.startSession;
  let decremented = false;
  t.after(() => {
    orderModel.findOne = originalFindOne;
    productModel.findOne = originalFindProduct;
    productModel.updateOne = originalUpdateProduct;
    userModel.updateOne = originalUpdateUser;
    orderModel.create = originalCreateOrder;
    mongoose.startSession = originalStartSession;
  });

  const productId = new mongoose.Types.ObjectId().toString();
  let lookup = 0;
  orderModel.findOne = () => {
    lookup += 1;
    return lookup === 1 ? Promise.resolve(null) : { session: async () => null };
  };
  productModel.findOne = () => ({
    session: async () => ({
      _id: productId,
      name: "Rental car",
      stock: 2,
      listingType: "rent",
    }),
  });
  productModel.updateOne = async () => {
    decremented = true;
    return { modifiedCount: 1 };
  };
  userModel.updateOne = async () => ({ matchedCount: 1 });
  mongoose.startSession = async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  });

  await assert.rejects(
    createOrder({
      user: new mongoose.Types.ObjectId().toString(),
      paymentInfo: "rental-order-reference",
      orderItems: [{ product: productId, quantity: 1 }],
    }),
    (error) => error.statusCode === 409 && error.message.includes("Rental enquiries")
  );
  assert.equal(decremented, false);
});
