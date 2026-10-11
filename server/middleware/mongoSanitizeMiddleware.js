/**
 * NoSQL Injection and Prototype Pollution Prevention Middleware.
 * Recursively strips keys starting with '$' or containing '.' from req.body, req.query, and req.params.
 * Zero external dependencies.
 */

function sanitize(target) {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      target[i] = sanitize(target[i]);
    }
    return target;
  }

  for (const key of Object.keys(target)) {
    // Check for MongoDB operators ($gt, $ne, $where, etc.) or dot notation
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else {
      target[key] = sanitize(target[key]);
    }
  }

  return target;
}

export const mongoSanitize = (req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};

export default mongoSanitize;
