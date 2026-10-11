// In-memory sliding window rate limiter
const ipRequests = new Map();

/**
 * Clean up entries older than the window period every 5 minutes
 */
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipRequests.entries()) {
    if (now - record.startTime > record.windowMs * 2) {
      ipRequests.delete(key);
    }
  }
}, 300000);
if (cleanupTimer.unref) cleanupTimer.unref();

export const _resetRateLimits = () => ipRequests.clear();

/**
 * Creates a rate limiting middleware function.
 * @param {number} maxRequests - Max requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} message - Error message when rate limit is exceeded
 */
export const rateLimit = ({
  maxRequests = 20,
  windowMs = 5 * 60 * 1000,
  message = 'Too many attempts from this IP, please try again later.',
} = {}) => {
  return (req, res, next) => {
    // In test environment, do not enforce rate limits
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const endpoint = (req.baseUrl || '') + (req.path || '');
    const key = `${endpoint || req.originalUrl || 'api'}:${ip}`;
    const now = Date.now();

    const record = ipRequests.get(key);

    if (!record || now - record.startTime > windowMs) {
      ipRequests.set(key, {
        startTime: now,
        count: 1,
        windowMs,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    }

    record.count += 1;
    next();
  };
};
