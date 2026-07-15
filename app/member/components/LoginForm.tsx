"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Radar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (values: LoginFormValues) => {
    setError("");

    await authClient.signIn.email({
      email: values.email,
      password: values.password,
      fetchOptions: {
        onRequest: () => setLoading(true),
        onError: (ctx) => {
          setError(ctx.error.message || "Incorrect email or password.");
          setLoading(false);
        },
        onSuccess: () => {
          window.location.href = "/member/home";
        },
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(handleLogin)} className="space-y-5">
      <div className="space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_rgba(0,217,255,0.2)]">
          <Radar className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">
            Member Area
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">Member Login</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Monitor your trading accounts, EA status, and CuanHero bot
            configuration from one control center.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Email</span>
          <Input
            type="email"
            placeholder="email@domain.com"
            {...register("email")}
            className="h-11 border-cyan-400/20 bg-black/35 text-cyan-50 shadow-inner shadow-cyan-950/40 placeholder:text-slate-500 focus-visible:border-cyan-300 focus-visible:ring-cyan-400/30"
          />
          {errors.email && (
            <span className="text-xs text-red-300">
              {errors.email.message}
            </span>
          )}
        </label>

        <div>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Password</span>
            <Input
              type="password"
              placeholder="Enter your password"
              {...register("password")}
              className="h-11 border-cyan-400/20 bg-black/35 text-cyan-50 shadow-inner shadow-cyan-950/40 placeholder:text-slate-500 focus-visible:border-cyan-300 focus-visible:ring-cyan-400/30"
            />
            {errors.password && (
              <span className="text-xs text-red-300">
                {errors.password.message}
              </span>
            )}
          </label>
          <div className="mt-3 flex justify-end">
            <Link
              href="/member/forgot-password"
              className="text-xs text-cyan-300 hover:text-cyan-200"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full border border-cyan-300/60 bg-cyan-600 text-white shadow-[0_0_24px_rgba(0,217,255,0.22)] hover:bg-cyan-500"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Verifying..." : "Member Login"}
      </Button>

      <p className="hidden text-center text-xs text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/member/register" className="text-cyan-300 hover:text-cyan-200">
          Register now
        </Link>
      </p>
    </form>
  );
}
