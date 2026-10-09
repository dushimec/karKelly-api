import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    public_id: String,
    url: { type: String, required: true },
    source: String,
    sourceUrl: String,
    attribution: String,
    isbn: String,
  },
  { _id: true }
);

const carDetailsSchema = new mongoose.Schema(
  {
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    trim: { type: String, trim: true },
    year: { type: Number, min: 1886 },
    mileage: { type: Number, min: 0 },
    fuelType: { type: String, trim: true },
    transmission: { type: String, trim: true },
    seats: { type: Number, min: 1 },
    bodyStyle: { type: String, trim: true },
    range: { type: String, trim: true },
    condition: { type: String, trim: true },
    color: { type: String, trim: true },
    location: { type: String, trim: true },
    availabilityStatus: {
      type: String,
      enum: ["available", "reserved", "sold"],
      default: "available",
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a non-negative integer",
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    serviceType: {
      type: String,
      enum: ["stationery", "hardware", "book", "car", "food"],
      index: true,
    },
    listingType: {
      type: String,
      enum: ["sale", "rent"],
    },
    author: { type: String, trim: true },
    publisher: { type: String, trim: true },
    isbn: { type: String, trim: true },
    size: { type: String, trim: true },
    unit: { type: String, trim: true },
    brand: { type: String, trim: true },
    color: { type: String, trim: true },
    material: { type: String, trim: true },
    warranty: { type: String, trim: true },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    trim: { type: String, trim: true },
    year: { type: Number, min: 1886 },
    mileage: { type: Number, min: 0 },
    fuelType: { type: String, trim: true },
    transmission: { type: String, trim: true },
    bodyStyle: { type: String, trim: true },
    seats: { type: Number, min: 1 },
    range: { type: String, trim: true },
    condition: { type: String, trim: true },
    location: { type: String, trim: true },
    sku: { type: String, trim: true, sparse: true },
    images: [imageSchema],
    carDetails: carDetailsSchema,
    publicationStatus: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual("available").get(function () {
  return this.stock > 0;
});

productSchema.virtual("isPublished").get(function () {
  return this.publicationStatus === "published";
});

export const productModel = mongoose.model("Products", productSchema);
export default productModel;
