import "dotenv/config";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DBconnection } from "../src/config/dbConnection.js";
import { schoolOfficeCatalog } from "../src/data/schoolOfficeCatalog.js";
import productModel from "../src/models/productModel.js";

export const runSchoolOfficeImageBackfill = async () => {
  await DBconnection();

  try {
    const names = schoolOfficeCatalog.map(({ name }) => name);
    const products = await productModel
      .find({ name: { $in: names } })
      .select("name image_url images")
      .lean();
    const productsWithImages = products.filter((product) =>
      Boolean(product.image_url || product.images?.some((image) => image?.url))
    );
    const awaitingApproval = products.filter((product) =>
      !product.image_url && !product.images?.some((image) => image?.url)
    );
    const missingRecords = schoolOfficeCatalog.length - products.length;

    console.log(
      `School and office image status: catalog ${schoolOfficeCatalog.length}; ` +
      `database matches ${products.length}; products with image fields ${productsWithImages.length}; ` +
      `awaiting admin image approval ${awaitingApproval.length}; missing product records ${missingRecords}.`
    );
    for (const product of awaitingApproval) console.log(`AWAITING APPROVAL ${product.name}`);
    return {
      catalogProducts: schoolOfficeCatalog.length,
      matchedProducts: products.length,
      productsWithImages: productsWithImages.length,
      awaitingApproval: awaitingApproval.length,
      missingRecords,
    };
  } finally {
    await mongoose.disconnect();
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runSchoolOfficeImageBackfill().catch((error) => {
    console.error(`School and office image status could not be read: ${error.message}`);
    process.exitCode = 1;
  });
}
