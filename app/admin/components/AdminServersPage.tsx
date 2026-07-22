"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Server,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AdminServerPayload,
  useCheckAdminServerHealth,
  useCreateAdminServer,
  useDeleteAdminServer,
  useGetAdminServers,
  useUpdateAdminServer,
} from "@/hooks/useAdminServers";
import AdminTablePagination, {
  DEFAULT_TABLE_PAGE_SIZE,
} from "./AdminTablePagination";
import { useAdminAccess } from "./AdminAccessContext";

type ServerItem = {
  id: number;
  name?: string | null;
  ipAddress: string;
  domain?: string | null;
  status: number;
  maxAccounts: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count: {
    tradingAccounts: number;
  };
};

const adminInputClass =
  "h-9 border-slate-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-blue-300 focus-visible:ring-blue-100";

const adminSelectTriggerClass =
  "h-9 w-full rounded-md border-slate-200 bg-white text-sm text-gray-900 shadow-none focus-visible:border-blue-300 focus-visible:ring-3 focus-visible:ring-blue-100";

const adminSelectContentClass =
  "z-[80] rounded-md border-slate-200 bg-white text-gray-900 shadow-lg [&_[data-slot=select-scroll-down-button]]:bg-white [&_[data-slot=select-scroll-down-button]]:text-slate-400 [&_[data-slot=select-scroll-up-button]]:bg-white [&_[data-slot=select-scroll-up-button]]:text-slate-400";

const adminSelectItemClass =
  "rounded-md text-gray-700 focus:!bg-blue-50 focus:!text-blue-700 focus:[&_*]:!text-blue-700 data-[highlighted]:!bg-blue-50 data-[highlighted]:!text-blue-700 data-[highlighted]:[&_*]:!text-blue-700 data-[state=checked]:!bg-blue-50 data-[state=checked]:!text-blue-700 data-[state=checked]:[&_*]:!text-blue-700 [&_svg]:!text-blue-600";

const serverSchema = z.object({
  name: z.string().trim().min(1, "Server name is required."),
  ipAddress: z.string().trim().min(1, "IP address is required."),
  status: z.enum(["0", "1"]),
  maxAccounts: z
    .string()
    .trim()
    .min(1, "Max accounts is required.")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
      {
        message: "Max accounts must be at least 1.",
      },
    ),
});

type ServerFormValues = z.infer<typeof serverSchema>;

const serverDefaultValues: ServerFormValues = {
  name: "",
  ipAddress: "",
  status: "1",
  maxAccounts: "4",
};

