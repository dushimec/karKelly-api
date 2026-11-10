import mongoose from "mongoose";

const pixabayImageSearchCacheSchema = new mongoose.Schema(
  {
    cacheKey: { type: String, required: true, unique: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Products", required: true },
    productName: { type: String, required: true },
    results: { type: [mongoose.Schema.Types.Mixed], default: [] },
    totalHits: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

export const pixabayImageSearchCacheModel = mongoose.model(
  "PixabayImageSearchCache",
  pixabayImageSearchCacheSchema
);
export default pixabayImageSearchCacheModel;
