import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";
import {
  Material,
  MaterialFilters,
  DashboardStats,
  MaterialUpdate,
} from "../types";
import MaterialsTable from "./MaterialsTable";
import FilterBar from "./FilterBar";
import StatsPanel from "./StatsPanel";
import Notification from "./Notification";

function Dashboard() {
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
  // save to server in the background. No full page re-fetch on success.
  const handleMaterialUpdate = useCallback(
    async (id: string, updates: Partial<Material>) => {
      // Capture original for rollback
      let original: Material | undefined;
      setMaterials((prev) => {
        original = prev.find((m) => m.id === id);
        return prev.map((m) => (m.id === id ? { ...m, ...updates } : m));
      });

      try {
        await api.updateMaterial(id, updates as MaterialUpdate);
        showNotification("Saved", "success");
      } catch {
        // Revert on failure
        if (original) {
          setMaterials((prev) =>
            prev.map((m) => (m.id === id ? original! : m)),
          );
        }
        showNotification("Failed to save — change reverted", "error");
      }
    },
    [showNotification],
  );

  // Handle material delete
  const handleMaterialDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this material?")) {
      return;
    }

    try {
      await api.deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      showNotification("Material deleted successfully", "success");
      fetchStats();
    } catch (error) {
      showNotification("Failed to delete material", "error");
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

  // Handle material add
  const handleMaterialAdd = async () => {
    try {
      // Create a new material with default values (unique caseNo using timestamp)
      await api.createMaterial({
        caseNo: `MANUAL-${Date.now()}`,
        productName: "New Product",
        companyName: "New Company",
        sourceUrl: "manual-entry",
        sourceSite: "MANUAL",
      });
      showNotification(
        "Material added successfully. Click fields to edit.",
        "success",
      );
      fetchMaterials();
      fetchStats();
    } catch (error) {
      showNotification("Failed to add material", "error");
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
    </div>
  );
}

export default Dashboard;
