import mongoose from "mongoose";
import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import categoryModel from "../models/categoryModel.js";
import { createCategory } from "./categoryService.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/features.js";

export class ProductValidationError extends Error {
  constructor(errors) {
    super("Product validation failed");
    this.name = "ProductValidationError";
    this.statusCode = 400;
    this.errors = errors;
  }
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidImageUrl = (url) => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeImages = (item, index, fileCount) => {
  const images = Array.isArray(item.images) ? item.images : [];
  const image = item.image || item.imageUrl;
  if (image) images.push(image);

  const normalized = [];
  for (const [imageIndex, value] of images.entries()) {
    const candidate = typeof value === "string" ? { url: value } : value;
    if (!candidate || typeof candidate !== "object" || !isValidImageUrl(candidate.url || "")) {
      return {
        errors: [{
          index,
          field: `images.${imageIndex}`,
          message: "Image URL must be a valid HTTPS URL",
        }],
      };
    }
    normalized.push({
      url: candidate.url,
      source: candidate.source,
      sourceUrl: candidate.sourceUrl,
      attribution: candidate.attribution,
      isbn: candidate.isbn,
    });
  }

  let imageFileIndex;
  if (item.imageFileIndex !== undefined) {
    imageFileIndex = Number(item.imageFileIndex);
    if (!Number.isInteger(imageFileIndex) || imageFileIndex < 0 || imageFileIndex >= fileCount) {
      return {
        errors: [{
          index,
          field: "imageFileIndex",
          message: "Image file index does not match an uploaded file",
        }],
      };
    }
  }

  if (normalized.length === 0 && imageFileIndex === undefined) {
    return {
      errors: [{
        index,
        field: "images",
        message: "Provide at least one HTTPS image URL or imageFileIndex",
      }],
    };
  }

  return { images: normalized, imageFileIndex };
};

export const validateProductInput = (item, index = 0, fileCount = 0, requireImage = true) => {
  const errors = [];
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return [{ index, field: "product", message: "Each product must be an object" }];
  }

  for (const field of ["name", "description", "category"]) {
    if (typeof item[field] !== "string" || !item[field].trim()) {
      errors.push({ index, field, message: `${field} is required` });
    }
  }

  const price = Number(item.price);
  if (
    item.price === undefined ||
    item.price === null ||
    typeof item.price === "boolean" ||
    item.price === "" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    errors.push({ index, field: "price", message: "Price must be a number greater than or equal to 0" });
  }

  const stock = Number(item.stock);
  if (
    item.stock === "" ||
    item.stock === undefined ||
    item.stock === null ||
    typeof item.stock === "boolean" ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    errors.push({ index, field: "stock", message: "Stock must be a non-negative integer" });
  }

  const normalized = normalizeImages(item, index, fileCount);
  if (normalized.errors && requireImage) errors.push(...normalized.errors);

  if (item.category === "carservices" || item.carDetails) {
    const car = item.carDetails || item;
    for (const field of ["make", "model"]) {
      if (typeof car[field] !== "string" || !car[field].trim()) {
        errors.push({ index, field: `carDetails.${field}`, message: `${field} is required for a car listing` });
      }
    }
    const year = Number(car.year);
    if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 1) {
      errors.push({ index, field: "carDetails.year", message: "Car year is invalid" });
    }
    if (car.mileage !== undefined && (!Number.isFinite(Number(car.mileage)) || Number(car.mileage) < 0)) {
      errors.push({ index, field: "carDetails.mileage", message: "Mileage must be non-negative" });
    }
    if (car.seats !== undefined && (!Number.isInteger(Number(car.seats)) || Number(car.seats) < 1)) {
      errors.push({ index, field: "carDetails.seats", message: "Seats must be a positive integer" });
    }
  }

  return errors;
};

const resolveCategory = async (category) => {
  if (typeof category !== "string" || !category.trim()) return null;
  const value = category.trim();
  if (mongoose.Types.ObjectId.isValid(value)) {
    const byId = await categoryModel.findById(value);
    if (byId) return byId;
  }
  return categoryModel.findOne({ category: value });
};

const imageRecordFromUrl = (image) => ({
  url: image.url,
  ...(image.source && { source: String(image.source).slice(0, 100) }),
  ...(image.sourceUrl && isValidImageUrl(image.sourceUrl) && { sourceUrl: image.sourceUrl }),
  ...(image.attribution && { attribution: String(image.attribution).slice(0, 500) }),
  ...(image.isbn && { isbn: String(image.isbn).slice(0, 32) }),
});

