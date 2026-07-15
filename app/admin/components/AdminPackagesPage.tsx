"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
  type AdminPackagePayload,
  useCreateAdminPackage,
  useDeleteAdminPackage,
  useGetAdminPackages,
  useUpdateAdminPackage,
} from "@/hooks/useAdminPackages";
import AdminTablePagination, {
  DEFAULT_TABLE_PAGE_SIZE,
} from "./AdminTablePagination";
import { useAdminAccess } from "./AdminAccessContext";
import { getLocalizedText } from "@/lib/localized-text";

type PackageItem = {
  id: number;
  code?: string | null;
  name: string;
  description?: Record<string, string> | string | null;
  features?: unknown;
  price: string;
  discountPercent?: number | null;
  recurringType: string;
  orderNumber: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count: {
    tradingAccounts: number;
  };
};

const adminInputClass =
  "h-9 border-slate-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-blue-300 focus-visible:ring-blue-100";

const adminTextareaClass =
  "min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus-visible:border-blue-300 focus-visible:ring-3 focus-visible:ring-blue-100";

const adminSelectTriggerClass =
  "h-9 w-full rounded-md border-slate-200 bg-white text-sm text-gray-900 shadow-none focus-visible:border-blue-300 focus-visible:ring-3 focus-visible:ring-blue-100";

const adminSelectContentClass =
  "z-[80] rounded-md border-slate-200 bg-white text-gray-900 shadow-lg [&_[data-slot=select-scroll-down-button]]:bg-white [&_[data-slot=select-scroll-down-button]]:text-slate-400 [&_[data-slot=select-scroll-up-button]]:bg-white [&_[data-slot=select-scroll-up-button]]:text-slate-400";

const adminSelectItemClass =
  "rounded-md text-gray-700 focus:!bg-blue-50 focus:!text-blue-700 focus:[&_*]:!text-blue-700 data-[highlighted]:!bg-blue-50 data-[highlighted]:!text-blue-700 data-[highlighted]:[&_*]:!text-blue-700 data-[state=checked]:!bg-blue-50 data-[state=checked]:!text-blue-700 data-[state=checked]:[&_*]:!text-blue-700 [&_svg]:!text-blue-600";

const recurringTypeOptions = ["24h", "30d", "lifetime"];

const packageSchema = z.object({
  code: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[A-Za-z0-9_]+$/.test(value), {
      message: "Code may only contain letters, numbers, and underscores.",
    }),
  name: z.string().trim().min(1, "Package name is required."),
  description: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) return true;
      try {
        const parsed = JSON.parse(value);
        return (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed) &&
          Object.values(parsed).every((item) => typeof item === "string")
        );
      } catch {
        return false;
      }
    }, "Description must be a JSON object containing language and text pairs."),
  price: z
    .string()
    .trim()
    .min(1, "Price is required.")
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
      message: "Price must be a valid number.",
    }),
  discountPercent: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        (Number.isInteger(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= 100),
      {
        message: "Discount must be a whole number from 0 to 100.",
      },
    ),
  features: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) {
        return true;
      }

      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, "Features must be a valid JSON string."),
  recurringType: z.string().trim().min(1, "Recurring type is required."),
  orderNumber: z
    .string()
    .trim()
    .min(1, "Order number is required.")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 0,
      {
        message: "Order number must be a positive whole number.",
      },
    ),
});

type PackageFormValues = z.infer<typeof packageSchema>;

const packageDefaultValues: PackageFormValues = {
  code: "",
  name: "",
  description: "",
  price: "",
  discountPercent: "",
  features: "",
  recurringType: "30d",
  orderNumber: "9999",
};

const stringifyFeatures = (features: unknown) => {
  if (!features) {
    return "";
  }

  try {
    return JSON.stringify(features, null, 2);
  } catch {
    return "";
  }
};

