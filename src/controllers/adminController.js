import { searchCatalogImages } from "../services/imageSearchService.js";

export const searchImagesController = async (req, res) => {
  try {
    const candidates = await searchCatalogImages(String(req.query.q || ""), String(req.query.type || ""));
    return res.status(200).send({
      success: true,
      message: "Image candidates fetched. Review and select an image before saving.",
      candidates,
    });
  } catch (error) {
    if (error.statusCode === 503) {
      return res.status(503).send({ success: false, message: error.message });
    }
    console.error("Catalog image lookup failed:", error.response?.status || error.message);
    return res.status(error.statusCode || 502).send({
      success: false,
      message: error.statusCode ? error.message : "Image provider lookup failed",
    });
  }
};