const uploadProductImage = async (file) => {
  try {
    const uploaded = await cloudinary.v2.uploader.upload(getDataUri(file).content, {
      resource_type: "image",
    });
    if (!uploaded?.public_id || !isValidImageUrl(uploaded.secure_url || "")) {
      throw new Error("Image storage returned an invalid image record");
    }
    return { public_id: uploaded.public_id, url: uploaded.secure_url };
  } catch (cause) {
    console.error("Product image upload failed:", cause.message);
    const error = new Error("Unable to store product image");
    error.statusCode = 502;
    throw error;
  }
};

const serviceCategoryNames = {
  stationery: "schoolmatetial",
  book: "schoolmatetial",
  hardware: "hardware",
  car: "carservices",
  food: "food",
};
const serviceTypes = new Set(Object.keys(serviceCategoryNames));

const resolveServiceCategory = async (serviceType) => {
  const categoryName = serviceCategoryNames[serviceType];
  let category = await categoryModel.findOne({ category: categoryName });
  if (!category) category = await createCategory(categoryName);
  return category;
};

const parseBoolean = (value) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
};

const optionalText = (data, field, errors, maxLength = 200) => {
  if (data[field] === undefined || data[field] === "") return undefined;
  if (typeof data[field] !== "string" || !data[field].trim() || data[field].length > maxLength) {
    errors.push({ field, message: `${field} must be a non-empty string of at most ${maxLength} characters` });
    return undefined;
  }
  return data[field].trim();
};

export const validateAdminProductInput = (data, file) => {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ProductValidationError([{ field: "product", message: "Product data is required" }]);
  }
  const serviceType = typeof data.serviceType === "string" ? data.serviceType.trim().toLowerCase() : "";
  if (!serviceTypes.has(serviceType)) {
    errors.push({ field: "serviceType", message: "serviceType must be stationery, hardware, book, car, or food" });
  }
  for (const field of ["name", "description"]) {
    if (typeof data[field] !== "string" || !data[field].trim()) {
      errors.push({ field, message: `${field} is required` });
    }
  }
  if (typeof data.name === "string" && data.name.trim().length > 200) {
    errors.push({ field: "name", message: "name must be at most 200 characters" });
  }
  if (typeof data.description === "string" && data.description.trim().length > 5000) {
    errors.push({ field: "description", message: "description must be at most 5000 characters" });
  }

  const price = data.price === "" || data.price === undefined || data.price === null || typeof data.price === "boolean"
    ? NaN
    : Number(data.price);
  if (!Number.isFinite(price) || price <= 0) {
    errors.push({ field: "price", message: "price must be a positive number" });
  }
  const stock = data.stock === "" || data.stock === undefined || data.stock === null || typeof data.stock === "boolean"
    ? NaN
    : Number(data.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    errors.push({ field: "stock", message: "stock must be a non-negative integer" });
  }
  const isPublished = parseBoolean(data.isPublished);
  if (isPublished === null) {
    errors.push({ field: "isPublished", message: "isPublished must be true or false" });
  }

  const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
  const validBookImageUrl = serviceType === "book" && isValidImageUrl(imageUrl);
  if (!file && !validBookImageUrl) {
    errors.push({ field: "file", message: "A product image is required (books may provide a valid HTTPS imageUrl)" });
  }
  if (imageUrl && !isValidImageUrl(imageUrl)) {
    errors.push({ field: "imageUrl", message: "imageUrl must be a valid HTTPS URL" });
  }
  if (data.category !== undefined && (typeof data.category !== "string" || !data.category.trim())) {
    errors.push({ field: "category", message: "category must be a valid category ID or name" });
  }

  const fields = {};
  const commonTextFields = {
    book: ["author", "publisher", "isbn"],
    hardware: ["size", "unit", "brand", "color", "material", "warranty"],
    car: ["make", "model", "trim", "fuelType", "transmission", "bodyStyle", "range", "color", "condition", "location"],
    stationery: [],
  };
  for (const field of commonTextFields[serviceType] || []) {
    const value = optionalText(data, field, errors, field === "description" ? 5000 : 200);
    if (value !== undefined) fields[field] = value;
  }

  if (serviceType === "car") {
    if (!["sale", "rent"].includes(data.listingType)) {
      errors.push({ field: "listingType", message: "listingType must be sale or rent for cars" });
    } else {
      fields.listingType = data.listingType;
    }
    for (const field of ["make", "model"]) {
      if (typeof data[field] !== "string" || !data[field].trim()) {
        errors.push({ field, message: `${field} is required for a car listing` });
      }
    }
    const year = data.year === "" || data.year === undefined ? NaN : Number(data.year);
    if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 1) {
      errors.push({ field: "year", message: "year must be a valid car model year" });
    } else {
      fields.year = year;
    }
    for (const field of ["mileage", "seats"]) {
      if (data[field] !== undefined && data[field] !== "") {
        const value = Number(data[field]);
        if (!Number.isFinite(value) || value < 0 || (field === "seats" && (!Number.isInteger(value) || value < 1))) {
          errors.push({ field, message: `${field} must be a valid non-negative number` });
        } else {
          fields[field] = value;
        }
      }
    }
  }

  if (errors.length) throw new ProductValidationError(errors);
  return {
    name: data.name.trim(),
    description: data.description.trim(),
    price,
    stock,
    serviceType,
    publicationStatus: isPublished ? "published" : "draft",
    ...(Object.keys(fields).length && fields),
    imageUrl: validBookImageUrl ? imageUrl : undefined,
    imageMetadata: {
      ...(data.imageSource && { source: String(data.imageSource).slice(0, 100) }),
      ...(data.imageUrl && isValidImageUrl(data.imageUrl) && { sourceUrl: imageUrl }),
      ...(data.isbn && { isbn: String(data.isbn).slice(0, 32) }),
    },
  };
};

