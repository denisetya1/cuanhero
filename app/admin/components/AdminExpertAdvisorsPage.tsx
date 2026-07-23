"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  type AdminExpertAdvisorPayload,
  useCreateAdminExpertAdvisor,
  useDeleteAdminExpertAdvisor,
  useGetAdminExpertAdvisors,
  useUpdateAdminExpertAdvisor,
} from "@/hooks/useAdminExpertAdvisors";
import AdminTablePagination, {
  DEFAULT_TABLE_PAGE_SIZE,
} from "./AdminTablePagination";
import { useAdminAccess } from "./AdminAccessContext";
import {
  getLocalizedText,
  localizedTextToJson,
  normalizeLocalizedText,
} from "@/lib/localized-text";

type ExpertAdvisorItem = {
  id: number;
  name: string;
  eaFileName: string;
  currentVersion?: string | null;
  defaultConfig?: Record<string, unknown> | null;
  description?: Record<string, string> | string | null;
  image?: string | null;
  isActive: boolean;
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
  "min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-none outline-none focus-visible:border-blue-300 focus-visible:ring-3 focus-visible:ring-blue-100";

const expertAdvisorSchema = z.object({
  name: z.string().trim().min(1, "Expert Advisor name is required."),
  eaFileName: z.string().trim().optional(),
  currentVersion: z.string().trim().max(32).optional(),
  defaultConfig: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) return true;
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed);
      } catch {
        return false;
      }
    }, "Default config must be a JSON object."),
  descriptionEn: z.string().trim().optional(),
  descriptionId: z.string().trim().optional(),
  image: z.string().trim().optional(),
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

type ExpertAdvisorFormValues = z.infer<typeof expertAdvisorSchema>;

const expertAdvisorDefaultValues: ExpertAdvisorFormValues = {
  name: "",
  eaFileName: "",
  currentVersion: "",
  defaultConfig: "",
  descriptionEn: "",
  descriptionId: "",
  image: "",
  orderNumber: "9999",
};

const buildDescription = (descriptionEn?: string, descriptionId?: string) =>
  localizedTextToJson({ en: descriptionEn || "", id: descriptionId || "" });

const stringifyDefaultConfig = (defaultConfig: unknown) => {
  if (!defaultConfig) return "";

  try {
    return JSON.stringify(defaultConfig, null, 2);
  } catch {
    return "";
  }
};

const parseDefaultConfig = (defaultConfig?: string) => {
  return defaultConfig?.trim()
    ? (JSON.parse(defaultConfig) as Record<string, unknown>)
    : null;
};

