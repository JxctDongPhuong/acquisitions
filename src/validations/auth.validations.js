import { z } from 'zod';

export const validation = {
  signUp: z.object({
    body: z.object({
      name: z
        .string()
        .min(3, 'Name must be at least 3 characters long')
        .max(255, 'Name must be at most 255 characters long'),
      email: z.string().email('Email must be a valid email address'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(255, 'Password must be at most 255 characters long'),
      role: z.enum(['user', 'admin', 'manager']).default('user'),
    }),
  }),

  signIn: z.object({
    body: z.object({
      email: z.string().email('Email must be a valid email address'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(255, 'Password must be at most 255 characters long'),
    }),
  }),

  signOut: z.object({
    // No body required — sign-out is handled via cookie token
    body: z.object({}).optional(),
  }),
};