export const getAllProducts = async (
  filter = {},
  sortBy = "name",
  { page = 1, limit = 1000, search = "", fuelType, seats, minPrice, maxPrice, adminInventory = false } = {}
) => {
  const query = { ...filter };
  const conditions = [...(filter.$and || [])];
  delete query.$and;
  if (!adminInventory) {
    conditions.push({
        $or: [
          { publicationStatus: "published" },
          { publicationStatus: { $exists: false } },
        ],
      });
  }

  if (search) {
    const term = new RegExp(escapeRegex(String(search).slice(0, 100)), "i");
    conditions.push({
      $or: [
        { name: term }, { description: term }, { author: term }, { publisher: term },
        { isbn: term }, { size: term }, { unit: term }, { brand: term }, { color: term },
        { material: term }, { warranty: term }, { make: term }, { model: term }, { trim: term },
        { fuelType: term }, { transmission: term }, { bodyStyle: term }, { range: term },
        { condition: term }, { location: term }, { "carDetails.make": term }, { "carDetails.model": term },
        { "carDetails.trim": term }, { "carDetails.fuelType": term },
        { "carDetails.transmission": term }, { "carDetails.bodyStyle": term },
        { "carDetails.condition": term }, { "carDetails.color": term }, { "carDetails.location": term },
      ],
    });
  }
  if (conditions.length) query.$and = conditions;
  if (fuelType) query["carDetails.fuelType"] = fuelType;
  if (seats !== undefined) query["carDetails.seats"] = Number(seats);
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
  }

  const sortOptions = {
    name: { name: 1 },
    newest: { createdAt: -1 },
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
  };
  const sortOption = sortOptions[sortBy] || sortOptions.name;

  const [products, totalDocs] = await Promise.all([
    productModel.find(query)
      .populate("category")
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit),
    productModel.countDocuments(query),
  ]);

  return {
    docs: products,
    totalDocs,
    totalPages: Math.ceil(totalDocs / limit),
    page,
  };
};

export const getSingleProduct = async (id, includeUnpublished = false) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid Product ID");
    error.statusCode = 400;
    throw error;
  }
  const product = await productModel.findById(id).populate("category");
  if (
    product &&
    !includeUnpublished &&
    product.publicationStatus &&
    product.publicationStatus !== "published"
  ) {
    return null;
  }
  return product;
};

