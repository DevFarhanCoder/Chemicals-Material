import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import { Material, PaginationInfo } from "../types";
import { format } from "date-fns";

// =============================================================================
// EditableCell — defined at MODULE level (outside MaterialsTable).
//
// WHY THIS MATTERS: If a component is defined inside another component's render
// function React treats it as a brand-new type on every render and forcefully
// unmounts + remounts it — destroying focus and erasing typed text.
// Defining it here gives it a permanent stable identity.
// =============================================================================
interface EditableCellProps {
  value: string | null;
  rowId: string;
  field: string;
  type?: "text" | "textarea" | "date";
  onSave: (rowId: string, field: string, value: string | null) => void;
}

const EditableCell = React.memo(function EditableCell({
  value,
  rowId,
  field,
  type = "text",
  onSave,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Derive the input-ready representation of value.
  // Date inputs need "YYYY-MM-DD"; everything else is the raw string.
  const toLocal = (v: string | null) =>
    type === "date" ? (v ? v.split("T")[0] : "") : (v ?? "");

  const [localValue, setLocalValue] = useState<string>(() => toLocal(value));

  // When the parent's optimistic update changes `value`, sync only if not editing.
  useEffect(() => {
    if (!isEditing) setLocalValue(toLocal(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isEditing]);

  const commit = () => {
    setIsEditing(false);
    if (type === "date") {
      const iso = localValue
        ? new Date(localValue + "T00:00:00").toISOString()
        : null;
      if (iso !== value) onSave(rowId, field, iso);
    } else {
      const trimmed = localValue.trimEnd();
      if (trimmed !== (value ?? "")) onSave(rowId, field, trimmed || null);
    }
  };

  const cancel = () => {
    setIsEditing(false);
    setLocalValue(toLocal(value));
  };

  if (isEditing) {
    if (type === "date") {
      return (
        <input
          type="date"
          autoFocus
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") cancel();
          }}
          className="text-sm border border-blue-400 rounded px-2 py-1 w-full outline-none focus:ring-2 focus:ring-blue-200"
        />
      );
    }
    const Tag = type === "textarea" ? "textarea" : "input";
    return (
      <Tag
        autoFocus
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (type === "text" || e.ctrlKey))
            e.currentTarget.blur();
          if (e.key === "Escape") cancel();
        }}
        className="text-sm border border-blue-400 rounded px-2 py-1 w-full outline-none focus:ring-2 focus:ring-blue-200"
        rows={type === "textarea" ? 2 : undefined}
      />
    );
  }

  let display: React.ReactNode = localValue;
  if (type === "date" && localValue) {
    try {
      display = format(new Date(localValue), "MMM dd, yyyy");
    } catch {
      display = localValue;
    }
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      title="Click to edit"
      className="text-sm cursor-pointer hover:bg-blue-50 p-1 rounded min-h-[24px]"
    >
      {display || (
        <span className="text-gray-400 italic text-xs">Click to edit</span>
      )}
    </div>
  );
});

// =============================================================================
// MaterialsTable
// =============================================================================
interface MaterialsTableProps {
  materials: Material[];
  pagination: PaginationInfo;
  isLoading: boolean;
  onUpdate: (id: string, updates: Partial<Material>) => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  onAdd: () => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
}