const formatDate = (value: string | Date) => {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export default function AdminExpertAdvisorsPage() {
  const { isSuperAdmin } = useAdminAccess();
  const queryClient = useQueryClient();
  const { data: expertAdvisorsResponse, error, isError, isLoading } =
    useGetAdminExpertAdvisors();
  const createExpertAdvisor = useCreateAdminExpertAdvisor();
  const updateExpertAdvisor = useUpdateAdminExpertAdvisor();
  const deleteExpertAdvisor = useDeleteAdminExpertAdvisor();
  const [search, setSearch] = useState("");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedExpertAdvisor, setSelectedExpertAdvisor] =
    useState<ExpertAdvisorItem | null>(null);
  const [statusUpdatingExpertAdvisorId, setStatusUpdatingExpertAdvisorId] =
    useState<number | null>(null);
  const [formMessage, setFormMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const createExpertAdvisorForm = useForm<ExpertAdvisorFormValues>({
    resolver: zodResolver(expertAdvisorSchema),
    defaultValues: expertAdvisorDefaultValues,
  });
  const editExpertAdvisorForm = useForm<ExpertAdvisorFormValues>({
    resolver: zodResolver(expertAdvisorSchema),
    defaultValues: expertAdvisorDefaultValues,
  });

  const expertAdvisors: ExpertAdvisorItem[] =
    expertAdvisorsResponse?.data || [];
  const filteredExpertAdvisors = expertAdvisors.filter((expertAdvisor) => {
    const keyword = search.toLowerCase();

    return (
      expertAdvisor.name.toLowerCase().includes(keyword) ||
      expertAdvisor.eaFileName.toLowerCase().includes(keyword) ||
      getLocalizedText(expertAdvisor.description, "en")
        .toLowerCase()
        .includes(keyword) ||
      getLocalizedText(expertAdvisor.description, "id")
        .toLowerCase()
        .includes(keyword) ||
      (expertAdvisor.image || "").toLowerCase().includes(keyword)
    );
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredExpertAdvisors.length / DEFAULT_TABLE_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedExpertAdvisors = filteredExpertAdvisors.slice(
    (safeCurrentPage - 1) * DEFAULT_TABLE_PAGE_SIZE,
    safeCurrentPage * DEFAULT_TABLE_PAGE_SIZE,
  );

  const handleOpenCreateDialog = () => {
    setFormMessage("");
    createExpertAdvisorForm.reset(expertAdvisorDefaultValues);
    setOpenCreateDialog(true);
  };

  const handleCreateDialogChange = (open: boolean) => {
    setOpenCreateDialog(open);

    if (!open) {
      setFormMessage("");
      createExpertAdvisorForm.reset(expertAdvisorDefaultValues);
    }
  };

  const handleOpenEditDialog = (expertAdvisor: ExpertAdvisorItem) => {
    const description = normalizeLocalizedText(expertAdvisor.description);

    setSelectedExpertAdvisor(expertAdvisor);
    setFormMessage("");
    editExpertAdvisorForm.reset({
      name: expertAdvisor.name,
      eaFileName: expertAdvisor.eaFileName || "",
      currentVersion: expertAdvisor.currentVersion || "",
      defaultConfig: stringifyDefaultConfig(expertAdvisor.defaultConfig),
      descriptionEn: description.en,
      descriptionId: description.id,
      image: expertAdvisor.image || "",
      orderNumber: String(expertAdvisor.orderNumber),
    });
    setOpenEditDialog(true);
  };

  const handleEditDialogChange = (open: boolean) => {
    setOpenEditDialog(open);

    if (!open) {
      setSelectedExpertAdvisor(null);
      setFormMessage("");
      editExpertAdvisorForm.reset(expertAdvisorDefaultValues);
    }
  };

  const handleOpenDeleteDialog = (expertAdvisor: ExpertAdvisorItem) => {
    setSelectedExpertAdvisor(expertAdvisor);
    setDeleteMessage("");
    setOpenDeleteDialog(true);
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setOpenDeleteDialog(open);

    if (!open) {
      setSelectedExpertAdvisor(null);
      setDeleteMessage("");
    }
  };

  const handleCreateExpertAdvisor = async (
    values: ExpertAdvisorFormValues,
  ) => {
    setFormMessage("");

    const payload: AdminExpertAdvisorPayload = {
      name: values.name.trim(),
      eaFileName: values.eaFileName?.trim() || "",
      currentVersion: values.currentVersion?.trim() || "",
      defaultConfig: parseDefaultConfig(values.defaultConfig),
      description: buildDescription(values.descriptionEn, values.descriptionId),
      image: values.image?.trim() || "",
      isActive: true,
      orderNumber: Number(values.orderNumber),
    };

    try {
      await createExpertAdvisor.mutateAsync(payload);
      handleCreateDialogChange(false);
      toast.success("Expert Advisor created successfully.");
      await queryClient.invalidateQueries({
        queryKey: ["admin-expert-advisors"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-trading-account-options"],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create Expert Advisor.";
      setFormMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleUpdateExpertAdvisor = async (
    values: ExpertAdvisorFormValues,
  ) => {
    setFormMessage("");

    if (!selectedExpertAdvisor) {
      setFormMessage("No Expert Advisor selected.");
      return;
    }

    try {
      await updateExpertAdvisor.mutateAsync({
        expertAdvisorId: selectedExpertAdvisor.id,
        name: values.name.trim(),
        eaFileName: values.eaFileName?.trim() || "",
        currentVersion: values.currentVersion?.trim() || "",
        defaultConfig: parseDefaultConfig(values.defaultConfig),
        description: buildDescription(
          values.descriptionEn,
          values.descriptionId,
        ),
        image: values.image?.trim() || "",
        isActive: selectedExpertAdvisor.isActive,
        orderNumber: Number(values.orderNumber),
      });
      handleEditDialogChange(false);
      toast.success("Expert Advisor updated successfully.");
      await queryClient.invalidateQueries({
        queryKey: ["admin-expert-advisors"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-trading-account-options"],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update Expert Advisor.";
      setFormMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeleteExpertAdvisor = async () => {
    setDeleteMessage("");

    if (!selectedExpertAdvisor) {
      setDeleteMessage("No Expert Advisor selected.");
      return;
    }

    try {
      await deleteExpertAdvisor.mutateAsync(selectedExpertAdvisor.id);
      handleDeleteDialogChange(false);
      toast.success("Expert Advisor deleted successfully.");
      await queryClient.invalidateQueries({
        queryKey: ["admin-expert-advisors"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-trading-account-options"],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete Expert Advisor.";
      setDeleteMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleToggleExpertAdvisorStatus = async (
    expertAdvisor: ExpertAdvisorItem,
    checked: boolean,
  ) => {
    setStatusUpdatingExpertAdvisorId(expertAdvisor.id);

    try {
      await updateExpertAdvisor.mutateAsync({
        expertAdvisorId: expertAdvisor.id,
        name: expertAdvisor.name,
        eaFileName: expertAdvisor.eaFileName || "",
        currentVersion: expertAdvisor.currentVersion || "",
        defaultConfig: expertAdvisor.defaultConfig || null,
        description: localizedTextToJson(
          normalizeLocalizedText(expertAdvisor.description),
        ),
        image: expertAdvisor.image || "",
        isActive: checked,
        orderNumber: expertAdvisor.orderNumber,
      });
      toast.success(
        checked
          ? "Expert Advisor activated successfully."
          : "Expert Advisor deactivated successfully.",
      );
      await queryClient.invalidateQueries({
        queryKey: ["admin-expert-advisors"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-trading-account-options"],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update Expert Advisor status.";
      toast.error(errorMessage);
    } finally {
      setStatusUpdatingExpertAdvisorId(null);
    }
  };

  const renderExpertAdvisorFormFields = (
    form: typeof createExpertAdvisorForm | typeof editExpertAdvisorForm,
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
        <span className="text-sm font-medium text-gray-700">Name</span>
        <Input
          {...form.register("name")}
          placeholder="Expert Advisor name"
          className={adminInputClass}
        />
        {form.formState.errors.name && (
          <span className="text-xs text-red-600">
            {form.formState.errors.name.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">EA File Name</span>
        <Input
          {...form.register("eaFileName")}
          placeholder="Smartrix.ex5"
          className={adminInputClass}
        />
        {form.formState.errors.eaFileName && (
          <span className="text-xs text-red-600">
            {form.formState.errors.eaFileName.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">
          Current Version
        </span>
        <Input
          {...form.register("currentVersion")}
          placeholder="4.3"
          className={adminInputClass}
        />
        {form.formState.errors.currentVersion && (
          <span className="text-xs text-red-600">
            {form.formState.errors.currentVersion.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">
          Default Config (JSON)
        </span>
        <textarea
          {...form.register("defaultConfig")}
          placeholder={'{\n  "startLotSize": "0.01",\n  "useTrailingStop": false\n}'}
          className={adminTextareaClass}
        />
        {form.formState.errors.defaultConfig && (
          <span className="text-xs text-red-600">
            {form.formState.errors.defaultConfig.message}
          </span>
        )}
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-medium text-gray-700">Image</span>
        <Input
          {...form.register("image")}
          placeholder="/images/ea.png or https://..."
          className={adminInputClass}
        />
        {form.formState.errors.image && (
          <span className="text-xs text-red-600">
            {form.formState.errors.image.message}
          </span>
        )}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2.5">
          <span className="text-sm font-medium text-gray-700">
            Description (English)
          </span>
          <textarea
            {...form.register("descriptionEn")}
            placeholder="English EA description"
            className={adminTextareaClass}
          />
        </label>

        <label className="block space-y-2.5">
          <span className="text-sm font-medium text-gray-700">
            Description (Indonesian)
          </span>
          <textarea
            {...form.register("descriptionId")}
            placeholder="Deskripsi EA dalam Bahasa Indonesia"
            className={adminTextareaClass}
          />
        </label>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/50 p-2">
      <section className="overflow-hidden rounded-md border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-slate-50/40 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Expert Advisor List
              </p>
              <h1 className="text-sm font-bold text-gray-900">EA Robot</h1>
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
                placeholder="Search Expert Advisors..."
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
              Add EA
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-slate-50/30 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-24 px-5 py-3 font-semibold">No</th>
                <th className="px-5 py-3 font-semibold">Expert Advisor</th>
                <th className="px-5 py-3 font-semibold">Image</th>
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
                    Loading Expert Advisors...
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
                      : "Failed to load Expert Advisors."}
                  </td>
                </tr>
              ) : filteredExpertAdvisors.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    No Expert Advisors found.
                  </td>
                </tr>
              ) : (
                paginatedExpertAdvisors.map((expertAdvisor) => (
                  <tr key={expertAdvisor.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold text-gray-600">
                      {expertAdvisor.orderNumber}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {expertAdvisor.name}
                      </p>
                      {expertAdvisor.eaFileName && (
                        <p className="mt-1 font-mono text-[11px] text-blue-600">
                          {expertAdvisor.eaFileName}
                        </p>
                      )}
                      {expertAdvisor.currentVersion && (
                        <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                          Current v{expertAdvisor.currentVersion}
                        </p>
                      )}
                      <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">
                        {getLocalizedText(expertAdvisor.description, "id") ||
                          "No description."}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {expertAdvisor.image ? (
                        <span className="block max-w-48 truncate text-xs">
                          {expertAdvisor.image}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {expertAdvisor._count.tradingAccounts} accounts
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {formatDate(expertAdvisor.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <Switch
                        checked={expertAdvisor.isActive}
                        disabled={
                          !isSuperAdmin ||
                          statusUpdatingExpertAdvisorId === expertAdvisor.id
                        }
                        onCheckedChange={(checked) =>
                          handleToggleExpertAdvisorStatus(
                            expertAdvisor,
                            checked,
                          )
                        }
                        aria-label={`Set ${expertAdvisor.name} status`}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          title="Edit Expert Advisor"
                          onClick={() => handleOpenEditDialog(expertAdvisor)}
                          disabled={!isSuperAdmin}
                          className="h-7 gap-1 rounded-md border-blue-200 bg-white px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Delete Expert Advisor"
                          onClick={() => handleOpenDeleteDialog(expertAdvisor)}
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
          totalItems={filteredExpertAdvisors.length}
          onPageChange={setCurrentPage}
        />
      </section>

      <Dialog open={openCreateDialog} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Add Expert Advisor</DialogTitle>
            <DialogDescription>
              Create an Expert Advisor that can be assigned to trading accounts.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={createExpertAdvisorForm.handleSubmit(
              handleCreateExpertAdvisor,
            )}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {formMessage && (
                <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formMessage}
                </div>
              )}
              {renderExpertAdvisorFormFields(createExpertAdvisorForm)}
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
                  createExpertAdvisor.isPending ||
                  createExpertAdvisorForm.formState.isSubmitting
                }
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {createExpertAdvisor.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {createExpertAdvisor.isPending ? "Saving..." : "Add EA"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditDialog} onOpenChange={handleEditDialogChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Edit Expert Advisor</DialogTitle>
            <DialogDescription>
              Update Expert Advisor profile and description.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editExpertAdvisorForm.handleSubmit(
              handleUpdateExpertAdvisor,
            )}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {formMessage && (
                <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formMessage}
                </div>
              )}
              {renderExpertAdvisorFormFields(editExpertAdvisorForm)}
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
                  updateExpertAdvisor.isPending ||
                  editExpertAdvisorForm.formState.isSubmitting
                }
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {updateExpertAdvisor.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {updateExpertAdvisor.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteDialog} onOpenChange={handleDeleteDialogChange}>
        <DialogContent className="rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-md">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Delete Expert Advisor</DialogTitle>
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
                {selectedExpertAdvisor?.name || "this Expert Advisor"}
              </span>
              ? Expert Advisors that are already used by trading accounts cannot
              be deleted.
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
              disabled={deleteExpertAdvisor.isPending}
              onClick={handleDeleteExpertAdvisor}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteExpertAdvisor.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {deleteExpertAdvisor.isPending ? "Deleting..." : "Delete EA"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