export const createProduct = async (productData, file) => {
  const input = validateAdminProductInput(productData, file);
  if (productData.category) {
    const legacyCategory = await resolveCategory(productData.category);
    if (!legacyCategory) {
      throw new ProductValidationError([{ field: "category", message: "Category does not exist" }]);
    }
  }
  const category = await resolveServiceCategory(input.serviceType);

  let uploadedImage;
  try {
    uploadedImage = file ? await uploadProductImage(file) : null;
    const image = uploadedImage
      ? { ...uploadedImage, ...input.imageMetadata }
      : imageRecordFromUrl({
        url: input.imageUrl,
        ...input.imageMetadata,
      });
    const document = {
      name: input.name,
      description: input.description,
      price: input.price,
      stock: input.stock,
      category: category._id,
      serviceType: input.serviceType,
      publicationStatus: input.publicationStatus,
      images: [image],
      ...(input.listingType && { listingType: input.listingType }),
      ...Object.fromEntries(
        ["author", "publisher", "isbn", "size", "unit", "brand", "color", "material", "warranty",
          "make", "model", "trim", "year", "mileage", "fuelType", "transmission", "bodyStyle",
          "seats", "range", "condition", "location"]
          .filter((field) => input[field] !== undefined)
          .map((field) => [field, input[field]])
      ),
      ...(input.serviceType === "car" && {
        carDetails: cleanCarDetails(input),
      }),
    };
    return await productModel.create(document);
  } catch (error) {
    if (uploadedImage?.public_id) {
      try {
        await cloudinary.v2.uploader.destroy(uploadedImage.public_id);
      } catch (cleanupError) {
        console.error("Failed to clean up product image after product creation failed:", cleanupError.message);
      }
    }
    throw error;
  }
};

export const createProductsBulk = async (items, files = []) => {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new ProductValidationError([{
      index: -1,
      field: "products",
      message: "Provide between 1 and 100 products",
    }]);
  }

  const errors = [];
  const normalized = items.map((item, index) => {
    const result = validateProductInput(item, index, files.length);
    if (result.length) {
      errors.push(...result);
      return null;
    }
    return {
      ...item,
      name: item.name.trim(),
      description: item.description.trim(),
      price: Number(item.price),
      stock: Number(item.stock),
      images: normalizeImages(item, index, files.length).images,
      imageFileIndex: normalizeImages(item, index, files.length).imageFileIndex,
    };
  });

  const skuIndexes = new Map();
  normalized.forEach((item, index) => {
    if (!item || !item.sku) return;
    const sku = String(item.sku).trim().toLowerCase();
    if (skuIndexes.has(sku)) {
      errors.push({ index, field: "sku", message: `SKU duplicates item ${skuIndexes.get(sku)}` });
    } else {
      skuIndexes.set(sku, index);
    }
  });
  if (errors.length) throw new ProductValidationError(errors);

  const categories = await Promise.all(normalized.map((item) => resolveCategory(item.category)));
  categories.forEach((category, index) => {
    if (!category) {
      errors.push({ index, field: "category", message: "Category does not exist" });
    } else if (itemIsCar(normalized[index]) && category.category !== "carservices") {
      errors.push({ index, field: "category", message: "Car listings must use the carservices category" });
    }
  });
  if (errors.length) throw new ProductValidationError(errors);

  const uploadedImages = [];
  try {
    const documents = await Promise.all(normalized.map(async (item, index) => {
      const images = item.images.map(imageRecordFromUrl);
      if (item.imageFileIndex !== undefined) {
        const uploaded = await uploadProductImage(files[item.imageFileIndex]);
        uploadedImages.push(uploaded);
        images.push(uploaded);
      }
      const carDetails = itemIsCar(item) ? cleanCarDetails(item.carDetails || item) : undefined;
      return {
        name: item.name,
        description: item.description,
        price: item.price,
        stock: item.stock,
        category: categories[index]._id,
        ...(item.sku && { sku: String(item.sku).trim() }),
        images,
        ...(carDetails && { carDetails, publicationStatus: item.publicationStatus || "draft" }),
      };
    }));

    const session = await mongoose.startSession();
    let created;
    try {
      await session.withTransaction(async () => {
        created = await productModel.insertMany(documents, { session, ordered: true });
      });
    } finally {
      await session.endSession();
    }
    return created;
  } catch (error) {
    await Promise.all(uploadedImages.map((image) =>
      cloudinary.v2.uploader.destroy(image.public_id)
    ));
    throw error;
  }
};

const itemIsCar = (item) => item.category === "carservices" || Boolean(item.carDetails);

