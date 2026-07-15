import AuthPageShell from "@/components/auth/AuthPageShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

type PageProps = {
  searchParams: Promise<{ error?: string; token?: string }>;
};

export default async function MemberResetPasswordPage({ searchParams }: PageProps) {
  const { error, token } = await searchParams;

  return (
    <AuthPageShell>
      <ResetPasswordForm
        loginHref="/member/login"
        token={token}
        tokenError={error}
      />
    </AuthPageShell>
  );
}
