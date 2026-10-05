import logger from '#config/logger.js';
import { validation } from '#validations/auth.validations.js';
import { formatvalidaionsError } from '#utils/format.js';
import { createUser, signIn as signInService } from '#services/authen.service.js';
import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';

/**
 * POST /api/auth/sign-up
 * Register a new user account
 */
export const signUp = async (req, res, next) => {
  try {
    const validationResult = validation.signUp.safeParse({ body: req.body });

    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: formatvalidaionsError(validationResult.error),
      });
    }

    const { name, email, password, role } = validationResult.data.body;
    const user = await createUser({ name, email, password, role });

    const token = jwttoken.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set(res, 'token', token);
    logger.info(`User registered: ${email}`);

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    logger.error('Sign up error', e);

    if (
      e.message === 'User already exists' ||
      e.message === 'User with this email already exists'
    ) {
      return res.status(409).json({ message: 'User already exists' });
    }

    next(e);
  }
};

/**
 * POST /api/auth/sign-in
 * Authenticate an existing user and issue a JWT cookie
 */
export const signIn = async (req, res, next) => {
  try {
    const validationResult = validation.signIn.safeParse({ body: req.body });

    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: formatvalidaionsError(validationResult.error),
      });
    }

    const { email, password } = validationResult.data.body;
    const user = await signInService({ email, password });

    const token = jwttoken.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set(res, 'token', token);
    logger.info(`User signed in: ${email}`);

    return res.status(200).json({
      message: 'Signed in successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    logger.error('Sign in error', e);

    if (e.message === 'Invalid credentials') {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    next(e);
  }
};

/**
 * POST /api/auth/sign-out
 * Clear the JWT cookie to end the session
 */
export const signOut = async (req, res, next) => {
  try {
    cookies.clear(res, 'token');
    logger.info(`User signed out: ${req.user?.email ?? 'unknown'}`);

    return res.status(200).json({ message: 'Signed out successfully' });
  } catch (e) {
    logger.error('Sign out error', e);
    next(e);
  }
};

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile (requires auth middleware)
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    message: 'Authenticated',
    user: req.user,
  });
};