const cleanCarDetails = (car) => {
  const fields = [
    "make", "model", "trim", "year", "mileage", "fuelType", "transmission",
    "seats", "bodyStyle", "range", "condition", "color", "location", "availabilityStatus",
  ];
  return Object.fromEntries(fields.filter((field) => car[field] !== undefined).map((field) => [
    field,
    ["year", "mileage", "seats"].includes(field) ? Number(car[field]) : String(car[field]).trim(),
  ]));
};

const ensureCarCategory = async (category) => {
  const carCategory = await resolveCategory(category || "carservices");
  if (!carCategory || carCategory.category !== "carservices") {
    throw new ProductValidationError([{
      index: 0,
      field: "category",
      message: 'The "carservices" category must exist before managing car listings',
    }]);
  }
  return carCategory;
};

export const createCarListing = async (data, files = []) => {
  const category = await ensureCarCategory(data.category);
  const input = {
    ...data,
    category: "carservices",
    carDetails: data.carDetails || data,
  };
  const errors = validateProductInput(input, 0, files.length);
  if (errors.length) throw new ProductValidationError(errors);
  const images = normalizeImages(input, 0, files.length).images.map(imageRecordFromUrl);
  if (input.imageFileIndex !== undefined) {
    images.push(await uploadProductImage(files[input.imageFileIndex]));
  }
  const car = cleanCarDetails(input.carDetails);
  return productModel.create({
    name: data.name || `${car.year} ${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`,
    description: data.description,
    price: Number(data.price),
    stock: 1,
    category: category._id,
    images,
    carDetails: car,
    publicationStatus: "draft",
  });
};

export const updateCarListing = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid Product ID");
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");
  if (!product.carDetails) throw new ProductValidationError([{ field: "product", message: "Product is not a car listing" }]);
  if (data.category && data.category !== "carservices") await ensureCarCategory(data.category);

  const carUpdates = data.carDetails || data;
  const mergedCar = { ...product.carDetails.toObject(), ...carUpdates };
  const candidate = {
    name: data.name ?? product.name,
    description: data.description ?? product.description,
    price: data.price ?? product.price,
    stock: product.stock,
    category: "carservices",
    images: data.images ?? product.images.map((image) => image.toObject()),
    carDetails: mergedCar,
  };
  const errors = validateProductInput(candidate, 0, 0, false);
  if (errors.length) throw new ProductValidationError(errors);
  product.name = candidate.name;
  product.description = candidate.description;
  product.price = Number(candidate.price);
  product.carDetails = cleanCarDetails(mergedCar);
  if (data.images) product.images = data.images.map(imageRecordFromUrl);
  await product.save();
  return product;
};

export const setCarPublicationStatus = async (id, publicationStatus) => {
  if (!["draft", "published", "archived"].includes(publicationStatus)) {
    throw new ProductValidationError([{
      index: 0,
      field: "publicationStatus",
      message: "Publication status must be draft, published, or archived",
    }]);
  }
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid Product ID");
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");
  if (!product.carDetails) throw new ProductValidationError([{ field: "product", message: "Product is not a car listing" }]);
  product.publicationStatus = publicationStatus;
  await product.save();
  return product;
};

