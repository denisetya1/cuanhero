import AdminTradingAccountsPage from "../../components/AdminTradingAccountsPage";

export default async function TradingAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ serverId?: string }>;
}) {
  const { serverId } = await searchParams;
  const initialServerId =
    serverId && /^\d+$/.test(serverId) ? serverId : "all";

  return <AdminTradingAccountsPage initialServerId={initialServerId} />;
}
