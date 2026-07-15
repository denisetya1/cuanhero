import AuthPageShell from "@/components/auth/AuthPageShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

type PageProps = {
  searchParams: Promise<{ error?: string; token?: string }>;
};

export default async function AdminResetPasswordPage({ searchParams }: PageProps) {
  const { error, token } = await searchParams;

  return (
    <AuthPageShell>
      <ResetPasswordForm
        loginHref="/admin/login"
        token={token}
        tokenError={error}
      />
    </AuthPageShell>
  );
}
