import axios from "axios";
import pixabayImageSearchCacheModel from "../models/pixabayImageSearchCacheModel.js";
import pixabayApiRateLimitModel from "../models/pixabayApiRateLimitModel.js";

const PIXABAY_API_URL = "https://pixabay.com/api/";
const CACHE_DURATION_MS = 25 * 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 1000;
let requestQueue = Promise.resolve();

const getApiKey = () => {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    const error = new Error("Pixabay search is not configured on the server");
    error.statusCode = 503;
    throw error;
  }
  return apiKey;
};

const queuePixabayRequest = (params) => {
  const request = requestQueue.then(async () => {
    const now = new Date();
    const reservation = await pixabayApiRateLimitModel.findOneAndUpdate(
      { _id: "global" },
      [{
        $set: {
          nextAllowedAt: {
            $add: [
              { $max: [{ $ifNull: ["$nextAllowedAt", now] }, now] },
              MIN_REQUEST_INTERVAL_MS,
            ],
          },
        },
      }],
      { upsert: true, new: true }
    );
    const scheduledAt = reservation.nextAllowedAt.getTime() - MIN_REQUEST_INTERVAL_MS;
    const delay = Math.max(0, scheduledAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    return axios.get(PIXABAY_API_URL, { params, timeout: 15000 });
  });

  requestQueue = request.then(() => undefined, () => undefined);
  return request;
};

const makeCacheKey = (productId, productName) =>
  `${String(productId)}:${productName.trim().toLocaleLowerCase()}`;

const publicCandidate = (result) => ({
  id: String(result.id),
  previewUrl: result.previewURL,
  imageUrl: result.webformatURL,
  pageUrl: result.pageURL,
  tags: result.tags,
  contributor: result.user,
  width: result.imageWidth,
  height: result.imageHeight,
});

export const searchPixabayProductImages = async (
  productId,
  productName,
  { cacheModel = pixabayImageSearchCacheModel, now = new Date() } = {}
) => {
  const normalizedName = productName?.trim();
  if (!productId || !normalizedName) {
    const error = new Error("A product ID and name are required for image search");
    error.statusCode = 400;
    throw error;
  }

  const cacheKey = makeCacheKey(productId, normalizedName);
  const cached = await cacheModel.findOne({
    cacheKey,
    expiresAt: { $gt: now },
  }).lean();

  if (cached) {
    return {
      productName: cached.productName,
      results: cached.results.map(publicCandidate),
      totalHits: cached.totalHits,
      cached: true,
      expiresAt: cached.expiresAt,
    };
  }

  let response;
  try {
    response = await queuePixabayRequest({
      key: getApiKey(),
      q: normalizedName,
      image_type: "photo",
      safesearch: "true",
      per_page: 20,
    });
  } catch (cause) {
    const error = new Error(
      cause.statusCode
        ? cause.message
        : cause.response?.status
        ? `Pixabay search failed with status ${cause.response.status}`
        : "Pixabay search request failed"
    );
    error.statusCode = cause.statusCode || (cause.response?.status === 429 ? 429 : 502);
    throw error;
  }

  const results = (response.data?.hits ?? [])
    .filter((hit) =>
      Number.isInteger(hit.id) &&
      typeof hit.previewURL === "string" &&
      typeof hit.webformatURL === "string" &&
      typeof hit.pageURL === "string"
    )
    .map((hit) => ({
      id: hit.id,
      previewURL: hit.previewURL,
      webformatURL: hit.webformatURL,
      largeImageURL: hit.largeImageURL,
      pageURL: hit.pageURL,
      tags: hit.tags ?? "",
      user: hit.user ?? "",
      imageWidth: hit.imageWidth,
      imageHeight: hit.imageHeight,
    }));

  const expiresAt = new Date(now.getTime() + CACHE_DURATION_MS);
  const cacheEntry = {
    cacheKey,
    productId,
    productName: normalizedName,
    results,
    totalHits: Number(response.data?.totalHits ?? results.length),
    expiresAt,
  };

  try {
    await cacheModel.findOneAndUpdate(
      { cacheKey },
      { $set: cacheEntry },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (cause) {
    if (cause.code !== 11000) throw cause;
    const concurrentCacheEntry = await cacheModel.findOne({
      cacheKey,
      expiresAt: { $gt: now },
    }).lean();
    if (!concurrentCacheEntry) throw cause;
    return {
      productName: concurrentCacheEntry.productName,
      results: concurrentCacheEntry.results.map(publicCandidate),
      totalHits: concurrentCacheEntry.totalHits,
      cached: true,
      expiresAt: concurrentCacheEntry.expiresAt,
    };
  }

  return {
    productName: normalizedName,
    results: results.map(publicCandidate),
    totalHits: cacheEntry.totalHits,
    cached: false,
    expiresAt,
  };
};

export const getCachedPixabayProductImage = async (
  productId,
  productName,
  candidateId,
  { cacheModel = pixabayImageSearchCacheModel, now = new Date() } = {}
) => {
  const cache = await cacheModel.findOne({
    cacheKey: makeCacheKey(productId, productName),
    expiresAt: { $gt: now },
  }).lean();

  return cache?.results.find((result) => String(result.id) === String(candidateId)) ?? null;
};

const getImageType = (buffer) => {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/)) return "image/gif";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
};

export const downloadApprovedPixabayImage = async (result) => {
  const imageUrl = result?.largeImageURL || result?.webformatURL;
  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    throw new Error("Cached Pixabay image URL is invalid");
  }
  if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".pixabay.com")) {
    throw new Error("Cached image URL is not hosted by Pixabay");
  }

  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 20000,
    maxContentLength: 15 * 1024 * 1024,
    maxBodyLength: 15 * 1024 * 1024,
  });
  const buffer = Buffer.from(response.data);
  const mimetype = getImageType(buffer);
  if (!mimetype || !buffer.length || buffer.length > 15 * 1024 * 1024) {
    throw new Error("Pixabay returned unsupported or oversized image content");
  }

  return {
    buffer,
    mimetype,
    size: buffer.length,
    originalname: `pixabay-image.${mimetype.split("/")[1]}`,
    sourceUrl: result.pageURL,
    tags: result.tags,
    contributor: result.user,
  };
};

export default {
  searchPixabayProductImages,
  getCachedPixabayProductImage,
  downloadApprovedPixabayImage,
};
