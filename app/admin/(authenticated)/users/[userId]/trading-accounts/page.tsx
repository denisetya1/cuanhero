import AdminUserTradingAccountsPage from "../../../../components/AdminUserTradingAccountsPage";

export default async function UserTradingAccountsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <AdminUserTradingAccountsPage userId={userId} />;
}
