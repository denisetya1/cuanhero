import {
  BarChart3,
  CircleDollarSign,
  Clock3,
  Infinity,
  Users,
  UserPlus,
  WalletCards,
} from "lucide-react";
import prisma from "@/lib/prisma";
import AdminDailyRevenueChart from "../components/AdminDailyRevenueChart";
import AdminNewMembersChart from "../components/AdminNewMembersChart";

type CurrencyCode = "IDR" | "USD" | "MYR" | "SGD";

type MoneyMap = Record<CurrencyCode, number>;

const currencyCodes: CurrencyCode[] = ["IDR", "USD", "MYR", "SGD"];

const createMoneyMap = (): MoneyMap => ({
  IDR: 0,
  USD: 0,
  MYR: 0,
  SGD: 0,
});

const getCurrency = (currency?: string | null): CurrencyCode => {
  return currencyCodes.includes(currency as CurrencyCode)
    ? (currency as CurrencyCode)
    : "IDR";
};

const normalizeMonthlyAmount = (amount: number, recurringType?: string) => {
  if (recurringType === "24h") {
    return amount * 30;
  }

  if (recurringType === "7d") {
    return (amount * 30) / 7;
  }

  if (recurringType === "30d") {
    return amount;
  }

  return 0;
};

const formatMoney = (amount: number, currency: CurrencyCode) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(amount);
};

const formatMoneyMap = (moneyMap: MoneyMap) => {
  const values = currencyCodes
    .filter((currency) => moneyMap[currency] > 0)
    .map((currency) => formatMoney(moneyMap[currency], currency));

  return values.length ? values.join(" / ") : "0";
};

const getJakartaTodayRange = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const start = new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) -
      7 * 60 * 60 * 1000,
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
};

const getJakartaDateKey = (value: Date) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
};

const getJakartaDateLabel = (value: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
  }).format(value);
};

const getNewMembersChartData = async (todayStart: Date, todayEnd: Date) => {
  const firstDayStart = new Date(
    todayStart.getTime() - 29 * 24 * 60 * 60 * 1000,
  );
  const members = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      createdAt: {
        gte: firstDayStart,
        lt: todayEnd,
      },
    },
    select: {
      createdAt: true,
    },
  });
  const countMap = members.reduce<Map<string, number>>((map, member) => {
    const key = getJakartaDateKey(member.createdAt);
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(
      firstDayStart.getTime() + index * 24 * 60 * 60 * 1000,
    );
    const key = getJakartaDateKey(date);

    return {
      date: key,
      label: getJakartaDateLabel(date),
      members: countMap.get(key) || 0,
    };
  });
};

const getDailyRevenueChartData = async (todayStart: Date, todayEnd: Date) => {
  const firstDayStart = new Date(
    todayStart.getTime() - 29 * 24 * 60 * 60 * 1000,
  );
  const paymentRecords = await prisma.paymentRecord.findMany({
    where: {
      status: "APPROVED",
      approvedAt: {
        gte: firstDayStart,
        lt: todayEnd,
      },
    },
    select: {
      amount: true,
      currency: true,
      approvedAt: true,
    },
  });
  const revenueMap = paymentRecords.reduce<Map<string, MoneyMap>>(
    (map, paymentRecord) => {
      if (!paymentRecord.approvedAt) {
        return map;
      }

      const key = getJakartaDateKey(paymentRecord.approvedAt);
      const moneyMap = map.get(key) || createMoneyMap();
      const currency = getCurrency(paymentRecord.currency);

      moneyMap[currency] += Number(paymentRecord.amount || 0);
      map.set(key, moneyMap);
      return map;
    },
    new Map(),
  );

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(
      firstDayStart.getTime() + index * 24 * 60 * 60 * 1000,
    );
    const key = getJakartaDateKey(date);
    const moneyMap = revenueMap.get(key) || createMoneyMap();

    return {
      date: key,
      label: getJakartaDateLabel(date),
      ...moneyMap,
    };
  });
};

const summaryCards = [
  {
    key: "totalMembers",
    label: "Total Members",
    description: "Registered member accounts",
    icon: Users,
  },
  {
    key: "membersJoinedToday",
    label: "Joined Today",
    description: "Members created today",
    icon: UserPlus,
  },
  {
    key: "activeTradingAccounts",
    label: "Active Trading Accounts",
    description: "Trading accounts with active status",
    icon: WalletCards,
  },
] as const;

const mrrCards = [
  {
    key: "estimatedMrr",
    label: "Estimated MRR",
    description: "Active recurring licenses normalized to a monthly estimate",
    icon: CircleDollarSign,
  },
  {
    key: "activeRecurringAccounts",
    label: "Recurring Accounts",
    description: "Active accounts with 24h, 7d, or 30d recurring type",
    icon: BarChart3,
  },
  {
    key: "dailyProjection",
    label: "Short-term Projection",
    description: "24h and 7d licenses normalized to 30 days",
    icon: Clock3,
  },
  {
    key: "lifetimeRevenue",
    label: "Lifetime Revenue",
    description: "Active lifetime licenses excluded from MRR",
    icon: Infinity,
  },
] as const;

