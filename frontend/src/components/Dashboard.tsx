import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Material, MaterialFilters, DashboardStats } from "../types";
import MaterialsTable from "./MaterialsTable";
import FilterBar from "./FilterBar";
import StatsPanel from "./StatsPanel";
import Notification from "./Notification";

function Dashboard() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filters, setFilters] = useState<MaterialFilters>({
    page: 1,
    limit: 50,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

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

  // Show notification
  const showNotification = (
    message: string,
    type: "success" | "error" | "info",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<MaterialFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page on filter change
    }));
  };

  // Handle material update
  const handleMaterialUpdate = async (
    id: string,
    updates: Partial<Material>,
  ) => {
    try {
      // Convert null to undefined for API compatibility
      const cleanedUpdates = {
        ...updates,
        remarks: updates.remarks === null ? undefined : updates.remarks,
        lastContacted:
          updates.lastContacted === null ? undefined : updates.lastContacted,
      };
      await api.updateMaterial(id, cleanedUpdates);
      showNotification("Material updated successfully", "success");
      fetchMaterials();
      fetchStats();
    } catch (error) {
      showNotification("Failed to update material", "error");
    }
  };

  // Handle material delete
  const handleMaterialDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this material?")) {
      return;
    }

    try {
      await api.deleteMaterial(id);
      showNotification("Material deleted successfully", "success");
      fetchMaterials();
      fetchStats();
    } catch (error) {
      showNotification("Failed to delete material", "error");
    }
  };

  // Handle material add
  const handleMaterialAdd = async () => {
    try {
      // Create a new material with default values
      await api.createMaterial({
        caseNo: "000-00-0",
        productName: "New Product",
        companyName: "New Company",
        sourceUrl: "manual-entry",
        sourceSite: "MANUAL",
      });
      showNotification("Material added successfully. Click fields to edit.", "success");
      fetchMaterials();
      fetchStats();
    } catch (error) {
      showNotification("Failed to add material", "error");
    }
  };

  // Handle scraping trigger
  const handleTriggerScraping = async () => {
    try {
      await api.triggerScraping();
      showNotification(
        "Scraping started. This may take a few minutes.",
        "info",
      );
    } catch (error) {
      showNotification("Failed to trigger scraping", "error");
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchMaterials();
    fetchStats();
    showNotification("Data refreshed", "success");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Chemical Materials Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Admin-only material aggregation from supplier websites
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                <span className="mr-2">🔄</span>
                Refresh
              </button>
              <button
                onClick={handleTriggerScraping}
                className="btn btn-primary"
              >
                <span className="mr-2">🕷️</span>
                Run Scrapers
              </button>
            </div>
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
