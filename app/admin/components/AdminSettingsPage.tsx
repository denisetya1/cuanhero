"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import {
  CreditCard,
  ImageUp,
  Loader2,
  MessageSquareText,
  Save,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  type AdminSettingsPayload,
  useGetAdminSettings,
  useUpdateAdminSettings,
} from "@/hooks/useAdminSettings";

const settingsSchema = z.object({
  whatsappNumber: z.string().trim().max(50, "Maximum 50 characters."),
  notificationEmails: z
    .string()
    .trim()
    .max(2000, "Maximum 2,000 characters.")
    .refine((value) => {
      if (!value) return true;
      const emails = value
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
      return (
        emails.length <= 20 &&
        emails.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      );
    }, "Enter up to 20 valid email addresses separated by commas."),
  paymentMode: z.enum(["DYNAMIC", "STATIC"]),
  staticQrisImage: z.string(),
  tiktokLiveEnabled: z.boolean(),
  tiktokLiveUrl: z
    .string()
    .trim()
    .max(191, "Maximum 191 characters.")
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    }, "Enter a valid HTTP or HTTPS URL."),
  metaTitleEn: z.string().trim().max(191, "Maximum 191 characters."),
  metaTitleId: z.string().trim().max(191, "Maximum 191 characters."),
  metaDescriptionEn: z.string(),
  metaDescriptionId: z.string(),
  orderMessageEn: z.string(),
  orderMessageId: z.string(),
  freeTrialMessageEn: z.string(),
  freeTrialMessageId: z.string(),
  renewalMessageEn: z.string(),
  renewalMessageId: z.string(),
  consultationMessageEn: z.string(),
  consultationMessageId: z.string(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const emptySettings: SettingsFormValues = {
  whatsappNumber: "",
  notificationEmails: "",
  paymentMode: "DYNAMIC",
  staticQrisImage: "",
  tiktokLiveEnabled: false,
  tiktokLiveUrl: "",
  metaTitleEn: "",
  metaTitleId: "",
  metaDescriptionEn: "",
  metaDescriptionId: "",
  orderMessageEn: "",
  orderMessageId: "",
  freeTrialMessageEn: "",
  freeTrialMessageId: "",
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
  const paymentMode = useWatch({
    control: form.control,
    name: "paymentMode",
  });
  const staticQrisImage = useWatch({
    control: form.control,
    name: "staticQrisImage",
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

  const handleQrisImage = (file?: File) => {
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("QRIS image must be PNG, JPG, or WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("QRIS image must not exceed 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      form.setValue("staticQrisImage", reader.result, {
        shouldDirty: true,
        shouldValidate: true,
      });
    };
    reader.onerror = () => toast.error("Failed to read QRIS image.");
    reader.readAsDataURL(file);
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
            Manage contact details, notifications, SEO metadata, and WhatsApp message templates.
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
            <p className="text-xs text-slate-500">
              Primary contact and operational notification recipients.
            </p>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block">
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

          <div className="rounded-lg border border-slate-200 p-4">
            <Controller
              control={form.control}
              name="tiktokLiveEnabled"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium text-slate-700">
                      TikTok Live Status
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Change the floating TikTok status between LIVE and OFFLINE.
                    </span>
                  </span>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </label>
              )}
            />
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                TikTok Live URL
              </span>
              <Input
                type="url"
                placeholder="https://www.tiktok.com/@username/live"
                {...form.register("tiktokLiveUrl")}
                className={inputClass}
              />
              <FieldError message={form.formState.errors.tiktokLiveUrl?.message} />
            </label>
          </div>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Notification Email
            </span>
            <Input
              type="text"
              placeholder="admin@cuanhero.com, operations@cuanhero.com"
              {...form.register("notificationEmails")}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Separate multiple addresses with commas. Healthcheck alerts are
              sent when a server or trading account changes to offline.
            </p>
            <FieldError
              message={form.formState.errors.notificationEmails?.message}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="font-semibold text-slate-950">Payment</h2>
            <p className="text-xs text-slate-500">
              Switch between automatic iPaymu payments and manually confirmed
              static QRIS payments.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 p-4">
              <Controller
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <label className="flex items-center justify-between gap-4">
                    <span>
                      <span className="block text-sm font-medium text-slate-700">
                        Static QRIS Payment
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {field.value === "STATIC"
                          ? "Active. Orders wait for manual confirmation by Super Admin."
                          : "Inactive. Paid orders use the iPaymu direct-payment API."}
                      </span>
                    </span>
                    <Switch
                      checked={field.value === "STATIC"}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? "STATIC" : "DYNAMIC")
                      }
                    />
                  </label>
                )}
              />
            </div>

            <div
              className={`rounded-lg border p-4 ${
                paymentMode === "STATIC"
                  ? "border-blue-200 bg-blue-50/50"
                  : "border-slate-200"
              }`}
            >
              <p className="text-sm font-medium text-slate-700">
                Current payment mode
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">
                {paymentMode === "STATIC"
                  ? "Static QRIS · Manual verification"
                  : "Dynamic QRIS · iPaymu"}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Free packages remain activated automatically in either mode.
                Static paid orders expire after one hour and remain pending
                until confirmed manually.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">
              Static QRIS Image
            </p>
            <p className="mt-1 text-xs text-slate-500">
              PNG, JPG, or WebP. Maximum file size 2 MB.
            </p>

            {staticQrisImage ? (
              <div className="mt-4">
                <div className="mx-auto w-fit overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
                  <Image
                    src={staticQrisImage}
                    alt="Static QRIS preview"
                    width={280}
                    height={280}
                    unoptimized
                    className="h-auto max-h-64 w-auto max-w-full object-contain"
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50">
                    <ImageUp className="h-4 w-4" />
                    Replace
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) =>
                        handleQrisImage(event.target.files?.[0])
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      form.setValue("staticQrisImage", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    disabled={paymentMode === "STATIC"}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      paymentMode === "STATIC"
                        ? "Switch to dynamic mode before removing the image."
                        : "Remove QRIS image"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="mt-4 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-blue-300 hover:bg-blue-50/50">
                <ImageUp className="h-8 w-8 text-blue-500" />
                <span className="mt-3 text-sm font-semibold text-slate-700">
                  Upload QRIS image
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Required before static mode can be saved
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) =>
                    handleQrisImage(event.target.files?.[0])
                  }
                />
              </label>
            )}
          </div>
        </div>
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
              Optional. Empty templates automatically use the application defaults.
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
                title: "Free Trial Message",
                description: 'Used by the "Start Free Trial" landing-page CTA.',
                en: "freeTrialMessageEn",
                id: "freeTrialMessageId",
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