export default async function AdminDashboardPage() {
  const { start, end } = getJakartaTodayRange();
  const [
    totalMembers,
    membersJoinedToday,
    activeTradingAccounts,
    newMembersChartData,
    dailyRevenueChartData,
    activeAccountsForMrr,
  ] =
    await Promise.all([
      prisma.user.count({
        where: {
          role: "MEMBER",
        },
      }),
      prisma.user.count({
        where: {
          role: "MEMBER",
          createdAt: {
            gte: start,
            lt: end,
          },
        },
      }),
      prisma.tradingAccount.count({
        where: {
          status: 1,
        },
      }),
      getNewMembersChartData(start, end),
      getDailyRevenueChartData(start, end),
      prisma.tradingAccount.findMany({
        where: {
          status: 1,
        },
        select: {
          id: true,
          recurringPrice: true,
          currency: true,
          package: {
            select: {
              id: true,
              name: true,
              recurringType: true,
            },
          },
          expertAdvisor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);
  const summary = {
    totalMembers,
    membersJoinedToday,
    activeTradingAccounts,
  };
  const estimatedMrr = createMoneyMap();
  const dailyProjection = createMoneyMap();
  const lifetimeRevenue = createMoneyMap();
  const packageBreakdown = new Map<
    number,
    {
      name: string;
      accounts: number;
      mrr: MoneyMap;
    }
  >();
  const eaBreakdown = new Map<
    number,
    {
      name: string;
      accounts: number;
      mrr: MoneyMap;
    }
  >();
  let activeRecurringAccounts = 0;

  activeAccountsForMrr.forEach((account) => {
    const amount = Number(account.recurringPrice || 0);
    const currency = getCurrency(account.currency);
    const recurringType = account.package?.recurringType;
    const monthlyAmount = normalizeMonthlyAmount(amount, recurringType);
    const packageId = account.package?.id || 0;
    const eaId = account.expertAdvisor?.id || 0;

    if (monthlyAmount > 0) {
      activeRecurringAccounts += 1;
      estimatedMrr[currency] += monthlyAmount;

      if (recurringType === "24h" || recurringType === "7d") {
        dailyProjection[currency] += monthlyAmount;
      }
    }

    if (recurringType === "lifetime") {
      lifetimeRevenue[currency] += amount;
    }

    if (!packageBreakdown.has(packageId)) {
      packageBreakdown.set(packageId, {
        name: account.package?.name || "Unassigned Package",
        accounts: 0,
        mrr: createMoneyMap(),
      });
    }

    if (!eaBreakdown.has(eaId)) {
      eaBreakdown.set(eaId, {
        name: account.expertAdvisor?.name || "Unassigned EA",
        accounts: 0,
        mrr: createMoneyMap(),
      });
    }

    const packageItem = packageBreakdown.get(packageId);
    const eaItem = eaBreakdown.get(eaId);

    if (packageItem) {
      packageItem.accounts += 1;
      packageItem.mrr[currency] += monthlyAmount;
    }

    if (eaItem) {
      eaItem.accounts += 1;
      eaItem.mrr[currency] += monthlyAmount;
    }
  });

  const mrrSummary = {
    estimatedMrr: formatMoneyMap(estimatedMrr),
    activeRecurringAccounts: activeRecurringAccounts.toLocaleString("en-US"),
    dailyProjection: formatMoneyMap(dailyProjection),
    lifetimeRevenue: formatMoneyMap(lifetimeRevenue),
  };
  const packageRows = Array.from(packageBreakdown.values()).sort(
    (a, b) => b.accounts - a.accounts,
  );
  const eaRows = Array.from(eaBreakdown.values()).sort(
    (a, b) => b.accounts - a.accounts,
  );

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
            Admin Console
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            Admin Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            The CuanHero admin area is ready for managing members, packages,
            transactions, EAs, and servers.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.key}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950">
                      {summary[card.key].toLocaleString("en-US")}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <AdminNewMembersChart data={newMembersChartData} className="" />
          <AdminDailyRevenueChart data={dailyRevenueChartData} />
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
                Revenue
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Estimated MRR Report
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Calculated from active trading accounts. Lifetime licenses are
              excluded from MRR, while 24h and 7d licenses are normalized to
              30 days.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {mrrCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.key}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-400">
                        {card.label}
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-950">
                        {mrrSummary[card.key]}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h3 className="text-sm font-bold text-slate-950">
                  MRR by Package
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Package</th>
                    <th className="px-5 py-3 font-semibold">Accounts</th>
                    <th className="px-5 py-3 font-semibold">MRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {packageRows.length ? (
                    packageRows.map((row) => (
                      <tr key={row.name}>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {row.name}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {row.accounts}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatMoneyMap(row.mrr)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-8 text-center text-slate-400"
                      >
                        No active revenue data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h3 className="text-sm font-bold text-slate-950">
                  MRR by Expert Advisor
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">EA</th>
                    <th className="px-5 py-3 font-semibold">Accounts</th>
                    <th className="px-5 py-3 font-semibold">MRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eaRows.length ? (
                    eaRows.map((row) => (
                      <tr key={row.name}>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {row.name}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {row.accounts}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatMoneyMap(row.mrr)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-8 text-center text-slate-400"
                      >
                        No active revenue data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
