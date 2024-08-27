import express from "express";
import morgan from "morgan";
import cors from "cors";
import "dotenv/config";
import { errorHandler, notFound } from "./src/helpers/error-handler";
import requestRateLimitConfig from "./src/config/rateLimit";
import { DBconnection } from "./src/config/dbConnection";
import cloudinary from "cloudinary";
import usersRoutes from "./src/routes/userRoutes";
import productRoutes from "./src/routes/productRoutes";
import categorieRoutes from "./src/routes/categoryRoutes";
import orderRoute from "./src/routes/orderRoutes";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT;

DBconnection();

app.use(
  cors({
    credentials: true,
  })
);
app.options("*", cors());
app.use(morgan("tiny"));
app.use(requestRateLimitConfig);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SCRET,
});

app.use("/public/uploads", express.static(__dirname + "/public/uploads"));

const api = process.env.API_URL;

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
