import "./compat/node-buffer.js";
import app from "../app.js";
import "dotenv/config"
import { DBconnection } from "./config/dbConnection.js";
import { startOrderJobs } from "./services/orderService.js";

const PORT = process.env.PORT || 8010;

const connectWithRetry = async () => {
  let attempt = 0;

  while (true) {
    try {
      await DBconnection();
      return;
    } catch (error) {
      attempt += 1;
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 30000);
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `Database connection attempt ${attempt} failed: ${message}. Retrying in ${Math.round(delayMs / 1000)} seconds.`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

const startServer = async () => {
  try {
    await connectWithRetry();
    startOrderJobs();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    server.on("error", (error) => {
      console.error("HTTP server failed to start:", error);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    process.exitCode = 1;
  }
};

void startServer();

export default app;