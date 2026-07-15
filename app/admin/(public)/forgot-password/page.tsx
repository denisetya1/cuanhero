import AuthPageShell from "@/components/auth/AuthPageShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function AdminForgotPasswordPage() {
  return (
    <AuthPageShell>
      <ForgotPasswordForm
        loginHref="/admin/login"
        resetPath="/admin/reset-password"
      />
    </AuthPageShell>
  );
}
