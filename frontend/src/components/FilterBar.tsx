import { useState, useEffect } from "react";
import { MaterialFilters } from "../types";
import { api } from "../services/api";

interface FilterBarProps {
  filters: MaterialFilters;
  onFilterChange: (filters: Partial<MaterialFilters>) => void;
}

function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [companies, setCompanies] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState(filters.search || "");

  useEffect(() => {
    // Fetch distinct values for dropdowns
    Promise.all([
      api.getDistinctValues("companyName"),
      api.getDistinctValues("location"),
    ]).then(([companiesData, locationsData]) => {
      setCompanies(companiesData.map((item) => item.value));
      setLocations(locationsData.map((item) => item.value));
    });
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ search: searchInput || undefined });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleClearFilters = () => {
    setSearchInput("");
    onFilterChange({
      search: undefined,
      company: undefined,
      location: undefined,
    });
  };

  const hasActiveFilters =
    filters.search || filters.company || filters.location;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search (All Fields)
          </label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product, phone, email, company..."
            className="input"
          />
        </div>

        {/* Company Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company
          </label>
          <select
            value={filters.company || ""}
            onChange={(e) =>
              onFilterChange({ company: e.target.value || undefined })
            }
            className="select"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <select
            value={filters.location || ""}
            onChange={(e) =>
              onFilterChange({ location: e.target.value || undefined })
            }
            className="select"
          >
            <option value="">All Locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default FilterBar;
