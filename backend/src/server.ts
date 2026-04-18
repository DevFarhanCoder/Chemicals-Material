import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Import routes
import materialsRouter from "./routes/materials";
import scrapingRouter from "./routes/scraping";
import statsRouter from "./routes/stats";

// Import logger
import logger from "./config/logger";

// Load environment variables
dotenv.config();

// Create Express app
const app: Express = express();
const PORT = process.env.PORT || 5000;

// CRITICAL for Render/Heroku/any reverse-proxy deployment:
// Without this, ALL users share the proxy's IP and hit the rate limit together.
app.set("trust proxy", 1);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  "http://localhost:3000",
  "https://chemicals-material.vercel.app",
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
// General API limiter — generous since this is an admin-only dashboard.
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || "900000"), // 15 min
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || "1000"),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate-limiting for health checks
  skip: (req) => req.path === "/health",
});

// Scraping limiter — stricter, scraping jobs are expensive
const scrapingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many scraping requests. Please wait before triggering again.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);
app.use("/api/scraping/trigger", scrapingLimiter);

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/materials", materialsRouter);
app.use("/api/scraping", scrapingRouter);
app.use("/api/stats", statsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

interface ErrorWithStatus extends Error {
  status?: number;
}

app.use(
  (err: ErrorWithStatus, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Unhandled error:", err);

    const status = err.status || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({
      error: {
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      },
    });
  },
);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI environment variable is not set");

    await mongoose.connect(mongoUri);
    logger.info("MongoDB connected successfully");

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  await mongoose.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down...");
  await mongoose.disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;
