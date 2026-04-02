// Material types
export type MaterialStatus =
  | "PENDING"
  | "CONTACTED"
  | "NOT_INTERESTED"
  | "CONVERTED";

export interface Material {
  id: string;
  caseNo: string;
  productName: string;
  email: string | null;
  mobile: string | null;
  companyName: string;
  location: string | null;
  price: string | null;
  status: MaterialStatus;
  remarks: string | null;
  lastContacted: string | null;
  sourceUrl: string;
  sourceSite: string;
  scrapedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialUpdate {
  caseNo?: string;
  productName?: string;
  email?: string | null;
  mobile?: string | null;
  companyName?: string;
  location?: string | null;
  price?: string | null;
  status?: MaterialStatus;
  remarks?: string | null;
  lastContacted?: string | null;
}

export interface MaterialFilters {
  search?: string;
  company?: string;
  location?: string;
  status?: MaterialStatus;
  priceMin?: string;
  priceMax?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MaterialsResponse {
  data: Material[];
  pagination: PaginationInfo;
}

// Stats types
export interface DashboardStats {
  total: number;
  byStatus: {
    PENDING: number;
    CONTACTED: number;
    NOT_INTERESTED: number;
    CONVERTED: number;
  };
  byCompany: Array<{ company_name: string; count: number }>;
  recentlyAdded: number;
}

// Scraping types
export interface ScrapingLog {
  id: string;
  source: string;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL";
  itemsScraped: number;
  itemsFailed: number;
  errors: any;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
}

export interface ScrapingStatus {
  isRunning: boolean;
  activeSources: string[];
  recentLogs: ScrapingLog[];
}
