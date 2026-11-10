export const normalizeApiPrefix = (prefix) => {
  const normalized = `/${String(prefix || "").split("/").filter(Boolean).join("/")}`;
  return normalized === "/" ? "/api/v1" : normalized;
};