const formatDate = (value: string | Date) => {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getStatusMeta = (status: number) => {
  if (status === 1) {
    return {
      label: "Active",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: "Inactive",
    className: "border-red-200 bg-red-50 text-red-700",
  };
};

export default function AdminServersPage() {
  const { isSuperAdmin } = useAdminAccess();
  const queryClient = useQueryClient();
  const { data: serversResponse, error, isError, isLoading } =
    useGetAdminServers();
  const createServer = useCreateAdminServer();
  const updateServer = useUpdateAdminServer();
  const deleteServer = useDeleteAdminServer();
  const checkServerHealth = useCheckAdminServerHealth();
  const [search, setSearch] = useState("");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formMessage, setFormMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [checkingServerId, setCheckingServerId] = useState<number | null>(null);
  const createServerForm = useForm<ServerFormValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: serverDefaultValues,
  });
  const editServerForm = useForm<ServerFormValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: serverDefaultValues,
  });

  const servers: ServerItem[] = serversResponse?.data || [];
  const filteredServers = servers.filter((server) => {
    const keyword = search.toLowerCase();

    return (
      (server.name || "").toLowerCase().includes(keyword) ||
      server.ipAddress.toLowerCase().includes(keyword) ||
      (server.domain || "").toLowerCase().includes(keyword) ||
      getStatusMeta(server.status).label.toLowerCase().includes(keyword)
    );
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredServers.length / DEFAULT_TABLE_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedServers = filteredServers.slice(
    (safeCurrentPage - 1) * DEFAULT_TABLE_PAGE_SIZE,
    safeCurrentPage * DEFAULT_TABLE_PAGE_SIZE,
  );

  const handleOpenCreateDialog = () => {
    setFormMessage("");
    createServerForm.reset(serverDefaultValues);
    setOpenCreateDialog(true);
  };

  const handleCreateDialogChange = (open: boolean) => {
    setOpenCreateDialog(open);

    if (!open) {
      setFormMessage("");
      createServerForm.reset(serverDefaultValues);
    }
  };

  const handleOpenEditDialog = (server: ServerItem) => {
    setSelectedServer(server);
    setFormMessage("");
    editServerForm.reset({
      name: server.name || "",
      ipAddress: server.ipAddress,
      status: server.status === 1 ? "1" : "0",
      maxAccounts: String(server.maxAccounts),
    });
    setOpenEditDialog(true);
  };

  const handleEditDialogChange = (open: boolean) => {
    setOpenEditDialog(open);

    if (!open) {
      setSelectedServer(null);
      setFormMessage("");
      editServerForm.reset(serverDefaultValues);
    }
  };

  const handleOpenDeleteDialog = (server: ServerItem) => {
    setSelectedServer(server);
    setDeleteMessage("");
    setOpenDeleteDialog(true);
  };

  const handleCheckServerHealth = async (server: ServerItem) => {
    setCheckingServerId(server.id);

    try {
      const response = await checkServerHealth.mutateAsync(server.id);
      const latencyMs = response?.data?.latencyMs;
      const runtime = response?.data?.runtime;
      const activeBots = runtime?.active;
      const totalBots = runtime?.total;
      const botSummary =
        typeof activeBots === "number" && typeof totalBots === "number"
          ? ` · ${activeBots}/${totalBots} bot active`
          : "";
      toast.success(
        `${server.name || `Server #${server.id}`} online${typeof latencyMs === "number" ? ` (${latencyMs} ms)` : ""}${botSummary}.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `${server.name || `Server #${server.id}`} offline.`,
      );
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["admin-servers"] });
      setCheckingServerId(null);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setOpenDeleteDialog(open);

    if (!open) {
      setSelectedServer(null);
      setDeleteMessage("");
    }
  };

  const handleCreateServer = async (values: ServerFormValues) => {
    setFormMessage("");

    const payload: AdminServerPayload = {
      name: values.name.trim(),
      ipAddress: values.ipAddress.trim(),
      status: Number(values.status),
      maxAccounts: Number(values.maxAccounts),
    };

    try {
      await createServer.mutateAsync(payload);
      handleCreateDialogChange(false);
      toast.success("Server created successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-servers"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-trading-account-options"],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create server.";
      setFormMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleUpdateServer = async (values: ServerFormValues) => {
    setFormMessage("");

    if (!selectedServer) {
      setFormMessage("No server selected.");
      return;
    }

    try {
      await updateServer.mutateAsync({
        serverId: selectedServer.id,
        name: values.name.trim(),
        ipAddress: values.ipAddress.trim(),
        status: Number(values.status),
        maxAccounts: Number(values.maxAccounts),
      });
      handleEditDialogChange(false);
      toast.success("Server updated successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-servers"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-trading-account-options"],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update server.";
      setFormMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeleteServer = async () => {
    setDeleteMessage("");

    if (!selectedServer) {
      setDeleteMessage("No server selected.");
      return;
    }

    try {
      await deleteServer.mutateAsync(selectedServer.id);
      handleDeleteDialogChange(false);
      toast.success("Server deleted successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-servers"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-trading-account-options"],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete server.";
      setDeleteMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const renderServerFormFields = (
    form: typeof createServerForm | typeof editServerForm,
  ) => (
    <div className="space-y-5">
      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">Name</span>
        <Input
          {...form.register("name")}
          placeholder="VPS server name"
          className={adminInputClass}
        />
        {form.formState.errors.name && (
          <span className="text-xs text-red-600">
            {form.formState.errors.name.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">IP Address</span>
        <Input
          {...form.register("ipAddress")}
          placeholder="192.168.1.10"
          className={adminInputClass}
        />
        {form.formState.errors.ipAddress && (
          <span className="text-xs text-red-600">
            {form.formState.errors.ipAddress.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">Max Accounts</span>
        <Input
          type="number"
          min="1"
          step="1"
          {...form.register("maxAccounts")}
          placeholder="4"
          className={adminInputClass}
        />
        {form.formState.errors.maxAccounts && (
          <span className="text-xs text-red-600">
            {form.formState.errors.maxAccounts.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">Status</span>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className={adminSelectTriggerClass}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className={adminSelectContentClass}>
                <SelectItem value="1" className={adminSelectItemClass}>
                  Active
                </SelectItem>
                <SelectItem value="0" className={adminSelectItemClass}>
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.status && (
          <span className="text-xs text-red-600">
            {form.formState.errors.status.message}
          </span>
        )}
      </label>
    </div>
  );

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/50 p-2">
      <section className="overflow-hidden rounded-md border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-slate-50/40 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                VPS Server List
              </p>
              <h1 className="text-sm font-bold text-gray-900">Servers</h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search servers..."
                className={`${adminInputClass} pl-9 text-xs`}
              />
            </div>
            <Button
              type="button"
              onClick={handleOpenCreateDialog}
              disabled={!isSuperAdmin}
              className="h-8 gap-2 bg-blue-600 px-4 text-xs text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Server
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-slate-50/30 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-24 px-5 py-3 font-semibold">No</th>
                <th className="px-5 py-3 font-semibold">Server</th>
                <th className="px-5 py-3 font-semibold">Domain / IP</th>
                <th className="px-5 py-3 font-semibold">Trading Accounts</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/70">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    Loading servers...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-red-500"
                  >
                    {error instanceof Error
                      ? error.message
                      : "Failed to load servers."}
                  </td>
                </tr>
              ) : filteredServers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    No servers found.
                  </td>
                </tr>
              ) : (
                paginatedServers.map((server, index) => (
                  <tr key={server.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold text-gray-600">
                      {(safeCurrentPage - 1) * DEFAULT_TABLE_PAGE_SIZE +
                        index +
                        1}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {server.name || `Server #${server.id}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        Server #{server.id}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-700">
                      <p>{server.domain || "No domain"}</p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        {server.ipAddress}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {server._count.tradingAccounts} / {server.maxAccounts}{" "}
                      accounts
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {formatDate(server.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          getStatusMeta(server.status).className
                        }`}
                      >
                        {getStatusMeta(server.status).label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          asChild
                          type="button"
                          variant="outline"
                          title="View trading accounts on this server"
                          className="h-7 gap-1 rounded-md border-slate-200 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <Link
                            href={`/admin/trading-accounts?serverId=${server.id}`}
                          >
                            <ListFilter className="h-3.5 w-3.5" />
                            View Accounts
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Check pySync server health"
                          onClick={() => handleCheckServerHealth(server)}
                          disabled={checkingServerId !== null}
                          className="h-7 gap-1 rounded-md border-emerald-200 bg-white px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          {checkingServerId === server.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Stethoscope className="h-3.5 w-3.5" />
                          )}
                          Check Health
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Edit server"
                          onClick={() => handleOpenEditDialog(server)}
                          disabled={!isSuperAdmin}
                          className="h-7 gap-1 rounded-md border-blue-200 bg-white px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Delete server"
                          onClick={() => handleOpenDeleteDialog(server)}
                          disabled={!isSuperAdmin}
                          className="h-7 gap-1 rounded-md border-red-200 bg-white px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminTablePagination
          currentPage={safeCurrentPage}
          totalItems={filteredServers.length}
          onPageChange={setCurrentPage}
        />
      </section>

      <Dialog open={openCreateDialog} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Add Server</DialogTitle>
            <DialogDescription>
              Create a VPS server that can host trading accounts.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={createServerForm.handleSubmit(handleCreateServer)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {formMessage && (
                <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formMessage}
                </div>
              )}
              {renderServerFormFields(createServerForm)}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCreateDialogChange(false)}
                className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createServer.isPending ||
                  createServerForm.formState.isSubmitting
                }
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {createServer.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {createServer.isPending ? "Saving..." : "Add Server"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditDialog} onOpenChange={handleEditDialogChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Edit Server</DialogTitle>
            <DialogDescription>
              Update VPS server details and status.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editServerForm.handleSubmit(handleUpdateServer)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {formMessage && (
                <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formMessage}
                </div>
              )}
              {renderServerFormFields(editServerForm)}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleEditDialogChange(false)}
                className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  updateServer.isPending ||
                  editServerForm.formState.isSubmitting
                }
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {updateServer.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {updateServer.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteDialog} onOpenChange={handleDeleteDialogChange}>
        <DialogContent className="rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-md">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Delete Server</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-5">
            {deleteMessage && (
              <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteMessage}
              </div>
            )}

            <p className="text-sm text-gray-600">
              Delete{" "}
              <span className="font-semibold text-gray-900">
                {selectedServer?.name || "this server"}
              </span>
              ? Servers that are already used by trading accounts cannot be
              deleted.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteDialogChange(false)}
              className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleteServer.isPending}
              onClick={handleDeleteServer}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteServer.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {deleteServer.isPending ? "Deleting..." : "Delete Server"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
