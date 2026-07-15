"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { Loader2, MessageSquareText, Save, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AdminSettingsPayload,
  useGetAdminSettings,
  useUpdateAdminSettings,
} from "@/hooks/useAdminSettings";

const settingsSchema = z.object({
  whatsappNumber: z.string().trim().max(50, "Maximum 50 characters."),
  metaTitleEn: z.string().trim().max(191, "Maximum 191 characters."),
  metaTitleId: z.string().trim().max(191, "Maximum 191 characters."),
  metaDescriptionEn: z.string(),
  metaDescriptionId: z.string(),
  orderMessageEn: z.string(),
  orderMessageId: z.string(),
  renewalMessageEn: z.string(),
  renewalMessageId: z.string(),
  consultationMessageEn: z.string(),
  consultationMessageId: z.string(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const emptySettings: SettingsFormValues = {
  whatsappNumber: "",
  metaTitleEn: "",
  metaTitleId: "",
  metaDescriptionEn: "",
  metaDescriptionId: "",
  orderMessageEn: "",
  orderMessageId: "",
  renewalMessageEn: "",
  renewalMessageId: "",
  consultationMessageEn: "",
  consultationMessageId: "",
};

const inputClass =
  "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-300 focus-visible:ring-blue-100";
const textareaClass =
  "min-h-36 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-3 focus:ring-blue-100";

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;

export default function AdminSettingsPage() {
  const { data: response, isLoading, isError, error } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const settings = response?.data as AdminSettingsPayload | undefined;
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: emptySettings,
  });

  useEffect(() => {
    if (settings) form.reset(settings);
  }, [form, settings]);

  const handleSave = async (values: SettingsFormValues) => {
    try {
      const result = await updateSettings.mutateAsync(values);
      form.reset(result.data as SettingsFormValues);
      toast.success("Settings saved successfully.");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save settings.",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="m-4 flex min-h-64 items-center justify-center rounded-xl bg-white text-slate-500 md:m-6">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading settings...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 md:m-6">
        {error instanceof Error ? error.message : "Failed to load settings."}
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSave)}
      className="min-h-screen space-y-6 bg-slate-50/50 p-4 md:p-6 lg:p-8"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-600">Application</p>
          <h1 className="text-2xl font-bold text-slate-950">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage contact details, SEO metadata, and WhatsApp message templates.
          </p>
        </div>
        <Button
          type="submit"
          disabled={updateSettings.isPending || !form.formState.isDirty}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {updateSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Settings className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="font-semibold text-slate-950">General</h2>
            <p className="text-xs text-slate-500">Primary WhatsApp contact number.</p>
          </div>
        </div>
        <label className="block max-w-xl">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            WhatsApp Number
          </span>
          <Input
            placeholder="6281234567890"
            {...form.register("whatsappNumber")}
            className={inputClass}
          />
          <FieldError message={form.formState.errors.whatsappNumber?.message} />
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Search className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="font-semibold text-slate-950">SEO Metadata</h2>
            <p className="text-xs text-slate-500">Default public-site search metadata.</p>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              English
            </h3>
            <div className="grid gap-4">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Meta Title
                </span>
                <Input
                  {...form.register("metaTitleEn")}
                  className={inputClass}
                />
                <FieldError
                  message={form.formState.errors.metaTitleEn?.message}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Meta Description
                </span>
                <textarea
                  {...form.register("metaDescriptionEn")}
                  className={textareaClass}
                  rows={4}
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Indonesian
            </h3>
            <div className="grid gap-4">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Meta Title
                </span>
                <Input
                  {...form.register("metaTitleId")}
                  className={inputClass}
                />
                <FieldError
                  message={form.formState.errors.metaTitleId?.message}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Meta Description
                </span>
                <textarea
                  {...form.register("metaDescriptionId")}
                  className={textareaClass}
                  rows={4}
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <MessageSquareText className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="font-semibold text-slate-950">WhatsApp Templates</h2>
            <p className="text-xs text-slate-500">
              English and Indonesian templates for each customer flow.
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {(
            [
              {
                title: "Order Message",
                description: "Used when an EA and package have been selected.",
                en: "orderMessageEn",
                id: "orderMessageId",
              },
              {
                title: "Renewal Message",
                description: "Used when a customer renews an active subscription.",
                en: "renewalMessageEn",
                id: "renewalMessageId",
              },
              {
                title: "Consultation / Join Message",
                description: "Used when joining without selecting an EA or package.",
                en: "consultationMessageEn",
                id: "consultationMessageId",
              },
            ] as const
          ).map((template) => (
            <div key={template.title} className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-medium text-slate-900">{template.title}</h3>
              <p className="mb-4 mt-1 text-xs text-slate-500">
                {template.description}
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    English
                  </span>
                  <textarea
                    {...form.register(template.en)}
                    className={textareaClass}
                    rows={6}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Indonesian
                  </span>
                  <textarea
                    {...form.register(template.id)}
                    className={textareaClass}
                    rows={6}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}
