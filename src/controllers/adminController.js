import { searchCatalogImages } from "../services/imageSearchService.js";
import * as productService from "../services/productService.js";
import { searchPixabayProductImages } from "../services/pixabayImageService.js";

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

export const searchProductPixabayImagesController = async (req, res) => {
  try {
    const product = await productService.getSingleProduct(req.params.id, true);
    if (!product) {
      return res.status(404).send({ success: false, message: "Product not found" });
    }

    const search = await searchPixabayProductImages(product._id, product.name);
    return res.status(200).send({
      success: true,
      product: { id: product._id, name: product.name },
      ...search,
    });
  } catch (error) {
    if (error.statusCode === 503) {
      return res.status(503).send({ success: false, message: error.message });
    }
    console.error("Product Pixabay image search failed:", error.statusCode || error.message);
    return res.status(error.statusCode || 502).send({
      success: false,
      message: error.statusCode ? error.message : "Pixabay image search failed",
    });
  }
};

export const approveProductPixabayImageController = async (req, res) => {
  try {
    const product = await productService.approvePixabayProductImage(
      req.params.id,
      req.body?.candidateId
    );
    return res.status(200).send({
      success: true,
      message: "Pixabay image approved and stored",
      product,
      imageUrl: product.image_url,
    });
  } catch (error) {
    console.error("Product Pixabay image approval failed:", error.statusCode || error.message);
    return res.status(error.statusCode || 502).send({
      success: false,
      message: error.statusCode ? error.message : "Unable to store approved Pixabay image",
    });
  }
};
