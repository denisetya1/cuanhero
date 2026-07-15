"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AdminUserPayload,
  type AdminUpdateUserPayload,
  useCreateAdminUser,
  useDeleteAdminUser,
  useGetAdminUsers,
  useUpdateAdminUser,
} from "@/hooks/useAdminUsers";
import AdminTablePagination, {
  DEFAULT_TABLE_PAGE_SIZE,
} from "./AdminTablePagination";
import { useAdminAccess } from "./AdminAccessContext";

type UserItem = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  role: string;
  status: number;
  createdAt: string | Date;
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

const userRoleSchema = z.enum(["MEMBER", "ADMIN", "SUPER_ADMIN"]);
const userStatusSchema = z.enum(["1", "0"]);
const userRoleOptions = ["MEMBER", "ADMIN", "SUPER_ADMIN"] as const;

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.email("Please enter a valid email address."),
  phoneNumber: z.string().trim().optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: userRoleSchema,
  status: userStatusSchema,
});

const editUserSchema = createUserSchema.omit({ password: true });

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

const createUserDefaultValues: CreateUserFormValues = {
  name: "",
  email: "",
  phoneNumber: "",
  password: "",
  role: "MEMBER",
  status: "1",
};

const editUserDefaultValues: EditUserFormValues = {
  name: "",
  email: "",
  phoneNumber: "",
  role: "MEMBER",
  status: "1",
};

