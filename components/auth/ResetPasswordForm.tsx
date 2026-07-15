"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

type ResetPasswordFormProps = {
  loginHref: string;
  token?: string;
  tokenError?: string;
};

export default function ResetPasswordForm({
  loginHref,
  token,
  tokenError,
}: ResetPasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const invalidToken = !token || tokenError === "INVALID_TOKEN";

  const submit = async ({ password }: Values) => {
    if (!token) return;
    setError("");
    setLoading(true);

    await authClient.resetPassword({
      newPassword: password,
      token,
      fetchOptions: {
        onError: () => {
          setError("This reset link is invalid, expired, or has already been used.");
          setLoading(false);
        },
        onSuccess: () => {
          setSuccess(true);
          setLoading(false);
        },
      },
    });
  };

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Password updated</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Your password has been changed. Please sign in again with the new
            password.
          </p>
        </div>
        <Button asChild className="h-11 w-full bg-cyan-600 text-white hover:bg-cyan-500">
          <Link href={loginHref}>Continue to login</Link>
        </Button>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-300/30 bg-red-400/10 text-red-300">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Invalid reset link</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This link is invalid or has expired. Request a new password reset
            link from the login page.
          </p>
        </div>
        <Button asChild variant="outline" className="h-11 w-full border-cyan-400/30 bg-transparent text-cyan-100 hover:bg-cyan-400/10">
          <Link href={loginHref}>Back to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <div>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300">
          <KeyRound className="h-5 w-5" />
        </div>
        <h1 className="mt-3 text-2xl font-bold text-white">Set new password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Choose a strong password with at least 8 characters.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">New password</span>
          <Input type="password" autoComplete="new-password" {...register("password")} className="h-11 border-cyan-400/20 bg-black/35 text-cyan-50 focus-visible:border-cyan-300 focus-visible:ring-cyan-400/30" />
          {errors.password && <span className="text-xs text-red-300">{errors.password.message}</span>}
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Confirm new password</span>
          <Input type="password" autoComplete="new-password" {...register("confirmPassword")} className="h-11 border-cyan-400/20 bg-black/35 text-cyan-50 focus-visible:border-cyan-300 focus-visible:ring-cyan-400/30" />
          {errors.confirmPassword && <span className="text-xs text-red-300">{errors.confirmPassword.message}</span>}
        </label>
      </div>

      <Button type="submit" disabled={loading} className="h-11 w-full bg-cyan-600 text-white hover:bg-cyan-500">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
