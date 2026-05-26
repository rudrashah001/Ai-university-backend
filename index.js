import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import chatsRoutes from "./routes/chats.js";
import adminRoutes from "./routes/admin.js";

import { connectToDatabase } from "./lib/db.js";
import { seedSitWebsiteIfEmpty } from "./lib/seed-sit.js";

const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const FRONTEND_URL =
  "https://ai-university-frontend-j4qjv6rny-rudrashah001s-projects.vercel.app";
const allowedOrigins = [CLIENT_URL, FRONTEND_URL];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("CORS policy: origin not allowed"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/chats", chatsRoutes);
app.use("/api/admin", adminRoutes);

async function startServer() {
  try {
    await connectToDatabase();

    app.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      await seedSitWebsiteIfEmpty();
    });
  } catch (error) {
    console.error(error);
  }
}

startServer();
