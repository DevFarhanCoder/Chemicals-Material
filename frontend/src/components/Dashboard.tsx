import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";
import {
  Material,
  MaterialFilters,
  DashboardStats,
  MaterialUpdate,
  CurrencyCode,
} from "../types";
import MaterialsTable from "./MaterialsTable";
import FilterBar from "./FilterBar";
import StatsPanel from "./StatsPanel";
import Notification from "./Notification";

function Dashboard() {
  const CURRENCY_OPTIONS: CurrencyCode[] = [
    "INR",
    "USD",
    "EUR",
    "JPY",
    "GBP",
    "AED",
    "CNY",
    "SGD",
    "CAD",
    "AUD",
  ];

  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filters, setFilters] = useState<MaterialFilters>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newMaterialForm, setNewMaterialForm] = useState({
    caseNo: `MANUAL-${Date.now()}`,
    productName: "",
    companyName: "",
    price: "",
    priceCurrency: "INR" as CurrencyCode,
    unit: "",
    email: "",
    mobile: "",
    location: "",
    remarks: "",
    lastContacted: "",
  });
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch materials
  const fetchMaterials = async () => {
    try {
      setIsLoading(true);
      const response = await api.getMaterials(filters);
      setMaterials(response.data);
      setPagination(response.pagination);
    } catch (error) {
      showNotification("Failed to fetch materials", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMaterials();
    fetchStats();
  }, [filters]);

  // Show notification — stable reference via useCallback
  const showNotification = useCallback(
    (message: string, type: "success" | "error" | "info") => {
      setNotification({ message, type });
      if (notifTimer.current) clearTimeout(notifTimer.current);
      notifTimer.current = setTimeout(
        () => setNotification(null),
        type === "success" ? 2000 : 5000,
      );
    },
    [],
  );

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<MaterialFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page on filter change
    }));
  };

  // Handle material update — optimistic: update local state immediately,
  // save to server in the background. Works for both top-level rows and sub-rows.
  const handleMaterialUpdate = useCallback(
    async (id: string, updates: Partial<Material>) => {
      let original: Material | undefined;

      setMaterials((prev) => {
        // Try top-level first
        const top = prev.find((m) => m.id === id);
        if (top) {
          original = top;
          return prev.map((m) => (m.id === id ? { ...m, ...updates } : m));
        }
        // Otherwise search sub-rows
        return prev.map((m) => ({
          ...m,
          subRows: m.subRows?.map((s) => {
            if (s.id === id) {
              original = s;
              return { ...s, ...updates };
            }
            return s;
          }),
        }));
      });

      try {
        await api.updateMaterial(id, updates as MaterialUpdate);
        showNotification("Saved", "success");
      } catch {
        if (original) {
          const captured = original;
          setMaterials((prev) => {
            if (prev.some((m) => m.id === id))
              return prev.map((m) => (m.id === id ? captured : m));
            return prev.map((m) => ({
              ...m,
              subRows: m.subRows?.map((s) => (s.id === id ? captured : s)),
            }));
          });
        }
        showNotification("Failed to save — change reverted", "error");
      }
    },
    [showNotification],
  );

  // Handle material delete — works for both top-level rows and sub-rows
  const handleMaterialDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this material?"))
      return;

    // Optimistic removal
    setMaterials((prev) => {
      if (prev.some((m) => m.id === id)) return prev.filter((m) => m.id !== id);
      return prev.map((m) => ({
        ...m,
        subRows: m.subRows?.filter((s) => s.id !== id),
      }));
    });

    try {
      await api.deleteMaterial(id);
      showNotification("Deleted successfully", "success");
      fetchStats();
    } catch {
      showNotification("Failed to delete — please refresh", "error");
      fetchMaterials();
    }
  };

  // Handle adding a sub-row to an existing parent material
  const handleAddSubRow = async (parentId: string) => {
    const parent = materials.find((m) => m.id === parentId);
    try {
      const newSub = await api.createMaterial({
        caseNo: `${parent?.caseNo || "SUB"}-${Date.now()}`,
        productName: parent?.productName || "Sub Row",
        companyName: parent?.companyName || "New Company",
        sourceUrl: "manual-entry",
        sourceSite: "MANUAL",
        priceCurrency: "INR",
        parentId,
      });
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === parentId
            ? { ...m, subRows: [...(m.subRows || []), newSub] }
            : m,
        ),
      );
      showNotification("Sub row added. Click fields to edit.", "success");
    } catch {
      showNotification("Failed to add sub row", "error");
    }
  };

  // Handle bulk delete — deletes all selected IDs in parallel, optimistically
  const handleMaterialDeleteMany = useCallback(
    async (ids: string[]) => {
      // Optimistically remove from UI immediately
      setMaterials((prev) => prev.filter((m) => !ids.includes(m.id)));

      try {
        await Promise.all(ids.map((id) => api.deleteMaterial(id)));
        showNotification(`${ids.length} row(s) deleted`, "success");
        fetchStats();
        fetchMaterials(); // refresh count / pagination
      } catch {
        showNotification("Some deletions failed — please refresh", "error");
        fetchMaterials();
      }
    },
    [showNotification],
  );

  // Open add-material form
  const handleMaterialAdd = () => {
    setNewMaterialForm({
      caseNo: `MANUAL-${Date.now()}`,
      productName: "",
      companyName: "",
      price: "",
      priceCurrency: "INR",
      unit: "",
      email: "",
      mobile: "",
      location: "",
      remarks: "",
      lastContacted: "",
    });
    setShowAddForm(true);
  };

  // Publish material from form
  const handlePublishMaterial = async () => {
    if (!newMaterialForm.caseNo.trim()) {
      showNotification("CAS No. is required", "error");
      return;
    }
    if (!newMaterialForm.productName.trim()) {
      showNotification("Product Name is required", "error");
      return;
    }
    if (!newMaterialForm.companyName.trim()) {
      showNotification("Company Name is required", "error");
      return;
    }

    try {
      setIsPublishing(true);
      await api.createMaterial({
        caseNo: newMaterialForm.caseNo.trim(),
        productName: newMaterialForm.productName.trim(),
        companyName: newMaterialForm.companyName.trim(),
        sourceUrl: "manual-entry",
        sourceSite: "MANUAL",
        price: newMaterialForm.price.trim() || null,
        priceCurrency: newMaterialForm.priceCurrency,
        unit: newMaterialForm.unit.trim() || null,
        email: newMaterialForm.email.trim() || null,
        mobile: newMaterialForm.mobile.trim() || null,
        location: newMaterialForm.location.trim() || null,
        remarks: newMaterialForm.remarks.trim() || null,
        lastContacted: newMaterialForm.lastContacted
          ? `${newMaterialForm.lastContacted}T00:00:00.000Z`
          : null,
      });
      showNotification("Material published successfully", "success");
      setShowAddForm(false);
      fetchMaterials();
      fetchStats();
    } catch (error) {
      showNotification("Failed to publish material", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Chemical Materials Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Admin-only material aggregation from supplier websites
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-6 py-6">
        {/* Stats Panel */}
        {stats && <StatsPanel stats={stats} />}

        {/* Filter Bar */}
        <FilterBar filters={filters} onFilterChange={handleFilterChange} />

        {/* Materials Table */}
        <div className="mt-6">
          <MaterialsTable
            materials={materials}
            pagination={pagination}
            isLoading={isLoading}
            onUpdate={handleMaterialUpdate}
            onDelete={handleMaterialDelete}
            onDeleteMany={handleMaterialDeleteMany}
            onAdd={handleMaterialAdd}
            onAddSubRow={handleAddSubRow}
            onPageChange={(page: number) =>
              setFilters((prev) => ({ ...prev, page }))
            }
            onSortChange={(sortBy: string, sortOrder: "asc" | "desc") =>
              setFilters((prev) => ({ ...prev, sortBy, sortOrder }))
            }
          />
        </div>
      </main>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Add Material Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Add New Material
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  CAS No. *
                </span>
                <input
                  value={newMaterialForm.caseNo}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      caseNo: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Product Name *
                </span>
                <input
                  value={newMaterialForm.productName}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      productName: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Company Name *
                </span>
                <input
                  value={newMaterialForm.companyName}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Upload Currency
                </span>
                <select
                  value={newMaterialForm.priceCurrency}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      priceCurrency: e.target.value as CurrencyCode,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                >
                  {CURRENCY_OPTIONS.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Price</span>
                <input
                  value={newMaterialForm.price}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  placeholder={`Enter amount in ${newMaterialForm.priceCurrency}`}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Unit</span>
                <input
                  value={newMaterialForm.unit}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      unit: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Email</span>
                <input
                  value={newMaterialForm.email}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Contact No.
                </span>
                <input
                  value={newMaterialForm.mobile}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      mobile: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  State Location
                </span>
                <input
                  value={newMaterialForm.location}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-gray-700">Date</span>
                <input
                  type="date"
                  value={newMaterialForm.lastContacted}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      lastContacted: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-gray-700">
                  Remark
                </span>
                <textarea
                  value={newMaterialForm.remarks}
                  onChange={(e) =>
                    setNewMaterialForm((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishMaterial}
                disabled={isPublishing}
                className="px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {isPublishing ? "Publishing..." : "Publish Row"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