const stringifyDescription = (description: unknown) => {
  if (!description) return "";
  if (typeof description === "string") {
    return JSON.stringify({ id: description }, null, 2);
  }

  try {
    return JSON.stringify(description, null, 2);
  } catch {
    return "";
  }
};

const parseDescription = (description?: string) => {
  return description?.trim()
    ? (JSON.parse(description) as Record<string, string>)
    : null;
};

const parseFeatures = (features: string | undefined) => {
  const trimmedFeatures = features?.trim();

  if (!trimmedFeatures) {
    return null;
  }

  return JSON.parse(trimmedFeatures);
};

const formatDate = (value: string | Date) => {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export default function AdminPackagesPage() {
  const { isSuperAdmin } = useAdminAccess();
  const queryClient = useQueryClient();
  const { data: packagesResponse, error, isError, isLoading } =
    useGetAdminPackages();
  const createPackage = useCreateAdminPackage();
  const updatePackage = useUpdateAdminPackage();
  const deletePackage = useDeleteAdminPackage();
  const [search, setSearch] = useState("");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [formMessage, setFormMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const createPackageForm = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: packageDefaultValues,
  });
  const editPackageForm = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: packageDefaultValues,
  });

  const packages: PackageItem[] = packagesResponse?.data || [];
  const filteredPackages = packages.filter((packageItem) => {
    const keyword = search.toLowerCase();

    return (
      (packageItem.code || "").toLowerCase().includes(keyword) ||
      packageItem.name.toLowerCase().includes(keyword) ||
      getLocalizedText(packageItem.description, "en")
        .toLowerCase()
        .includes(keyword) ||
      getLocalizedText(packageItem.description, "id")
        .toLowerCase()
        .includes(keyword) ||
      packageItem.price.toLowerCase().includes(keyword) ||
      packageItem.recurringType.toLowerCase().includes(keyword)
    );
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPackages.length / DEFAULT_TABLE_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPackages = filteredPackages.slice(
    (safeCurrentPage - 1) * DEFAULT_TABLE_PAGE_SIZE,
    safeCurrentPage * DEFAULT_TABLE_PAGE_SIZE,
  );

  const handleOpenCreateDialog = () => {
    setFormMessage("");
    createPackageForm.reset(packageDefaultValues);
    setOpenCreateDialog(true);
  };

  const handleCreateDialogChange = (open: boolean) => {
    setOpenCreateDialog(open);

    if (!open) {
      setFormMessage("");
      createPackageForm.reset(packageDefaultValues);
    }
  };

  const handleOpenEditDialog = (packageItem: PackageItem) => {
    setSelectedPackage(packageItem);
    setFormMessage("");
    editPackageForm.reset({
      code: packageItem.code || "",
      name: packageItem.name,
      description: stringifyDescription(packageItem.description),
      price: packageItem.price,
      discountPercent:
        packageItem.discountPercent === null ||
        packageItem.discountPercent === undefined
          ? ""
          : String(packageItem.discountPercent),
      features: stringifyFeatures(packageItem.features),
      recurringType: packageItem.recurringType,
      orderNumber: String(packageItem.orderNumber),
    });
    setOpenEditDialog(true);
  };

  const handleEditDialogChange = (open: boolean) => {
    setOpenEditDialog(open);

    if (!open) {
      setSelectedPackage(null);
      setFormMessage("");
      editPackageForm.reset(packageDefaultValues);
    }
  };

  const handleOpenDeleteDialog = (packageItem: PackageItem) => {
    setSelectedPackage(packageItem);
    setDeleteMessage("");
    setOpenDeleteDialog(true);
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setOpenDeleteDialog(open);

    if (!open) {
      setSelectedPackage(null);
      setDeleteMessage("");
    }
  };

  const handleCreatePackage = async (values: PackageFormValues) => {
    setFormMessage("");

    const payload: AdminPackagePayload = {
      code: values.code?.trim().toUpperCase() || null,
      name: values.name.trim(),
      description: parseDescription(values.description),
      price: values.price.trim(),
      discountPercent: values.discountPercent
        ? Number(values.discountPercent)
        : null,
      features: parseFeatures(values.features),
      recurringType: values.recurringType.trim(),
      orderNumber: Number(values.orderNumber),
    };

    try {
      await createPackage.mutateAsync(payload);
      handleCreateDialogChange(false);
      toast.success("Package created successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-trading-account-options"],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create package.";
      setFormMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleUpdatePackage = async (values: PackageFormValues) => {
    setFormMessage("");

    if (!selectedPackage) {
      setFormMessage("No package selected.");
      return;
    }

    try {
      await updatePackage.mutateAsync({
        packageId: selectedPackage.id,
        code: values.code?.trim().toUpperCase() || null,
        name: values.name.trim(),
        description: parseDescription(values.description),
        price: values.price.trim(),
        discountPercent: values.discountPercent
          ? Number(values.discountPercent)
          : null,
        features: parseFeatures(values.features),
        recurringType: values.recurringType.trim(),
        orderNumber: Number(values.orderNumber),
      });
      handleEditDialogChange(false);
      toast.success("Package updated successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-trading-account-options"],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update package.";
      setFormMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeletePackage = async () => {
    setDeleteMessage("");

    if (!selectedPackage) {
      setDeleteMessage("No package selected.");
      return;
    }

    try {
      await deletePackage.mutateAsync(selectedPackage.id);
      handleDeleteDialogChange(false);
      toast.success("Package deleted successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-trading-account-options"],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete package.";
      setDeleteMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const renderPackageFormFields = (
    form: typeof createPackageForm | typeof editPackageForm,
  ) => (
    <div className="space-y-5">
      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">No</span>
        <Input
          type="number"
          min="0"
          step="1"
          {...form.register("orderNumber")}
          placeholder="9999"
          className={adminInputClass}
        />
        {form.formState.errors.orderNumber && (
          <span className="text-xs text-red-600">
            {form.formState.errors.orderNumber.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">Code</span>
        <Input
          {...form.register("code")}
          placeholder="FREE_TRIAL or IB_MONTHLY"
          className={`${adminInputClass} font-mono uppercase`}
        />
        <span className="block text-xs text-gray-400">
          Stable identifier used by member flows. Leave empty for regular packages.
        </span>
        {form.formState.errors.code && (
          <span className="text-xs text-red-600">
            {form.formState.errors.code.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">Name</span>
        <Input
          {...form.register("name")}
          placeholder="Package name"
          className={adminInputClass}
        />
        {form.formState.errors.name && (
          <span className="text-xs text-red-600">
            {form.formState.errors.name.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">
          Description (JSON)
        </span>
        <textarea
          {...form.register("description")}
          placeholder={'{\n  "en": "English description",\n  "id": "Deskripsi Indonesia"\n}'}
          className={adminTextareaClass}
        />
        {form.formState.errors.description && (
          <span className="text-xs text-red-600">
            {form.formState.errors.description.message}
          </span>
        )}
      </label>


      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">Price</span>
        <Input
          type="number"
          min="0"
          step="0.01"
          {...form.register("price")}
          placeholder="0.00"
          className={adminInputClass}
        />
        {form.formState.errors.price && (
          <span className="text-xs text-red-600">
            {form.formState.errors.price.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">Discount</span>
        <Input
          type="number"
          min="0"
          max="100"
          step="1"
          {...form.register("discountPercent")}
          placeholder="0"
          className={adminInputClass}
        />
        {form.formState.errors.discountPercent && (
          <span className="text-xs text-red-600">
            {form.formState.errors.discountPercent.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">
          Recurring Type
        </span>
        <Controller
          control={form.control}
          name="recurringType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className={adminSelectTriggerClass}>
                <SelectValue placeholder="Select recurring type" />
              </SelectTrigger>
              <SelectContent className={adminSelectContentClass}>
                {recurringTypeOptions.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    className={adminSelectItemClass}
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.recurringType && (
          <span className="text-xs text-red-600">
            {form.formState.errors.recurringType.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">Features JSON</span>
        <textarea
          {...form.register("features")}
          placeholder={'[\n  {\n    "title": { "en": "Free VPS", "id": "VPS Gratis" },\n    "checked": true\n  }\n]'}
          className={`${adminTextareaClass} font-mono text-xs`}
        />
        {form.formState.errors.features && (
          <span className="text-xs text-red-600">
            {form.formState.errors.features.message}
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
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Package List
              </p>
              <h1 className="text-sm font-bold text-gray-900">Packages</h1>
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
                placeholder="Search packages..."
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
              Add Package
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-slate-50/30 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-24 px-5 py-3 font-semibold">No</th>
                <th className="px-5 py-3 font-semibold">Package</th>
                <th className="px-5 py-3 font-semibold">Price</th>
                <th className="px-5 py-3 font-semibold">Recurring</th>
                <th className="px-5 py-3 font-semibold">Trading Accounts</th>
                <th className="px-5 py-3 font-semibold">Created</th>
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
                    Loading packages...
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
                      : "Failed to load packages."}
                  </td>
                </tr>
              ) : filteredPackages.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    No packages found.
                  </td>
                </tr>
              ) : (
                paginatedPackages.map((packageItem) => (
                  <tr key={packageItem.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold text-gray-600">
                      {packageItem.orderNumber}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {packageItem.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Package #{packageItem.id}
                      </p>
                      {packageItem.code && (
                        <p className="mt-1 font-mono text-[11px] font-semibold text-blue-600">
                          {packageItem.code}
                        </p>
                      )}
                      {getLocalizedText(packageItem.description, "id") && (
                        <p className="mt-1 max-w-sm text-xs text-gray-500">
                          {getLocalizedText(packageItem.description, "id")}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-700">
                      <div>
                        <p>{packageItem.price}</p>
                        {packageItem.discountPercent ? (
                          <p className="text-xs text-emerald-600">
                            Discount {packageItem.discountPercent}%
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {packageItem.recurringType}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {packageItem._count.tradingAccounts} accounts
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {formatDate(packageItem.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          title="Edit package"
                          onClick={() => handleOpenEditDialog(packageItem)}
                          disabled={!isSuperAdmin}
                          className="h-7 gap-1 rounded-md border-blue-200 bg-white px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Delete package"
                          onClick={() => handleOpenDeleteDialog(packageItem)}
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
          totalItems={filteredPackages.length}
          onPageChange={setCurrentPage}
        />
      </section>

      <Dialog open={openCreateDialog} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Add Package</DialogTitle>
            <DialogDescription>
              Create a package that can be assigned to trading accounts.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={createPackageForm.handleSubmit(handleCreatePackage)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {formMessage && (
                <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formMessage}
                </div>
              )}
              {renderPackageFormFields(createPackageForm)}
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
                  createPackage.isPending ||
                  createPackageForm.formState.isSubmitting
                }
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {createPackage.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {createPackage.isPending ? "Saving..." : "Add Package"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditDialog} onOpenChange={handleEditDialogChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Update package name, price, and recurring type.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editPackageForm.handleSubmit(handleUpdatePackage)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {formMessage && (
                <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formMessage}
                </div>
              )}
              {renderPackageFormFields(editPackageForm)}
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
                  updatePackage.isPending ||
                  editPackageForm.formState.isSubmitting
                }
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {updatePackage.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {updatePackage.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteDialog} onOpenChange={handleDeleteDialogChange}>
        <DialogContent className="rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-md">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Delete Package</DialogTitle>
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
                {selectedPackage?.name || "this package"}
              </span>
              ? Packages that are already used by trading accounts cannot be
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
              disabled={deletePackage.isPending}
              onClick={handleDeletePackage}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deletePackage.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {deletePackage.isPending ? "Deleting..." : "Delete Package"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