export const updateProduct = async (id, productData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid Product ID");
    error.statusCode = 400;
    throw error;
  }
  const product = await productModel.findById(id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  if (!productData || typeof productData !== "object" || Array.isArray(productData)) {
    throw new ProductValidationError([{ field: "product", message: "Product update data must be an object" }]);
  }

  const errors = [];
  for (const field of ["name", "description"]) {
    if (productData[field] !== undefined &&
      (typeof productData[field] !== "string" || !productData[field].trim())) {
      errors.push({ field, message: `${field} must be a non-empty string` });
    }
  }
  if (typeof productData.name === "string" && productData.name.trim().length > 200) {
    errors.push({ field: "name", message: "name must be at most 200 characters" });
  }
  if (typeof productData.description === "string" && productData.description.trim().length > 5000) {
    errors.push({ field: "description", message: "description must be at most 5000 characters" });
  }
  if (productData.price !== undefined &&
    (productData.price === null || productData.price === "" || typeof productData.price === "boolean" ||
      !Number.isFinite(Number(productData.price)) || Number(productData.price) <= 0)) {
    errors.push({ field: "price", message: "price must be a positive number" });
  }
  if (productData.stock !== undefined &&
    (productData.stock === null || productData.stock === "" || typeof productData.stock === "boolean" ||
      !Number.isInteger(Number(productData.stock)) || Number(productData.stock) < 0)) {
    errors.push({ field: "stock", message: "stock must be a non-negative integer" });
  }
  const updateServiceType = typeof productData.serviceType === "string"
    ? productData.serviceType.trim().toLowerCase()
    : productData.serviceType;
  if (productData.serviceType !== undefined && !serviceTypes.has(updateServiceType)) {
    errors.push({ field: "serviceType", message: "serviceType must be stationery, hardware, book, car, or food" });
  }
  if (productData.listingType !== undefined && !["sale", "rent"].includes(productData.listingType)) {
    errors.push({ field: "listingType", message: "listingType must be sale or rent" });
  }
  if (productData.isPublished !== undefined && parseBoolean(productData.isPublished) === null) {
    errors.push({ field: "isPublished", message: "isPublished must be true or false" });
  }
  for (const field of [
    "author", "publisher", "isbn", "size", "unit", "brand", "color", "material",
    "warranty", "make", "model", "trim", "fuelType", "transmission", "bodyStyle",
    "range", "condition", "location",
  ]) {
    if (productData[field] !== undefined &&
      (typeof productData[field] !== "string" || !productData[field].trim() || productData[field].length > 200)) {
      errors.push({ field, message: `${field} must be a non-empty string of at most 200 characters` });
    }
  }
  if (productData.category !== undefined &&
    (typeof productData.category !== "string" || !await resolveCategory(productData.category))) {
    errors.push({ field: "category", message: "Category does not exist" });
  }
  const numericFields = ["year", "mileage", "seats"];
  for (const field of numericFields) {
    if (productData[field] === undefined) continue;
    const value = Number(productData[field]);
    const valid = Number.isFinite(value) && value >= (field === "year" ? 1886 : field === "seats" ? 1 : 0) &&
      (field !== "seats" || Number.isInteger(value)) &&
      (field !== "year" || (Number.isInteger(value) && value <= new Date().getFullYear() + 1));
    if (!valid) errors.push({ field, message: `${field} is invalid` });
  }
  if ((updateServiceType ?? product.serviceType) === "car") {
    const currentCar = product.carDetails?.toObject?.() || product.carDetails || {};
    for (const field of ["make", "model"]) {
      const value = productData[field] ?? product[field] ?? currentCar[field];
      if (typeof value !== "string" || !value.trim()) {
        errors.push({ field, message: `${field} is required for a car listing` });
      }
    }
    const year = Number(productData.year ?? product.year ?? currentCar.year);
    if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 1) {
      errors.push({ field: "year", message: "year must be a valid car model year" });
    }
    const listingType = productData.listingType ?? product.listingType;
    if (!["sale", "rent"].includes(listingType)) {
      errors.push({ field: "listingType", message: "listingType must be sale or rent for cars" });
    }
  }
  if (errors.length) throw new ProductValidationError(errors);
  if (productData.category) {
    const category = await resolveCategory(productData.category);
    product.category = category._id;
  }
  if (productData.serviceType !== undefined && productData.category === undefined) {
    const category = await resolveServiceCategory(productData.serviceType);
    product.category = category._id;
  }
  for (const field of ["name", "description", "price", "stock", "sku"]) {
    if (productData[field] !== undefined) {
      product[field] = ["price", "stock"].includes(field) ? Number(productData[field]) :
        ["name", "description", "sku"].includes(field) && typeof productData[field] === "string"
          ? productData[field].trim()
          : productData[field];
    }
  }
  for (const field of [
    "serviceType", "listingType", "author", "publisher", "isbn", "size", "unit", "brand",
    "color", "material", "warranty", "make", "model", "trim", "year", "mileage", "fuelType",
    "transmission", "bodyStyle", "seats", "range", "condition", "location",
  ]) {
    if (productData[field] !== undefined) {
      product[field] = field === "serviceType" ? updateServiceType :
        numericFields.includes(field) ? Number(productData[field]) :
        typeof productData[field] === "string" ? productData[field].trim() : productData[field];
    }
  }
  if (productData.listingType !== undefined) {
    product.listingType = productData.listingType.trim().toLowerCase();
  }
  if (productData.isPublished !== undefined) {
    product.publicationStatus = parseBoolean(productData.isPublished) ? "published" : "draft";
  }
  if (product.serviceType === "car") {
    const currentCar = product.carDetails?.toObject?.() || product.carDetails || {};
    const carData = { ...currentCar };
    for (const field of [
      "make", "model", "trim", "year", "mileage", "fuelType", "transmission",
      "seats", "bodyStyle", "range", "condition", "color", "location",
    ]) {
      if (product[field] !== undefined) carData[field] = product[field];
    }
    product.carDetails = cleanCarDetails(carData);
  }
  await product.save();
  return product;
};

