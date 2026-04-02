import React, { useState, useMemo } from "react";
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

interface MaterialsTableProps {
  materials: Material[];
  pagination: PaginationInfo;
  isLoading: boolean;
  onUpdate: (id: string, updates: Partial<Material>) => void;
  onDelete: (id: string) => void;
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
  onAdd,
  onPageChange,
  onSortChange,
}: MaterialsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    field: keyof Material;
  } | null>(null);

  // Editable cell component
  const EditableCell = ({
    value,
    rowId,
    field,
    type = "text",
  }: {
    value: string | null;
    rowId: string;
    field: keyof Material;
    type?: "text" | "textarea" | "date";
  }) => {
    const isEditing =
      editingCell?.rowId === rowId && editingCell?.field === field;

    if (isEditing) {
      if (type === "date") {
        return (
          <input
            type="date"
            autoFocus
            defaultValue={value ? value.split("T")[0] : ""}
            onBlur={(e) => {
              const dateValue = e.currentTarget.value;
              if (dateValue) {
                onUpdate(rowId, { [field]: new Date(dateValue).toISOString() });
              } else {
                onUpdate(rowId, { [field]: null });
              }
              setEditingCell(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditingCell(null);
            }}
            className="text-sm border rounded px-2 py-1 w-full"
          />
        );
      }
      const Component = type === "textarea" ? "textarea" : "input";
      return (
        <Component
          autoFocus
          defaultValue={value || ""}
          onBlur={(e) => {
            onUpdate(rowId, { [field]: e.currentTarget.value });
            setEditingCell(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (type === "text" || e.ctrlKey)) {
              e.currentTarget.blur();
            }
          }}
          className="text-sm border rounded px-2 py-1 w-full"
          rows={type === "textarea" ? 2 : undefined}
        />
      );
    }

    let displayValue: React.ReactNode = value;
    if (type === "date" && value) {
      try {
        displayValue = format(new Date(value), "MMM dd, yyyy");
      } catch {
        displayValue = value;
      }
    }

    return (
      <div
        onClick={() => setEditingCell({ rowId, field })}
        className="text-sm cursor-pointer hover:bg-gray-50 p-1 rounded min-h-[24px]"
      >
        {displayValue || (
          <span className="text-gray-400 italic">Click to add...</span>
        )}
      </div>
    );
  };

  // Define columns
  const columns = useMemo<ColumnDef<Material>[]>(
    () => [
      {
        id: "srNo",
        header: "Sr. No.",
        size: 80,
        cell: ({ row }) => (
          <div className="text-sm font-medium">
            {(pagination.page - 1) * pagination.limit + row.index + 1}
          </div>
        ),
      },
      {
        accessorKey: "caseNo",
        header: "CAS No.",
        size: 120,
        cell: ({ row }) => (
          <div className="font-mono text-xs">
            <EditableCell
              value={row.original.caseNo}
              rowId={row.original.id}
              field="caseNo"
            />
          </div>
        ),
      },
      {
        accessorKey: "productName",
        header: "Product Name",
        size: 250,
        cell: ({ row }) => (
          <div className="max-w-xs">
            <div className="font-medium text-gray-900">
              <EditableCell
                value={row.original.productName}
                rowId={row.original.id}
                field="productName"
                type="textarea"
              />
            </div>
          </div>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        size: 100,
        cell: ({ row }) => (
          <div className="text-sm font-medium">
            <EditableCell
              value={row.original.price}
              rowId={row.original.id}
              field="price"
            />
          </div>
        ),
      },
      {
        id: "unit",
        header: "Unit",
        size: 80,
        cell: ({ row }) => (
          <div className="text-sm">
            <EditableCell
              value={row.original.unit}
              rowId={row.original.id}
              field="unit"
            />
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email ID",
        size: 200,
        cell: ({ row }) => (
          <div className="text-sm">
            <EditableCell
              value={row.original.email}
              rowId={row.original.id}
              field="email"
            />
          </div>
        ),
      },
      {
        accessorKey: "mobile",
        header: "Contact No.",
        size: 130,
        cell: ({ row }) => (
          <div className="text-sm font-mono whitespace-nowrap">
            <EditableCell
              value={row.original.mobile}
              rowId={row.original.id}
              field="mobile"
            />
          </div>
        ),
      },
      {
        accessorKey: "companyName",
        header: "Company Name",
        size: 150,
        cell: ({ row }) => (
          <div className="font-medium">
            <EditableCell
              value={row.original.companyName}
              rowId={row.original.id}
              field="companyName"
            />
          </div>
        ),
      },
      {
        accessorKey: "location",
        header: "State Location",
        size: 150,
        cell: ({ row }) => (
          <div className="text-sm">
            <EditableCell
              value={row.original.location}
              rowId={row.original.id}
              field="location"
            />
          </div>
        ),
      },
      {
        accessorKey: "lastContacted",
        header: "Date",
        size: 150,
        cell: ({ row }) => (
          <div className="text-sm">
            <EditableCell
              value={row.original.lastContacted}
              rowId={row.original.id}
              field="lastContacted"
              type="date"
            />
          </div>
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
          />
        ),
      },
      {
        id: "actions",
        header: "Add/ Delete",
        size: 120,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              onClick={() => onDelete(row.original.id)}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [editingCell, onUpdate, onDelete, pagination],
  );

  const table = useReactTable({
    data: materials,
    columns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      if (newSorting.length > 0) {
        onSortChange(newSorting[0].id, newSorting[0].desc ? "desc" : "asc");
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          Loading materials...
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Add New Row Button */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">
          {pagination.total} Materials
        </h3>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition-colors"
        >
          + Add New Row
        </button>
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
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="table-cell">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-medium">{pagination.total}</span> results
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {/* Page numbers */}
            <div className="flex gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show first, last, current, and pages around current
                  return (
                    page === 1 ||
                    page === pagination.totalPages ||
                    Math.abs(page - pagination.page) <= 1
                  );
                })
                .map((page, index, array) => {
                  // Add ellipsis
                  if (index > 0 && page - array[index - 1] > 1) {
                    return [
                      <span
                        key={`ellipsis-${page}`}
                        className="px-3 py-1 text-gray-500"
                      >
                        ...
                      </span>,
                      <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`px-3 py-1 border rounded ${
                          pagination.page === page
                            ? "bg-primary-600 text-white border-primary-600"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>,
                    ];
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`px-3 py-1 border rounded ${
                        pagination.page === page
                          ? "bg-primary-600 text-white border-primary-600"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
            </div>

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {materials.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium">No materials found</h3>
          <p className="mt-1 text-sm">
            Try adjusting your filters or run the scrapers to fetch data.
          </p>
        </div>
      )}
    </div>
  );
}

export default MaterialsTable;
