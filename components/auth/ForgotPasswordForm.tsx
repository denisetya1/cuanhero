"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.email("Enter a valid email address."),
});

type Values = z.infer<typeof schema>;

type ForgotPasswordFormProps = {
  loginHref: string;
  resetPath: string;
};

export default function ForgotPasswordForm({
  loginHref,
  resetPath,
}: ForgotPasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const submit = async ({ email }: Values) => {
    setError("");
    setLoading(true);

    await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}${resetPath}`,
      fetchOptions: {
        onError: () => {
          setError("We could not process the request. Please try again later.");
          setLoading(false);
        },
        onSuccess: () => {
          setSubmitted(true);
          setLoading(false);
        },
      },
    });
  };

  if (submitted) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 text-emerald-300">
          <MailCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            If an account exists for that email, we have sent a password reset
            link. The link is valid for 1 hour.
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
      <div className="space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="mt-1 text-2xl font-bold text-white">Forgot password?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Enter your account email and we will send you a secure reset link.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

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

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full border border-cyan-300/60 bg-cyan-600 text-white hover:bg-cyan-500"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Sending..." : "Send reset link"}
      </Button>

      <Link
        href={loginHref}
        className="flex items-center justify-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
      >
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>
    </form>
  );
}
