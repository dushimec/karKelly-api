import path from 'path';
import url from 'url';

import express from "express";
import morgan from "morgan";
import cors from "cors";
import "dotenv/config";
import { errorHandler, notFound } from "./src/helpers/error-handler.js";
import requestRateLimitConfig from "./src/config/rateLimit.js";
import { DBconnection } from "./src/config/dbConnection.js";
import cloudinary from "cloudinary";
import usersRoutes from "./src/routes/userRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import categorieRoutes from "./src/routes/categoryRoutes.js";
import orderRoute from "./src/routes/orderRoutes.js";
import cookieParser from "cookie-parser";
import timeout from "connect-timeout";

// Derive __dirname from import.meta.url
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT;

DBconnection();

app.use(
  cors({
    credentials: true,
  })
);
app.use(timeout("10s"));
app.use(haltOnTimedout);
app.options("*", cors());
app.use(morgan("tiny"));
app.use(requestRateLimitConfig);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

function haltOnTimedout(req, res, next) {
  if (!req.timedout) next();
}

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use("/public/uploads", express.static(path.join(__dirname, "public/uploads")));


const api = process.env.API_URL;
app.get("/",(req,res)=>{
  res.send("Server is runing")
})
app.use(`${api}/users`, usersRoutes);
app.use(`${api}/products`, productRoutes);
app.use(`${api}/category`, categorieRoutes);
app.use(`${api}/orders`, orderRoute);

app.use(notFound);
app.use(errorHandler);



app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
});
