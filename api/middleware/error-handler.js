/**
 * Global Error Handler Middleware
 * Catches and formats all errors consistently
 */

export const errorHandler = (error, req, res, next) => {
  const status = error.status || error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  console.error(`[${req.id}] Error: ${status} - ${message}`, error);

  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(status).json({
    error: {
      status,
      message,
      ...(isDevelopment && { details: error.stack }),
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
};
