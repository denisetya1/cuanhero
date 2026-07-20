"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { sanitizeMemberRedirect } from "@/lib/member-redirect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Full name is required."),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm({ redirectTo }: { redirectTo?: string }) {
  const safeRedirectTo = sanitizeMemberRedirect(redirectTo);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleRegister = async (values: RegisterFormValues) => {
    setError("");
    setLoading(true);

    await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      fetchOptions: {
        onRequest: () => setLoading(true),
        onError: (ctx) => {
          setError(ctx.error.message || "Registration failed.");
          setLoading(false);
        },
        onSuccess: () => {
          window.location.href = safeRedirectTo;
        },
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit(handleRegister)}
      className="space-y-5 text-white"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            Member Registration
          </p>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-400">
        Register your CuanHero member account to continue this order and manage
        your EA after activation.
      </p>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Full Name</span>
          <Input
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            {...register("name")}
            className="h-11 border-cyan-400/20 bg-black/35 text-cyan-50 placeholder:text-slate-500 focus-visible:border-cyan-300 focus-visible:ring-cyan-400/30"
          />
          {errors.name && (
            <span className="text-xs text-red-300">{errors.name.message}</span>
          )}
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Email</span>
          <Input
            type="email"
            autoComplete="email"
            placeholder="email@domain.com"
            {...register("email")}
            className="h-11 border-cyan-400/20 bg-black/35 text-cyan-50 placeholder:text-slate-500 focus-visible:border-cyan-300 focus-visible:ring-cyan-400/30"
          />
          {errors.email && (
            <span className="text-xs text-red-300">{errors.email.message}</span>
          )}
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Password</span>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            {...register("password")}
            className="h-11 border-cyan-400/20 bg-black/35 text-cyan-50 placeholder:text-slate-500 focus-visible:border-cyan-300 focus-visible:ring-cyan-400/30"
          />
          {errors.password && (
            <span className="text-xs text-red-300">
              {errors.password.message}
            </span>
          )}
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Confirm Password</span>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Enter your password again"
            {...register("confirmPassword")}
            className="h-11 border-cyan-400/20 bg-black/35 text-cyan-50 placeholder:text-slate-500 focus-visible:border-cyan-300 focus-visible:ring-cyan-400/30"
          />
          {errors.confirmPassword && (
            <span className="text-xs text-red-300">
              {errors.confirmPassword.message}
            </span>
          )}
        </label>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-12 w-full bg-cyan-500 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Creating account..." : "Register & Continue"}
      </Button>
    </form>
  );
}
