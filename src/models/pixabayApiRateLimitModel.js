import mongoose from "mongoose";

const pixabayApiRateLimitSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "global" },
    nextAllowedAt: { type: Date, required: true },
  },
  { versionKey: false }
);

export const pixabayApiRateLimitModel = mongoose.model(
  "PixabayApiRateLimit",
  pixabayApiRateLimitSchema
);
export default pixabayApiRateLimitModel;
