import z from "zod"

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type loginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(1, "Name is reuired"),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type signupFormData = z.infer<typeof signupSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type resetPasswordFormData = z.infer<typeof resetPasswordSchema>;