export const updateProductImage = async (id, file, imageData = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid Product ID");
    error.statusCode = 400;
    throw error;
  }
  const product = await productModel.findById(id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  if (file) product.images.push(await uploadProductImage(file));
  else if (isValidImageUrl(imageData.url || "")) product.images.push(imageRecordFromUrl(imageData));
  else throw new ProductValidationError([{ index: 0, field: "image", message: "Provide a valid HTTPS URL or image file" }]);
  await product.save();
  return product;
};

export const deleteProductImage = async (id, imageId) => {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(imageId)) {
    const error = new Error("Invalid Product ID or Image ID");
    error.statusCode = 400;
    throw error;
  }
  const product = await productModel.findById(id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  const imageIndex = product.images.findIndex((image) => image._id.toString() === imageId);
  if (imageIndex === -1) throw new Error("Image not found");
  const [image] = product.images.splice(imageIndex, 1);
  await product.save();
  if (image.public_id) await cloudinary.v2.uploader.destroy(image.public_id);
  return product;
};

export const deleteProduct = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid Product ID");
    error.statusCode = 400;
    throw error;
  }
  const product = await productModel.findById(id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  const hasOrderHistory = await orderModel.exists({ "orderItems.product": product._id });
  if (hasOrderHistory) {
    product.publicationStatus = "archived";
    await product.save();
    return product;
  }
  await product.deleteOne();
  for (const image of product.images) {
    if (image.public_id) await cloudinary.v2.uploader.destroy(image.public_id);
  }
  return product;
};

export const addProductReview = async (productId, reviewData, user) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) throw new Error("Invalid Product ID");
  const { comment, rating } = reviewData;
  const product = await productModel.findById(productId);
  if (!product) throw new Error("Product not found");
  if (product.reviews.some((review) => review.user.toString() === user._id.toString())) {
    throw new Error("Product already reviewed");
  }
  product.reviews.push({
    name: user.name,
    rating: Number(rating),
    comment,
    user: user._id,
  });
  product.numReviews = product.reviews.length;
  product.rating = product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length;
  await product.save();
  return product;
};

export const getProductsByCategoryName = async (categoryName, sortBy, options) => {
  const normalized = String(categoryName).trim().toLowerCase();
  const aliasServices = {
    carservices: "car",
    schoolmatetial: { $in: ["stationery", "book"] },
    hardware: "hardware",
    food: "food",
  };
  if (Object.hasOwn(aliasServices, normalized)) {
    const category = await resolveCategory(categoryName);
    const serviceTypeQuery = { serviceType: aliasServices[normalized] };
    if (!category) return getAllProducts(serviceTypeQuery, sortBy, options);
    return getAllProducts({
      $or: [
        serviceTypeQuery,
        { category: category._id, serviceType: { $exists: false } },
      ],
    }, sortBy, options);
  }
  const category = await resolveCategory(categoryName);
  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }
  return getAllProducts({ category: category._id }, sortBy, options);
};

export const getTopProducts = async () => productModel.find({
  $or: [{ publicationStatus: "published" }, { publicationStatus: { $exists: false } }],
}).sort({ rating: -1 }).limit(3).populate("category");

export const getAdminProducts = (sortBy, options) =>
  getAllProducts({}, sortBy, { ...options, adminInventory: true });

export const restoreOrderStock = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) throw new Error("Invalid Order ID");
  const order = await orderModel.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (!order.inventoryDeducted || order.inventoryRestored) return false;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await orderModel.findOneAndUpdate(
        { _id: order._id, inventoryDeducted: true, inventoryRestored: false },
        { $set: { inventoryRestored: true } },
        { new: true, session }
      );
      if (!updated) return;
      for (const item of order.orderItems) {
        await productModel.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } },
          { session }
        );
      }
    });
    return true;
  } finally {
    await session.endSession();
  }
};
