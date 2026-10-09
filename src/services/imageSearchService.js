import axios from "axios";

const googleBooksApi = "https://www.googleapis.com/books/v1/volumes";
const googleCustomSearchApi = "https://www.googleapis.com/customsearch/v1";

export const searchBookImages = async (query) => {
  const params = { q: query, maxResults: 10, printType: "books" };
  if (process.env.GOOGLE_BOOKS_API_KEY) params.key = process.env.GOOGLE_BOOKS_API_KEY;
  const response = await axios.get(googleBooksApi, { params, timeout: 8000 });
  return (response.data.items || []).map(({ volumeInfo = {} }) => {
    const thumbnail = volumeInfo.imageLinks?.thumbnail?.replace(/^http:/, "https:");
    return {
      title: volumeInfo.title || "",
      authors: volumeInfo.authors || [],
      isbn: (volumeInfo.industryIdentifiers || []).map((identifier) => ({
        type: identifier.type,
        value: identifier.identifier,
      })),
      thumbnail: thumbnail || null,
      source: "Google Books",
      sourceUrl: volumeInfo.infoLink || null,
      attribution: volumeInfo.publisher || "Google Books",
    };
  });
};

export const searchStationeryImages = async (query) => {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !searchEngineId) {
    const error = new Error("Stationery image search is not configured");
    error.statusCode = 503;
    throw error;
  }

  const response = await axios.get(googleCustomSearchApi, {
    params: {
      key: apiKey,
      cx: searchEngineId,
      q: query,
      searchType: "image",
      num: 10,
      safe: "active",
    },
    timeout: 8000,
  });
  return (response.data.items || []).map((item) => ({
    title: item.title || "",
    thumbnail: item.link || null,
    source: "Google Custom Search",
    sourceUrl: item.image?.contextLink || item.displayLink || null,
    attribution: item.displayLink || "",
  }));
};

export const searchCatalogImages = async (query, type) => {
  if (typeof query !== "string" || query.trim().length < 2 || query.trim().length > 120) {
    const error = new Error("Search query must be between 2 and 120 characters");
    error.statusCode = 400;
    throw error;
  }
  if (!["book", "image"].includes(type)) {
    const error = new Error('Search type must be "book" or "image"');
    error.statusCode = 400;
    throw error;
  }
  return type === "book"
    ? searchBookImages(query.trim())
    : searchStationeryImages(query.trim());
};
