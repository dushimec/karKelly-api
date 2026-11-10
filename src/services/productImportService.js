import ExcelJS from "exceljs";
import { ProductValidationError } from "./productService.js";

const MAX_PRODUCTS_PER_IMPORT = 100;
const MAX_SPREADSHEET_COLUMNS = 20;
const REQUIRED_HEADERS = ["name", "price", "stock"];
const HEADER_ALIASES = new Map([
  ["product", "name"],
  ["product name", "name"],
  ["item", "name"],
  ["item name", "name"],
  ["unit price", "price"],
  ["in stock", "stock"],
  ["quantity", "stock"],
  ["qty", "stock"],
  ["service type", "serviceType"],
  ["type", "serviceType"],
  ["product category", "category"],
  ["image url", "imageUrl"],
  ["product image url", "imageUrl"],
  ["image", "imageUrl"],
]);

const normalizeHeader = (value) => String(value ?? "")
  .trim()
  .toLocaleLowerCase("en")
  .replace(/[_-]+/g, " ")
  .replace(/\s+/g, " ");

const fieldForHeader = (header) => {
  const normalized = normalizeHeader(header);
  if (["name", "price", "stock", "description", "category"].includes(normalized)) {
    return normalized;
  }
  return HEADER_ALIASES.get(normalized);
};

const cellText = (cell) => {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) throw new Error("Formula cells are not supported");
    if ("hyperlink" in value) return String(value.hyperlink || value.text || "").trim();
    if ("richText" in value) return value.richText.map(({ text }) => text).join("").trim();
    if ("text" in value) return String(value.text).trim();
    return "";
  }
  return String(value).trim();
};

const normalizePrice = (value) => {
  const number = typeof value === "number"
    ? value
    : Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const normalizeStock = (value) => {
  const number = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  return Number.isInteger(number) && number >= 0 ? number : null;
};

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeServiceType = (value, category) => {
  const serviceType = String(value || "").trim().toLocaleLowerCase("en");
  if (serviceType) return serviceType;
  if (category === "hardware") return "hardware";
  if (category === "book") return "book";
  return "stationery";
};

const normalizeCategory = (value, serviceType) => {
  const category = String(value || "").trim().toLocaleLowerCase("en");
  if (!category) return serviceType === "hardware" ? "hardware" : "schoolmatetial";
  if (["hardware", "office technology"].includes(category)) return "hardware";
  if (["schoolmatetial", "schoolmaterial", "school supplies", "stationery", "book"].includes(category)) {
    return "schoolmatetial";
  }
  return null;
};

const isEmptyRow = (row) => row.values.slice(1).every((value) =>
  value === null || value === undefined || String(value).trim() === ""
);

export const parseProductImportSpreadsheet = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ProductValidationError([{ field: "file", message: "Upload a non-empty .xlsx workbook" }]);
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ProductValidationError([{ field: "file", message: "The uploaded file is not a valid .xlsx workbook" }]);
  }
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new ProductValidationError([{ field: "file", message: "The workbook has no worksheet" }]);
  }
  if (worksheet.columnCount > MAX_SPREADSHEET_COLUMNS) {
    throw new ProductValidationError([{
      field: "file",
      message: `The first worksheet must have no more than ${MAX_SPREADSHEET_COLUMNS} columns`,
    }]);
  }

  const headers = new Map();
  try {
    worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
      const field = fieldForHeader(cellText(cell));
      if (!field) return;
      if (headers.has(field)) {
        throw new ProductValidationError([{
          field: "file",
          message: `The worksheet contains more than one column for "${field}"`,
        }]);
      }
      headers.set(field, column);
    });
  } catch (error) {
    if (error instanceof ProductValidationError) throw error;
    throw new ProductValidationError([{ field: "file", message: error.message }]);
  }

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.has(header));
  if (missingHeaders.length) {
    throw new ProductValidationError([{
      field: "file",
      message: `Required columns are missing: ${missingHeaders.join(", ")}`,
    }]);
  }

  const rows = [];
  const errors = [];
  const seenProducts = new Map();
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (isEmptyRow(row)) continue;
    if (rows.length >= MAX_PRODUCTS_PER_IMPORT) {
      throw new ProductValidationError([{
        field: "file",
        message: `An import may contain at most ${MAX_PRODUCTS_PER_IMPORT} non-empty product rows`,
      }]);
    }

    let raw = {};
    try {
      for (const [field, column] of headers) raw[field] = cellText(row.getCell(column));
    } catch (error) {
      const rowError = { rowNumber, field: "row", message: error.message };
      errors.push(rowError);
      rows.push({ rowNumber, validationErrors: [{ field: rowError.field, message: rowError.message }] });
      continue;
    }

    const rowErrors = [];
    const name = raw.name.trim();
    if (!name || name.length > 200) {
      rowErrors.push({ rowNumber, field: "name", message: "Name is required and must be at most 200 characters" });
    }

    const price = normalizePrice(raw.price);
    if (price === null) rowErrors.push({ rowNumber, field: "price", message: "Price must be a non-negative number" });

    const stock = normalizeStock(raw.stock);
    if (stock === null) rowErrors.push({ rowNumber, field: "stock", message: "In stock must be a non-negative whole number" });

    const imageUrl = raw.imageUrl?.trim() || "";
    if (imageUrl && !isHttpsUrl(imageUrl)) {
      rowErrors.push({ rowNumber, field: "imageUrl", message: "Image URL must be a valid HTTPS URL" });
    }

    const serviceType = normalizeServiceType(raw.serviceType, raw.category);
    if (!["stationery", "hardware", "book"].includes(serviceType)) {
      rowErrors.push({ rowNumber, field: "serviceType", message: "Service type must be stationery, hardware, or book" });
    }
    const category = normalizeCategory(raw.category, serviceType);
    if (!category) {
      rowErrors.push({ rowNumber, field: "category", message: "Category must be school stationery or hardware" });
    }

    const key = `${category}:${name.toLocaleLowerCase("en")}`;
    if (name && category && seenProducts.has(key)) {
      rowErrors.push({
        rowNumber,
        field: "name",
        message: `This duplicates the product on row ${seenProducts.get(key)}`,
      });
    } else if (name && category) {
      seenProducts.set(key, rowNumber);
    }

    errors.push(...rowErrors);
    rows.push({
      rowNumber,
      name,
      description: raw.description?.trim() || (name ? `${name} for school or office use.` : ""),
      price,
      stock,
      serviceType,
      category,
      imageUrl,
      ...(rowErrors.length && {
        validationErrors: rowErrors.map(({ field, message }) => ({ field, message })),
      }),
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    throw new ProductValidationError([{ field: "file", message: "The worksheet contains no product rows" }]);
  }

  return {
    valid: errors.length === 0,
    totalRows: rows.length,
    products: rows,
    errors,
    canSubmit: rows.length > 0 && errors.length === 0,
  };
};

export default parseProductImportSpreadsheet;
