import "dotenv/config";
import mongoose from "mongoose";
import { DBconnection } from "../src/config/dbConnection.js";
import { schoolOfficeCatalog } from "../src/data/schoolOfficeCatalog.js";
import { importSchoolOfficeCatalog } from "../src/services/schoolOfficeCatalogService.js";

const run = async () => {
  await DBconnection();

  let summary;
  try {
    summary = await importSchoolOfficeCatalog();
  } finally {
    await mongoose.disconnect();
  }

  console.log(`School and office catalog import complete (${schoolOfficeCatalog.length} entries; no image search or download):`);
  console.log(`Created: ${summary.created.length}; skipped: ${summary.skipped.length}; failed: ${summary.failed.length}`);
  for (const product of summary.created) console.log(`CREATED ${product.name}`);
  for (const product of summary.skipped) console.log(`SKIPPED ${product.name}: ${product.reason}`);
  for (const product of summary.failed) console.error(`FAILED ${product.name}: ${product.error}`);
  if (summary.failed.length) process.exitCode = 1;
};

run().catch((error) => {
  console.error(`School and office catalog import failed: ${error.message}`);
  process.exitCode = 1;
});
