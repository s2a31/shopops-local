import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Enter a valid email address." }))
  .pipe(z.string().max(254, "Email address is too long."));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(100, "Password must be at most 100 characters long.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, "Enter your name.").max(100, "Name is too long."),
});

export const loginSchema = z.object({
  email: emailSchema,
  // Login must not reveal password rules — any non-empty string is attempted.
  password: z.string().min(1, "Enter your password."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