function MaterialsTable({
  materials,
  pagination,
  isLoading,
  onUpdate,
  onDelete,
  onDeleteMany,
  onAdd,
  onPageChange,
  onSortChange,
}: MaterialsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Clear selection whenever the page data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [materials]);

  const allPageIds = materials.map((m) => m.id);
  const allSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allPageIds));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (!window.confirm(`Delete ${ids.length} selected row(s)?`)) return;
    onDeleteMany(ids);
    setSelectedIds(new Set());
  };

  // Single stable save handler — EditableCells get a consistent function ref
  // so React.memo keeps them from re-rendering unnecessarily.
  const handleCellSave = useCallback(
    (rowId: string, field: string, value: string | null) => {
      onUpdate(rowId, { [field]: value });
    },
    [onUpdate],
  );

  const pageOffset = (pagination.page - 1) * pagination.limit;

  // Columns do NOT depend on any editing state, so the table never forcefully
  // remounts cells while someone is typing.
  const columns = useMemo<ColumnDef<Material>[]>(
    () => [
      {
        id: "select",
        size: 44,
        header: () => (
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 cursor-pointer"
            title={allSelected ? "Deselect all" : "Select all on this page"}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleRow(row.original.id)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 cursor-pointer"
          />
        ),
      },
      {
        id: "srNo",
        header: "Sr. No.",
        size: 70,
        cell: ({ row }) => (
          <div className="text-sm font-medium text-center">
            {pageOffset + row.index + 1}
          </div>
        ),
      },
      {
        accessorKey: "caseNo",
        header: "CAS No.",
        size: 130,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.caseNo}
            rowId={row.original.id}
            field="caseNo"
            onSave={handleCellSave}
          />
        ),
      },
      {
        accessorKey: "productName",
        header: "Product Name",
        size: 240,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.productName}
            rowId={row.original.id}
            field="productName"
            type="textarea"
            onSave={handleCellSave}
          />
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        size: 100,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.price}
            rowId={row.original.id}
            field="price"
            onSave={handleCellSave}
          />
        ),
      },
      {
        accessorKey: "unit",
        header: "Unit",
        size: 80,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.unit}
            rowId={row.original.id}
            field="unit"
            onSave={handleCellSave}
          />
        ),
      },
      {
        accessorKey: "email",
        header: "Email ID",
        size: 200,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.email}
            rowId={row.original.id}
            field="email"
            onSave={handleCellSave}
          />
        ),
      },
      {
        accessorKey: "mobile",
        header: "Contact No.",
        size: 130,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.mobile}
            rowId={row.original.id}
            field="mobile"
            onSave={handleCellSave}
          />
        ),
      },
      {
        accessorKey: "companyName",
        header: "Company Name",
        size: 150,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.companyName}
            rowId={row.original.id}
            field="companyName"
            onSave={handleCellSave}
          />
        ),
      },
      {
        accessorKey: "location",
        header: "State Location",
        size: 150,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.location}
            rowId={row.original.id}
            field="location"
            onSave={handleCellSave}
          />
        ),
      },
      {
        accessorKey: "lastContacted",
        header: "Date",
        size: 150,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.lastContacted}
            rowId={row.original.id}
            field="lastContacted"
            type="date"
            onSave={handleCellSave}
          />
        ),
      },
      {
        accessorKey: "remarks",
        header: "Remark",
        size: 200,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.remarks}
            rowId={row.original.id}
            field="remarks"
            type="textarea"
            onSave={handleCellSave}
          />
        ),
      },
      {
        id: "actions",
        header: "Delete",
        size: 80,
        cell: ({ row }) => (
          <button
            onClick={() => onDelete(row.original.id)}
            className="text-red-600 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        ),
      },
    ],
    [
      pageOffset,
      handleCellSave,
      onDelete,
      selectedIds,
      allSelected,
      someSelected,
      toggleAll,
      toggleRow,
    ],
  );

  const table = useReactTable({
    data: materials,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater);
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (next.length > 0) {
        onSortChange(next[0].id, next[0].desc ? "desc" : "asc");
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });

  if (isLoading) {
    return (
      <div className="card p-8">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          Loading materials...
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-700">
            {pagination.total} Materials
          </h3>
          {someSelected && (
            <span className="text-sm text-blue-700 font-medium">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {someSelected && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
            >
              🗑 Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition-colors"
          >
            + Add New Row
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() && (
                        <span>
                          {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {materials.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  No materials found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    selectedIds.has(row.original.id)
                      ? "bg-blue-50 hover:bg-blue-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="table-cell">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages >= 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">
              {pagination.total === 0
                ? 0
                : (pagination.page - 1) * pagination.limit + 1}
            </span>
            {" – "}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-medium">{pagination.total}</span> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={pagination.page === 1}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              «
            </button>
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹ Prev
            </button>

            {buildPageNumbers(pagination.page, pagination.totalPages).map(
              (item, i) =>
                item === "..." ? (
                  <span
                    key={`ell-${i}`}
                    className="px-2 py-1 text-gray-400 text-sm select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => onPageChange(item as number)}
                    className={`px-3 py-1 text-sm border rounded transition-colors ${
                      pagination.page === item
                        ? "bg-primary-600 text-white border-primary-600 font-semibold"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                ),
            )}

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next ›
            </button>
            <button
              onClick={() => onPageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Returns a compact page list like [1, "...", 4, 5, 6, "...", 20] */
function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const result: (number | "...")[] = [1];
  if (current > 3) result.push("...");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    result.push(p);
  }
  if (current < total - 2) result.push("...");
  result.push(total);
  return result;
}

export default MaterialsTable;
