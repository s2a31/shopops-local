"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ApiError, apiFetch } from "@/lib/api-client";

import { loginSchema, type LoginInput } from "@/features/auth/schemas";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (input) => {
    try {
      await apiFetch("/api/auth/login", { method: "POST", body: input });
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
      setError("root", { message });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2"
          {...register("email")}
        />
        {errors.email && (
          <p id="login-email-error" className="text-sm text-red-700">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2"
          {...register("password")}
        />
        {errors.password && (
          <p id="login-password-error" className="text-sm text-red-700">
            {errors.password.message}
          </p>
        )}
      </div>

      <div aria-live="polite">
        {errors.root && <p className="text-sm text-red-700">{errors.root.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
