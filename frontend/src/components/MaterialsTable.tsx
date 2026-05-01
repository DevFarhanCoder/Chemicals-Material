import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import { Material, PaginationInfo, CurrencyCode } from "../types";
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
  // Date inputs need "YYYY-MM-DD". We extract UTC date parts so the value
  // never shifts by the local timezone offset (fixes "saved Oct 7, shows Oct 6").
  const toLocal = (v: string | null) => {
    if (type !== "date") return v ?? "";
    if (!v) return "";
    const d = new Date(v);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${day}`;
  };

  const [localValue, setLocalValue] = useState<string>(() => toLocal(value));

  // When the parent's optimistic update changes `value`, sync only if not editing.
  useEffect(() => {
    if (!isEditing) setLocalValue(toLocal(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isEditing]);

  const commit = () => {
    setIsEditing(false);
    if (type === "date") {
      // Store as UTC midnight string e.g. "2026-10-07T00:00:00.000Z".
      // Do NOT use new Date(str).toISOString() — that shifts by local offset
      // (IST +5:30 turns Oct 7 00:00 local → Oct 6 18:30 UTC → wrong day stored).
      const iso = localValue ? `${localValue}T00:00:00.000Z` : null;
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
      // Build from parts directly — avoids local offset shifting the date on display
      const [y, mo, d] = localValue.split("-").map(Number);
      display = format(new Date(y, mo - 1, d), "MMM dd, yyyy");
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
// Currency conversion
// =============================================================================
const EXCHANGE_RATES: Record<
  CurrencyCode,
  { symbol: string; rate: number; label: string }
> = {
  INR: { symbol: "₹", rate: 1, label: "INR – Indian Rupee" },
  USD: { symbol: "$", rate: 0.012, label: "USD – US Dollar" },
  EUR: { symbol: "€", rate: 0.011, label: "EUR – Euro" },
  JPY: { symbol: "¥", rate: 1.8, label: "JPY – Japanese Yen" },
  GBP: { symbol: "£", rate: 0.0095, label: "GBP – British Pound" },
  AED: { symbol: "د.إ", rate: 0.044, label: "AED – UAE Dirham" },
  CNY: { symbol: "¥", rate: 0.087, label: "CNY – Chinese Yuan" },
  SGD: { symbol: "S$", rate: 0.016, label: "SGD – Singapore Dollar" },
  CAD: { symbol: "C$", rate: 0.016, label: "CAD – Canadian Dollar" },
  AUD: { symbol: "A$", rate: 0.019, label: "AUD – Australian Dollar" },
};

/** Convert stored price from base currency to viewer-selected currency. */
function convertPrice(
  raw: string | null,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
): string | null {
  if (!raw) return null;
  // Extract the first number-like sequence from the string
  const match = raw.match(/[\d.,]+/);
  if (!match) return raw; // non-numeric string — return as-is
  const num = parseFloat(match[0].replace(/,/g, ""));
  if (isNaN(num)) return raw;
  const fromRate =
    EXCHANGE_RATES[fromCurrency]?.rate ?? EXCHANGE_RATES.INR.rate;
  const toRate = EXCHANGE_RATES[toCurrency]?.rate ?? EXCHANGE_RATES.INR.rate;
  const inrValue = num / fromRate;
  const converted = inrValue * toRate;
  const symbol =
    EXCHANGE_RATES[toCurrency]?.symbol ?? EXCHANGE_RATES.INR.symbol;
  // Format: no decimals for large values, 2 decimals otherwise
  const formatted =
    converted >= 100
      ? converted.toLocaleString("en-IN", { maximumFractionDigits: 0 })
      : converted.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

interface PriceCellProps {
  value: string | null;
  rowId: string;
  baseCurrency?: CurrencyCode;
  viewerCurrency: CurrencyCode | "BASE";
  onSave: (rowId: string, field: string, value: string | null) => void;
}

/** Price cell: edits raw value in row's base currency, displays in viewer currency. */
const PriceCell = React.memo(function PriceCell({
  value,
  rowId,
  baseCurrency = "INR",
  viewerCurrency,
  onSave,
}: PriceCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState<string>(value ?? "");

  useEffect(() => {
    if (!isEditing) setLocalValue(value ?? "");
  }, [value, isEditing]);

  const commit = () => {
    setIsEditing(false);
    const trimmed = localValue.trimEnd();
    if (trimmed !== (value ?? "")) onSave(rowId, "price", trimmed || null);
  };

  const cancel = () => {
    setIsEditing(false);
    setLocalValue(value ?? "");
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") cancel();
        }}
        placeholder={`Enter in ${baseCurrency}`}
        className="text-sm border border-blue-400 rounded px-2 py-1 w-full outline-none focus:ring-2 focus:ring-blue-200"
      />
    );
  }

  const display =
    viewerCurrency === "BASE"
      ? value
        ? `${EXCHANGE_RATES[baseCurrency].symbol}${value}`
        : null
      : convertPrice(value, baseCurrency, viewerCurrency);

  return (
    <div className="space-y-1">
      <div
        onClick={() => setIsEditing(true)}
        title={
          value
            ? `Stored as ${baseCurrency}: ${EXCHANGE_RATES[baseCurrency].symbol}${value}`
            : "Click to edit"
        }
        className="text-sm cursor-pointer hover:bg-blue-50 p-1 rounded min-h-[24px]"
      >
        {display || (
          <span className="text-gray-400 italic text-xs">Click to edit</span>
        )}
      </div>
      <select
        value={baseCurrency}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) =>
          onSave(rowId, "priceCurrency", e.target.value as CurrencyCode)
        }
        className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-700 w-full"
        title="Stored currency for this row"
      >
        {Object.entries(EXCHANGE_RATES).map(([code, { label }]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
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
  onAddSubRow: (parentId: string) => void;
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
  onAddSubRow,
  onPageChange,
  onSortChange,
}: MaterialsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedCurrency, setSelectedCurrency] = useState<
    CurrencyCode | "BASE"
  >("BASE");

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Clear selection when page data changes or select mode is turned off
  useEffect(() => {
    setSelectedIds(new Set());
  }, [materials]);

  const allPageIds = materials.map((m) => m.id);
  const allSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(allPageIds));
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (!window.confirm(`Delete ${ids.length} selected row(s)?`)) return;
    onDeleteMany(ids);
    exitSelectMode();
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
        header: () =>
          selectMode ? (
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer"
              title={allSelected ? "Deselect all" : "Select all"}
            />
          ) : (
            <span className="text-xs font-medium text-gray-700">#</span>
          ),
        cell: ({ row }) =>
          selectMode ? (
            <input
              type="checkbox"
              checked={selectedIds.has(row.original.id)}
              onChange={() => toggleRow(row.original.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            />
          ) : (
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
        header: () => (
          <div className="flex items-center gap-1">
            <span>Price</span>
            <span className="text-gray-400 font-normal normal-case">
              {selectedCurrency === "BASE"
                ? "(Uploaded)"
                : `(${EXCHANGE_RATES[selectedCurrency].symbol})`}
            </span>
          </div>
        ),
        size: 120,
        cell: ({ row }) => (
          <PriceCell
            value={row.original.price}
            rowId={row.original.id}
            baseCurrency={row.original.priceCurrency ?? "INR"}
            viewerCurrency={selectedCurrency}
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
        header: "Actions",
        size: 150,
        cell: ({ row }) => {
          const hasSubRows = (row.original.subRows?.length ?? 0) > 0;
          const isExpanded = expandedIds.has(row.original.id);
          return (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => toggleExpanded(row.original.id)}
                disabled={!hasSubRows}
                title={
                  hasSubRows
                    ? isExpanded
                      ? "Collapse sub rows"
                      : "Expand sub rows"
                    : "No sub rows"
                }
                className={`text-xs px-1.5 py-1 rounded transition-colors border ${
                  hasSubRows
                    ? "border-blue-300 text-blue-600 hover:bg-blue-50"
                    : "border-gray-200 text-gray-300 cursor-default"
                }`}
              >
                {isExpanded ? "▼" : "▶"}
              </button>
              <button
                onClick={() => {
                  setExpandedIds((prev) => new Set([...prev, row.original.id]));
                  onAddSubRow(row.original.id);
                }}
                title="Add sub row"
                className="text-xs px-1.5 py-1 rounded border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                + Sub
              </button>
              <button
                onClick={() => onDelete(row.original.id)}
                className="text-xs font-medium px-1.5 py-1 rounded text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                Del
              </button>
            </div>
          );
        },
      },
    ],
    [
      pageOffset,
      handleCellSave,
      onDelete,
      onAddSubRow,
      selectMode,
      selectedIds,
      allSelected,
      someSelected,
      toggleAll,
      toggleRow,
      expandedIds,
      toggleExpanded,
      selectedCurrency,
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
          {selectMode && someSelected && (
            <span className="text-sm text-blue-700 font-medium">
              {selectedIds.size} selected
            </span>
          )}
          {/* Currency selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              Viewer Currency:
            </span>
            <select
              value={selectedCurrency}
              onChange={(e) =>
                setSelectedCurrency(e.target.value as CurrencyCode | "BASE")
              }
              className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700 font-medium cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="BASE">Uploaded Currency (As Published)</option>
              {Object.entries(EXCHANGE_RATES).map(([code, { label }]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              {someSelected && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                >
                  🗑 Delete ({selectedIds.size})
                </button>
              )}
              <button
                onClick={exitSelectMode}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 transition-colors"
              >
                ✕ Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors border border-gray-300"
            >
              ☑ Select Rows
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
              table.getRowModel().rows.flatMap((row) => {
                const parentTr = (
                  <tr
                    key={row.id}
                    onClickCapture={
                      selectMode
                        ? (e) => {
                            const t = e.target as HTMLElement;
                            if (
                              t.tagName === "INPUT" &&
                              (t as HTMLInputElement).type === "checkbox"
                            ) {
                              return;
                            }
                            e.stopPropagation();
                            toggleRow(row.original.id);
                          }
                        : undefined
                    }
                    className={`transition-colors ${
                      selectMode ? "cursor-pointer" : ""
                    } ${
                      selectedIds.has(row.original.id)
                        ? "bg-blue-50 hover:bg-blue-100"
                        : selectMode
                          ? "hover:bg-gray-100"
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
                );

                const isExpanded = expandedIds.has(row.original.id);
                const subRows = row.original.subRows ?? [];
                if (!isExpanded || subRows.length === 0) return [parentTr];

                const subTrs = subRows.map((sub) => (
                  <tr
                    key={`sub-${sub.id}`}
                    className="bg-indigo-50/40 border-l-4 border-indigo-300"
                  >
                    {/* # / indent column */}
                    <td className="table-cell text-center text-gray-400 text-sm select-none">
                      ↳
                    </td>
                    <td className="table-cell">
                      <EditableCell
                        value={sub.caseNo}
                        rowId={sub.id}
                        field="caseNo"
                        onSave={handleCellSave}
                      />
                    </td>
                    <td className="table-cell">
                      <EditableCell
                        value={sub.productName}
                        rowId={sub.id}
                        field="productName"
                        type="textarea"
                        onSave={handleCellSave}
                      />
                    </td>
                    <td className="table-cell">
                      <PriceCell
                        value={sub.price}
                        rowId={sub.id}
                        baseCurrency={sub.priceCurrency ?? "INR"}
                        viewerCurrency={selectedCurrency}
                        onSave={handleCellSave}
                      />
                    </td>
                    <td className="table-cell">
                      <EditableCell
                        value={sub.unit}
                        rowId={sub.id}
                        field="unit"
                        onSave={handleCellSave}
                      />
                    </td>
                    <td className="table-cell">
                      <EditableCell
                        value={sub.email}
                        rowId={sub.id}
                        field="email"
                        onSave={handleCellSave}
                      />
                    </td>
                    <td className="table-cell">
                      <EditableCell
                        value={sub.mobile}
                        rowId={sub.id}
                        field="mobile"
                        onSave={handleCellSave}
                      />
                    </td>
                    <td className="table-cell">
                      <EditableCell
                        value={sub.companyName}
                        rowId={sub.id}
                        field="companyName"
                        onSave={handleCellSave}
                      />
                    </td>
                    <td className="table-cell">
                      <EditableCell
                        value={sub.location}
                        rowId={sub.id}
                        field="location"
                        onSave={handleCellSave}
                      />
                    </td>
                    <td className="table-cell">
                      <EditableCell
                        value={sub.lastContacted}
                        rowId={sub.id}
                        field="lastContacted"
                        type="date"
                        onSave={handleCellSave}
                      />
                    </td>
                    <td className="table-cell">
                      <EditableCell
                        value={sub.remarks}
                        rowId={sub.id}
                        field="remarks"
                        type="textarea"
                        onSave={handleCellSave}
                      />
                    </td>
                    {/* actions — sub-rows only get Delete */}
                    <td className="table-cell">
                      <button
                        onClick={() => onDelete(sub.id)}
                        className="text-xs font-medium px-2 py-1 rounded text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ));

                return [parentTr, ...subTrs];
              })
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
