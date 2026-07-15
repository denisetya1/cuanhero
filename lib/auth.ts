// lib/auth.ts
import { betterAuth } from "better-auth";
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
