import AuthPageShell from "@/components/auth/AuthPageShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function MemberForgotPasswordPage() {
  return (
    <AuthPageShell>
      <ForgotPasswordForm
        loginHref="/member/login"
        resetPath="/member/reset-password"
      />
    </AuthPageShell>
  );
}
