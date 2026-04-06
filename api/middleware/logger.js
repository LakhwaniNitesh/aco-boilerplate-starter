/**
 * Request Logger Middleware
 */

export const logger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.id}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
};
