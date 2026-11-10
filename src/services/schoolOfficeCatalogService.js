import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";
// import { schoolOfficeCatalog } from "../data/schoolOfficeCatalog.js";
import { createCategory } from "./categoryService.js";

const categoryForServiceType = (serviceType) => (
  serviceType === "hardware" ? "hardware" : "schoolmatetial"
);

const normalizeName = (name) => name
  .normalize("NFKC")
  .toLocaleLowerCase("en")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim()
  .replace(/\s+/g, " ");

const productKey = (product) => (
  `${categoryForServiceType(product.serviceType)}:${normalizeName(product.name)}`
);

const existingProducts = async () => {
  const categories = await categoryModel
    .find({ category: { $in: ["schoolmatetial", "hardware"] } })
    .select("_id category")
    .lean();
  const categoryIds = categories.map(({ _id }) => _id);
  const query = [
    { serviceType: { $in: ["stationery", "book", "hardware"] } },
    ...(categoryIds.length ? [{ category: { $in: categoryIds } }] : []),
  ];

  return productModel
    .find({ $or: query })
    .select("name serviceType category")
    .populate("category", "category")
    .lean();
};

const starterDescription = (name) => (
  `${name} for school or office use. Starter catalog description; administrators can edit this product information.`
);

const errorMessage = (error) => (
  error instanceof Error ? error.message : String(error)
);

const createCatalogProduct = async (entry) => {
  const categoryName = categoryForServiceType(entry.serviceType);
  let category = await categoryModel.findOne({ category: categoryName });
  if (!category) category = await createCategory(categoryName);

  return productModel.create({
    name: entry.name,
    description: starterDescription(entry.name),
    price: entry.price,
    stock: entry.stock,
    serviceType: entry.serviceType,
    category: category._id,
    publicationStatus: "published",
    images: [],
  });
};

export const importSchoolOfficeCatalog = async ({
  catalog = schoolOfficeCatalog,
  findExistingProducts = existingProducts,
  createProduct: saveProduct = createCatalogProduct,
} = {}) => {
  const summary = { created: [], skipped: [], failed: [] };
  const knownProducts = await findExistingProducts();
  const existingKeys = new Set(knownProducts.map((product) => {
    const categoryName = product.category?.category;
    const serviceType = categoryName === "hardware"
      ? "hardware"
      : categoryName === "schoolmatetial"
        ? "stationery"
        : product.serviceType || "stationery";
    return productKey({ name: product.name, serviceType });
  }));
  for (const entry of catalog) {
    const key = productKey(entry);
    if (existingKeys.has(key)) {
      summary.skipped.push({ name: entry.name, reason: "A product with this name and category already exists" });
      continue;
    }

    try {
      const product = await saveProduct({
        ...entry,
        description: starterDescription(entry.name),
        publicationStatus: "published",
        images: [],
      });

      existingKeys.add(key);
      summary.created.push({ name: entry.name, id: product?._id?.toString?.() || null });
    } catch (error) {
      summary.failed.push({ name: entry.name, error: errorMessage(error) });
    }
  }

  return summary;
};

export default importSchoolOfficeCatalog;
