import logger from '#config/logger.js';
import bcrypt from 'bcrypt';
import { db } from '#config/database.js';
import { user } from '#models/user.models.js';
import { eq } from 'drizzle-orm';

// Hash password
export const HashingPassword = async (password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    return hashedPassword;
  } catch (error) {
    logger.error('Hashing password error', error);
    throw error;
  }
};

export const createUser = async ({ name, email, password, role }) => {
  try {
    const existsUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (existsUser.length > 0) {
      throw new Error('User already exists');
    }
    const hashedPassword = await HashingPassword(password);
    const [newUser] = await db
      .insert(user)
      .values({
        name,
        email,
        password: hashedPassword,
        role,
      })
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    logger.info('User created successfully', newUser);
    return newUser;
  } catch (error) {
    logger.error('Create user error', error);
    throw error;
  }
};

export const findUserByEmail = async (email) => {
  try {
    const [found] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    return found || null;
  } catch (error) {
    logger.error('Find user by email error', error);
    throw error;
  }
};

export const signIn = async ({ email, password }) => {
  try {
    const found = await findUserByEmail(email);
    if (!found) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, found.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    return {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
    };
  } catch (error) {
    logger.error('Sign in error', error);
    throw error;
  }
};
