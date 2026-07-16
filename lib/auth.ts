// lib/auth.ts
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql", // Memastikan adapter membaca dialek MySQL
  }),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ user, url }) =>
      sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: url,
      }),
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== "/sign-in/email") return;

      const email =
        typeof context.body?.email === "string"
          ? context.body.email.trim()
          : "";

      if (!email) return;

      const user = await prisma.user.findUnique({
        where: { email },
        select: { status: true },
      });

      if (user && user.status !== 1) {
        throw APIError.from("FORBIDDEN", {
          code: "USER_INACTIVE",
          message: "This user account is inactive.",
        });
      }
    }),
  },
  user: {
    additionalFields: {
      password: {
        type: "string",
        required: false, // buat false agar tidak bentrok saat registrasi awal
      },
    },
  },
  // Tambahkan baris ini jika kamu menggunakan domain custom atau proxy lokal
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});
