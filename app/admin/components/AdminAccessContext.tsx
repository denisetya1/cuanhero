"use client";

import { createContext, useContext, type ReactNode } from "react";

type AdminAccessContextValue = {
  role: string;
  isSuperAdmin: boolean;
};

const AdminAccessContext = createContext<AdminAccessContextValue>({
  role: "ADMIN",
  isSuperAdmin: false,
});

export function AdminAccessProvider({
  children,
  role,
}: {
  children: ReactNode;
  role?: string | null;
}) {
  const normalizedRole = role || "ADMIN";

  return (
    <AdminAccessContext.Provider
      value={{
        role: normalizedRole,
        isSuperAdmin: normalizedRole === "SUPER_ADMIN",
      }}
    >
      {children}
    </AdminAccessContext.Provider>
  );
}

export const useAdminAccess = () => useContext(AdminAccessContext);
