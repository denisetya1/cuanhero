"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Full name is required."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
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
          window.location.href = "/member/home";
        },
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit(handleRegister)}
      className="flex flex-col gap-3 max-w-sm mx-auto p-6 bg-slate-900 rounded-xl text-white"
    >
      <h3 className="text-xl font-bold">Create Member Account</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <input
        type="text"
        placeholder="Full Name"
        {...register("name")}
        className="p-2 rounded bg-slate-800 text-white focus:outline-blue-500"
      />
      {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
      <input
        type="email"
        placeholder="Email"
        {...register("email")}
        className="p-2 rounded bg-slate-800 text-white focus:outline-blue-500"
      />
      {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
      <input
        type="password"
        placeholder="Password"
        {...register("password")}
        className="p-2 rounded bg-slate-800 text-white focus:outline-blue-500"
      />
      {errors.password && (
        <p className="text-red-400 text-xs">{errors.password.message}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-green-600 hover:bg-green-500 py-2 rounded font-semibold disabled:opacity-50"
      >
        {loading ? "Registering..." : "Sign Up"}
      </button>
    </form>
  );
}
