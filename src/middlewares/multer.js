import multer from "multer";

const storage = multer.memoryStorage();
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      const error = new Error("Only JPEG, PNG, WebP, or GIF images are allowed");
      error.statusCode = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

const handleUpload = (middleware) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError || error.statusCode === 400) {
      return res.status(400).send({ success: false, message: error.message });
    }
    console.error("Product image upload middleware failed:", error.message);
    return res.status(500).send({ success: false, message: "Image upload failed" });
  });
};

export const singleUpload = handleUpload(upload.single("file"));
export const multipleUpload = handleUpload(upload.array("files", 20));
