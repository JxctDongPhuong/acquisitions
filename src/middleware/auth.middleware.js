import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';
import logger from '#config/logger.js';

/**
 * Middleware: requireAuth
 * Validates the JWT token from the cookie and attaches the decoded user to req.user.
 * Returns 401 if missing or invalid, 403 if expired.
 */
export const requireAuth = (req, res, next) => {
  try {
    const token = cookies.get(req, 'token');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwttoken.verify(token);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (e) {
    logger.error('Auth middleware error', e);

    // TokenExpiredError from jsonwebtoken
    if (e.cause?.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired, please sign in again' });
    }

    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Middleware: requireRole
 * Restricts access to users with a specific role.
 * Must be used AFTER requireAuth.
 *
 * @param {...string} roles - Allowed roles e.g. requireRole('admin', 'manager')
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    next();
  };
};
