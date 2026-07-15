"use client";

type AdminTablePaginationProps = {
  currentPage: number;
  pageSize?: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export const DEFAULT_TABLE_PAGE_SIZE = 30;

export default function AdminTablePagination({
  currentPage,
  pageSize = DEFAULT_TABLE_PAGE_SIZE,
  totalItems,
  onPageChange,
}: AdminTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startItem = totalItems ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 bg-white px-5 py-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Showing {startItem}-{endItem} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          className="h-8 rounded-md border border-gray-200 bg-white px-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-2 font-medium text-gray-600">
          {safeCurrentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          className="h-8 rounded-md border border-gray-200 bg-white px-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
