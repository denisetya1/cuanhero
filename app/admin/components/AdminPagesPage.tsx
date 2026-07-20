"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  type AdminCmsPage,
  type AdminCmsPagePayload,
  useCreateAdminPage,
  useDeleteAdminPage,
  useGetAdminPages,
  useUpdateAdminPage,
} from "@/hooks/useAdminPages";
import {
  ExternalLink,
  FilePenLine,
  FilePlus2,
  Files,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import Editor, {
  BtnBold,
  BtnBulletList,
  BtnClearFormatting,
  BtnItalic,
  BtnLink,
  BtnNumberedList,
  BtnRedo,
  BtnStrikeThrough,
  BtnStyles,
  BtnUnderline,
  BtnUndo,
  Toolbar,
} from "react-simple-wysiwyg";
import { toast } from "react-toastify";

const emptyForm: AdminCmsPagePayload = {
  slug: "",
  titleEn: "",
  titleId: "",
  contentEn: "",
  contentId: "",
  metaTitleEn: "",
  metaTitleId: "",
  metaDescriptionEn: "",
  metaDescriptionId: "",
  isPublished: false,
};

const inputClass =
  "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-300 focus-visible:ring-blue-100";
const textareaClass =
  "min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-3 focus:ring-blue-100";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

// Keep a trailing hyphen while the admin is typing (for example `trading-`).
// The final value is normalized on blur and once more by the API.
const sanitizeSlugInput = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/g, "")
    .slice(0, 120);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function AdminPagesPage() {
  const { data: response, isLoading, isError, error } = useGetAdminPages();
  const createPage = useCreateAdminPage();
  const updatePage = useUpdateAdminPage();
  const deletePage = useDeleteAdminPage();
  const pages = useMemo(
    () => (response?.data || []) as AdminCmsPage[],
    [response?.data],
  );

  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<"id" | "en">("id");
  const [editingPage, setEditingPage] = useState<AdminCmsPage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCmsPage | null>(null);
  const [form, setForm] = useState<AdminCmsPagePayload>(emptyForm);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const filteredPages = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return pages;
    return pages.filter((page) =>
      [page.titleId, page.titleEn, page.slug].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [pages, search]);

  const saving = createPage.isPending || updatePage.isPending;

  const openCreate = () => {
    setEditingPage(null);
    setForm(emptyForm);
    setSlugManuallyEdited(false);
    setActiveLanguage("id");
    setEditorOpen(true);
  };

  const openEdit = (page: AdminCmsPage) => {
    setEditingPage(page);
    setForm({
      slug: page.slug,
      titleEn: page.titleEn,
      titleId: page.titleId,
      contentEn: page.contentEn,
      contentId: page.contentId,
      metaTitleEn: page.metaTitleEn,
      metaTitleId: page.metaTitleId,
      metaDescriptionEn: page.metaDescriptionEn,
      metaDescriptionId: page.metaDescriptionId,
      isPublished: page.isPublished,
    });
    setSlugManuallyEdited(true);
    setActiveLanguage("id");
    setEditorOpen(true);
  };

  const updateField = <K extends keyof AdminCmsPagePayload>(
    key: K,
    value: AdminCmsPagePayload[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handleTitleIdChange = (value: string) => {
    setForm((current) => ({
      ...current,
      titleId: value,
      ...(!editingPage && !slugManuallyEdited && { slug: slugify(value) }),
    }));
  };

  const handleSave = async () => {
    if (!form.slug || !form.titleId || !form.titleEn) {
      toast.error("Slug and both page titles are required.");
      return;
    }
    if (!form.contentId || !form.contentEn) {
      toast.error("Content must be provided in Indonesian and English.");
      return;
    }

    try {
      if (editingPage) {
        await updatePage.mutateAsync({ pageId: editingPage.id, ...form });
        toast.success("Page updated successfully.");
      } else {
        await createPage.mutateAsync(form);
        toast.success("Page created successfully.");
      }
      setEditorOpen(false);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save page.");
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deletePage.mutateAsync(pendingDelete.id);
      toast.success("Page deleted successfully.");
      setPendingDelete(null);
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error ? deleteError.message : "Failed to delete page.",
      );
    }
  };

  const languageFields =
    activeLanguage === "id"
      ? {
          title: form.titleId,
          content: form.contentId,
          metaTitle: form.metaTitleId,
          metaDescription: form.metaDescriptionId,
          titleKey: "titleId" as const,
          contentKey: "contentId" as const,
          metaTitleKey: "metaTitleId" as const,
          metaDescriptionKey: "metaDescriptionId" as const,
        }
      : {
          title: form.titleEn,
          content: form.contentEn,
          metaTitle: form.metaTitleEn,
          metaDescription: form.metaDescriptionEn,
          titleKey: "titleEn" as const,
          contentKey: "contentEn" as const,
          metaTitleKey: "metaTitleEn" as const,
          metaDescriptionKey: "metaDescriptionEn" as const,
        };

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/50 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-600">Content</p>
          <h1 className="text-2xl font-bold text-slate-950">Pages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create multilingual public pages without changing application code.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 text-white hover:bg-blue-700">
          <FilePlus2 className="h-4 w-4" /> New Page
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or slug..."
              className={`${inputClass} pl-9`}
            />
          </div>
          <p className="text-xs text-slate-500">{filteredPages.length} pages</p>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading pages...
          </div>
        ) : isError ? (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load pages."}
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <Files className="h-10 w-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">No pages found</p>
            <p className="mt-1 text-sm text-slate-500">Create your first CMS page to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Page</th>
                  <th className="px-5 py-3 font-semibold">URL</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{page.titleId}</p>
                      <p className="mt-1 text-xs text-slate-500">{page.titleEn}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">/{page.slug}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          page.isPublished
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {page.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{formatDate(page.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {page.isPublished && (
                          <Button variant="ghost" size="icon-sm" asChild title="View page">
                            <Link href={`/${page.slug}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(page)} title="Edit page">
                          <FilePenLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setPendingDelete(page)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Delete page"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[94vh] overflow-y-auto bg-white p-0 text-slate-900 sm:max-w-6xl">
          <DialogHeader className="border-b border-slate-200 px-6 py-5">
            <DialogTitle className="text-lg font-semibold">
              {editingPage ? "Edit Page" : "Create Page"}
            </DialogTitle>
            <DialogDescription>
              Content is sanitized automatically before it is published.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-6 pb-2">
            <div className="grid gap-5 md:grid-cols-[1fr_auto]">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">URL Slug</span>
                <div className="flex items-center rounded-md border border-slate-200 bg-white shadow-xs focus-within:border-blue-300 focus-within:ring-3 focus-within:ring-blue-100">
                  <span className="border-r border-slate-200 px-3 text-sm text-slate-400">/</span>
                  <input
                    value={form.slug}
                    onChange={(event) => {
                      setSlugManuallyEdited(true);
                      updateField("slug", sanitizeSlugInput(event.target.value));
                    }}
                    onBlur={() => updateField("slug", slugify(form.slug))}
                    placeholder="terms-and-conditions"
                    className="h-9 flex-1 bg-transparent px-3 text-sm outline-none"
                  />
                </div>
              </label>
              <label className="flex items-end">
                <span className="flex h-10 items-center gap-3 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(event) => updateField("isPublished", event.target.checked)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  Publish page
                </span>
              </label>
            </div>

            <div className="flex rounded-lg bg-slate-100 p-1">
              {(["id", "en"] as const).map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => setActiveLanguage(language)}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                    activeLanguage === language
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {language === "id" ? "Indonesian" : "English"}
                </button>
              ))}
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Page Title</span>
                <Input
                  value={languageFields.title}
                  onChange={(event) =>
                    activeLanguage === "id"
                      ? handleTitleIdChange(event.target.value)
                      : updateField(languageFields.titleKey, event.target.value)
                  }
                  className={inputClass}
                  maxLength={191}
                />
              </label>

              <div className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Page Content</span>
                <div className="cms-editor overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <Editor
                    value={languageFields.content}
                    onChange={(event) => updateField(languageFields.contentKey, event.target.value)}
                    placeholder="Write page content here..."
                  >
                    <Toolbar>
                      <BtnUndo />
                      <BtnRedo />
                      <BtnStyles />
                      <BtnBold />
                      <BtnItalic />
                      <BtnUnderline />
                      <BtnStrikeThrough />
                      <BtnBulletList />
                      <BtnNumberedList />
                      <BtnLink />
                      <BtnClearFormatting />
                    </Toolbar>
                  </Editor>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Meta Title</span>
                  <Input
                    value={languageFields.metaTitle}
                    onChange={(event) => updateField(languageFields.metaTitleKey, event.target.value)}
                    placeholder="Defaults to the page title"
                    className={inputClass}
                    maxLength={191}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Meta Description</span>
                  <textarea
                    value={languageFields.metaDescription}
                    onChange={(event) =>
                      updateField(languageFields.metaDescriptionKey, event.target.value)
                    }
                    placeholder="Short search engine description..."
                    className={textareaClass}
                    maxLength={500}
                  />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : editingPage ? "Save Changes" : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="bg-white text-slate-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete page?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.titleId} will be removed permanently and its public URL will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deletePage.isPending}>
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={deletePage.isPending} className="bg-red-600 text-white hover:bg-red-700">
              {deletePage.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
