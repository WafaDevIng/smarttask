/**
 * Simple in-memory rate limiter.
 * For production, use express-rate-limit with Redis store.
 */
const rateLimitMap = new Map();

/**
 * Creates a rate limiter middleware.
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Window in milliseconds
 */
const createRateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    const record = rateLimitMap.get(key);

    if (now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        message: 'Too many requests. Please try again later.',
        retryAfter
      });
    }

    next();
  };
};

// Presets
const globalLimiter = createRateLimiter(200, 15 * 60 * 1000);   // 200 req/15min
const authLimiter   = createRateLimiter(10,  15 * 60 * 1000);   // 10 req/15min (login/register)
const apiLimiter    = createRateLimiter(100, 60 * 1000);         // 100 req/min

module.exports = { createRateLimiter, globalLimiter, authLimiter, apiLimiter };
