// index.js
import app from "../app.js";
import "dotenv/config"
import { DBconnection } from "./config/dbConnection.js";

DBconnection();
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

export default app