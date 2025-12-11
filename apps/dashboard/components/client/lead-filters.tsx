"use client";

import { useState } from "react";
import { Select } from "../ui/select";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Search, Filter, X } from "lucide-react";

export interface LeadFilterOptions {
  searchQuery: string;
  state: string;
  dateRange: string;
  sortBy: string;
}

interface LeadFiltersProps {
  onFilterChange: (filters: LeadFilterOptions) => void;
  initialFilters?: Partial<LeadFilterOptions>;
}

export default function LeadFilters({ onFilterChange, initialFilters }: LeadFiltersProps) {
  const [filters, setFilters] = useState<LeadFilterOptions>({
    searchQuery: initialFilters?.searchQuery ?? "",
    state: initialFilters?.state ?? "all",
    dateRange: initialFilters?.dateRange ?? "all",
    sortBy: initialFilters?.sortBy ?? "newest",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof LeadFilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: LeadFilterOptions = {
      searchQuery: "",
      state: "all",
      dateRange: "all",
      sortBy: "newest",
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const stateOptions = [
    { value: "all", label: "All States" },
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "proposal", label: "Proposal Sent" },
    { value: "negotiation", label: "Negotiation" },
    { value: "won", label: "Won" },
    { value: "lost", label: "Lost" },
  ];

  const dateRangeOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "name_asc", label: "Name (A-Z)" },
    { value: "name_desc", label: "Name (Z-A)" },
    { value: "value_high", label: "Value (High to Low)" },
    { value: "value_low", label: "Value (Low to High)" },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search leads by name, email, or phone..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
              className="pl-10"
              fullWidth
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2">
          <Select
            options={stateOptions}
            value={filters.state}
            onChange={(e) => handleFilterChange("state", e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showAdvanced ? "Hide" : "More"}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Date Range"
              options={dateRangeOptions}
              value={filters.dateRange}
              onChange={(e) => handleFilterChange("dateRange", e.target.value)}
              fullWidth
            />
            <Select
              label="Sort By"
              options={sortOptions}
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              fullWidth
            />
            <div className="flex items-end">
              <Button variant="outline" onClick={handleReset} fullWidth>
                <X className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