export default function AdminUsersPage() {
  const { isSuperAdmin } = useAdminAccess();
  const queryClient = useQueryClient();
  const {
    data: usersResponse,
    error: usersError,
    isError,
    isLoading,
  } = useGetAdminUsers();
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [pendingStatusUser, setPendingStatusUser] = useState<UserItem | null>(
    null,
  );
  const [pendingStatusChecked, setPendingStatusChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [tableMessage, setTableMessage] = useState("");
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const createUserForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: createUserDefaultValues,
  });
  const editUserForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: editUserDefaultValues,
  });

  const users: UserItem[] = usersResponse?.data || [];
  const filteredUsers = users.filter((user) => {
    const keyword = search.toLowerCase();
    return (
      user.name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      user.role.toLowerCase().includes(keyword)
    );
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / DEFAULT_TABLE_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * DEFAULT_TABLE_PAGE_SIZE,
    safeCurrentPage * DEFAULT_TABLE_PAGE_SIZE,
  );

  const handleCreateUser = async (values: CreateUserFormValues) => {
    setMessage("");

    const payload: AdminUserPayload = {
      name: values.name,
      email: values.email,
      password: values.password,
      phoneNumber: values.phoneNumber || "",
      role: values.role,
      status: Number(values.status),
    };

    try {
      await createUser.mutateAsync(payload);
      createUserForm.reset(createUserDefaultValues);
      setOpenCreateDialog(false);
      toast.success("User created successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleOpenEditDialog = (user: UserItem) => {
    setSelectedUser(user);
    setMessage("");
    editUserForm.reset({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      role:
        user.role === "SUPER_ADMIN"
          ? "SUPER_ADMIN"
          : user.role === "ADMIN"
            ? "ADMIN"
            : "MEMBER",
      status: user.status === 1 ? "1" : "0",
    });
    setOpenEditDialog(true);
  };

  const handleEditDialogChange = (open: boolean) => {
    setOpenEditDialog(open);

    if (!open) {
      setSelectedUser(null);
      setMessage("");
      editUserForm.reset(editUserDefaultValues);
    }
  };

  const handleOpenDeleteDialog = (user: UserItem) => {
    setSelectedUser(user);
    setDeleteMessage("");
    setOpenDeleteDialog(true);
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setOpenDeleteDialog(open);

    if (!open) {
      setSelectedUser(null);
      setDeleteMessage("");
    }
  };

  const handleUpdateUser = async (values: EditUserFormValues) => {
    setMessage("");

    if (!selectedUser) {
      setMessage("No user selected.");
      return;
    }

    const payload: AdminUpdateUserPayload = {
      userId: selectedUser.id,
      name: values.name,
      email: values.email,
      phoneNumber: values.phoneNumber || "",
      role: values.role,
      status: Number(values.status),
    };

    try {
      await updateUser.mutateAsync(payload);
      handleEditDialogChange(false);
      toast.success("User updated successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update user.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeleteUser = async () => {
    setDeleteMessage("");

    if (!selectedUser) {
      setDeleteMessage("No user selected.");
      return;
    }

    try {
      await deleteUser.mutateAsync(selectedUser.id);
      handleDeleteDialogChange(false);
      toast.success("User deleted successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete user.";
      setDeleteMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleOpenStatusDialog = (user: UserItem, checked: boolean) => {
    setPendingStatusUser(user);
    setPendingStatusChecked(checked);
    setTableMessage("");
    setOpenStatusDialog(true);
  };

  const handleStatusDialogChange = (open: boolean) => {
    setOpenStatusDialog(open);

    if (!open) {
      setPendingStatusUser(null);
    }
  };

  const handleConfirmUserStatus = async () => {
    setTableMessage("");

    if (!pendingStatusUser) {
      return;
    }

    setStatusUpdatingUserId(pendingStatusUser.id);

    try {
      await updateUser.mutateAsync({
        userId: pendingStatusUser.id,
        name: pendingStatusUser.name,
        email: pendingStatusUser.email,
        phoneNumber: pendingStatusUser.phoneNumber || "",
        role: pendingStatusUser.role,
        status: pendingStatusChecked ? 1 : 0,
      });
      toast.success(
        pendingStatusChecked
          ? "User activated successfully."
          : "User deactivated successfully.",
      );
      handleStatusDialogChange(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update user status.";
      setTableMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setStatusUpdatingUserId("");
    }
  };

  return (
    <div className="p-2 space-y-6 bg-slate-50/50 min-h-screen">
      <section className="bg-white border border-gray-100 rounded-md shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 bg-slate-50/40 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                User List
              </p>
              <h1 className="text-sm font-bold text-gray-900">
                Users
              </h1>
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
                placeholder="Search users..."
                className={`${adminInputClass} pl-9 text-xs`}
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                setMessage("");
                createUserForm.reset(createUserDefaultValues);
                setOpenCreateDialog(true);
              }}
              className="h-8 gap-2 bg-blue-600 px-4 text-xs text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        {tableMessage && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
            {tableMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-slate-50/30 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-20 px-5 py-3 font-semibold">No</th>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Trading Account</th>
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
                    Loading users...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-red-500"
                  >
                    {usersError instanceof Error
                      ? usersError.message
                      : "Failed to load users."}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, index) => (
                  <tr key={user.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold text-gray-600">
                      {(safeCurrentPage - 1) * DEFAULT_TABLE_PAGE_SIZE +
                        index +
                        1}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      {user.phoneNumber && (
                        <p className="text-xs text-gray-400">
                          {user.phoneNumber}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {user._count.tradingAccounts} accounts
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Intl.DateTimeFormat("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(user.createdAt))}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.status === 1}
                          disabled={
                            statusUpdatingUserId === user.id ||
                            (!isSuperAdmin && user.role === "SUPER_ADMIN")
                          }
                          onCheckedChange={(checked) =>
                            handleOpenStatusDialog(user, checked)
                          }
                          aria-label={`Set ${user.name} status`}
                        />
                        <span className="text-xs font-medium text-gray-500">
                          {user.status === 1 ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          asChild
                          variant="outline"
                          title="View trading accounts"
                          className="h-7 gap-1 rounded-md border-gray-200 bg-white px-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-700"
                        >
                          <Link
                            href={`/admin/users/${user.id}/trading-accounts`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Edit user"
                          onClick={() => handleOpenEditDialog(user)}
                          disabled={!isSuperAdmin && user.role === "SUPER_ADMIN"}
                          className="h-7 gap-1 rounded-md border-blue-200 bg-white px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Delete user"
                          onClick={() => handleOpenDeleteDialog(user)}
                          disabled={!isSuperAdmin && user.role === "SUPER_ADMIN"}
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
          totalItems={filteredUsers.length}
          onPageChange={setCurrentPage}
        />
      </section>

      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new admin or member account for CuanHero.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={createUserForm.handleSubmit(handleCreateUser)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {message && (
                <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {message}
                </div>
              )}

              <div className="space-y-5">
              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">Name</span>
                <Input
                  {...createUserForm.register("name")}
                  placeholder="Full name"
                  className={adminInputClass}
                />
                {createUserForm.formState.errors.name && (
                  <span className="text-xs text-red-600">
                    {createUserForm.formState.errors.name.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Email
                </span>
                <Input
                  type="email"
                  {...createUserForm.register("email")}
                  placeholder="email@domain.com"
                  className={adminInputClass}
                />
                {createUserForm.formState.errors.email && (
                  <span className="text-xs text-red-600">
                    {createUserForm.formState.errors.email.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Phone Number
                </span>
                <Input
                  {...createUserForm.register("phoneNumber")}
                  placeholder="+1 555 000 0000"
                  className={adminInputClass}
                />
                {createUserForm.formState.errors.phoneNumber && (
                  <span className="text-xs text-red-600">
                    {createUserForm.formState.errors.phoneNumber.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Password
                </span>
                <Input
                  type="password"
                  {...createUserForm.register("password")}
                  placeholder="Minimum 8 characters"
                  className={adminInputClass}
                />
                {createUserForm.formState.errors.password && (
                  <span className="text-xs text-red-600">
                    {createUserForm.formState.errors.password.message}
                  </span>
                )}
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Role
                  </span>
                  <Controller
                    control={createUserForm.control}
                    name="role"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={adminSelectTriggerClass}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className={adminSelectContentClass}>
                          {userRoleOptions
                            .filter((role) => isSuperAdmin || role !== "SUPER_ADMIN")
                            .map((role) => (
                              <SelectItem
                                key={role}
                                value={role}
                                className={adminSelectItemClass}
                              >
                                {role}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {createUserForm.formState.errors.role && (
                    <span className="text-xs text-red-600">
                      {createUserForm.formState.errors.role.message}
                    </span>
                  )}
                </label>

                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Status
                  </span>
                  <Controller
                    control={createUserForm.control}
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
                  {createUserForm.formState.errors.status && (
                    <span className="text-xs text-red-600">
                      {createUserForm.formState.errors.status.message}
                    </span>
                  )}
                </label>
              </div>

              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenCreateDialog(false)}
                  className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createUser.isPending || createUserForm.formState.isSubmitting}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {createUser.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {createUser.isPending ? "Saving..." : "Add User"}
                </Button>
              </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditDialog} onOpenChange={handleEditDialogChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user profile, role, and account status.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editUserForm.handleSubmit(handleUpdateUser)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {message && (
                <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {message}
                </div>
              )}

              <div className="space-y-5">
              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">Name</span>
                <Input
                  {...editUserForm.register("name")}
                  placeholder="Full name"
                  className={adminInputClass}
                />
                {editUserForm.formState.errors.name && (
                  <span className="text-xs text-red-600">
                    {editUserForm.formState.errors.name.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Email
                </span>
                <Input
                  type="email"
                  {...editUserForm.register("email")}
                  placeholder="email@domain.com"
                  className={adminInputClass}
                />
                {editUserForm.formState.errors.email && (
                  <span className="text-xs text-red-600">
                    {editUserForm.formState.errors.email.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Phone Number
                </span>
                <Input
                  {...editUserForm.register("phoneNumber")}
                  placeholder="+1 555 000 0000"
                  className={adminInputClass}
                />
                {editUserForm.formState.errors.phoneNumber && (
                  <span className="text-xs text-red-600">
                    {editUserForm.formState.errors.phoneNumber.message}
                  </span>
                )}
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Role
                  </span>
                  <Controller
                    control={editUserForm.control}
                    name="role"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={adminSelectTriggerClass}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className={adminSelectContentClass}>
                          {userRoleOptions
                            .filter((role) => isSuperAdmin || role !== "SUPER_ADMIN")
                            .map((role) => (
                              <SelectItem
                                key={role}
                                value={role}
                                className={adminSelectItemClass}
                              >
                                {role}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editUserForm.formState.errors.role && (
                    <span className="text-xs text-red-600">
                      {editUserForm.formState.errors.role.message}
                    </span>
                  )}
                </label>

                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Status
                  </span>
                  <Controller
                    control={editUserForm.control}
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
                  {editUserForm.formState.errors.status && (
                    <span className="text-xs text-red-600">
                      {editUserForm.formState.errors.status.message}
                    </span>
                  )}
                </label>
              </div>

              </div>
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
                  disabled={updateUser.isPending || editUserForm.formState.isSubmitting}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {updateUser.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {updateUser.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteDialog} onOpenChange={handleDeleteDialogChange}>
        <DialogContent className="rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-md">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Delete User</DialogTitle>
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
                {selectedUser?.name || "this user"}
              </span>
              ? Their trading accounts will be detached from the user.
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
                disabled={deleteUser.isPending}
                onClick={handleDeleteUser}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deleteUser.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {deleteUser.isPending ? "Deleting..." : "Delete User"}
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openStatusDialog} onOpenChange={handleStatusDialogChange}>
        <DialogContent className="rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-md">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle className="text-gray-950">
              {pendingStatusChecked ? "Activate User" : "Deactivate User"}
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              {pendingStatusChecked
                ? "Are you sure you want to set this user to active? User needs to activate their EA manually after activation."
                : "Are you sure you want to set this user to inactive? Deactivate user will deactivate all user's EA."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-5">
            <p className="text-sm text-gray-700">
              User:{" "}
              <span className="font-semibold text-gray-950">
                {pendingStatusUser?.name || "-"}
              </span>
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleStatusDialogChange(false)}
              disabled={Boolean(statusUpdatingUserId)}
              className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={Boolean(statusUpdatingUserId)}
              onClick={handleConfirmUserStatus}
              className={
                pendingStatusChecked
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-red-600 text-white hover:bg-red-700"
              }
            >
              {statusUpdatingUserId && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {pendingStatusChecked ? "Activate" : "Deactivate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
