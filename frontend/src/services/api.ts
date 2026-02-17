import axios, { AxiosInstance } from "axios";
import {
  Material,
  MaterialUpdate,
  MaterialFilters,
  MaterialsResponse,
  DashboardStats,
  ScrapingStatus,
  ScrapingLog,
} from "../types";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || "/api",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
      },
    );
  }

  // ==================== Materials ====================

  async getMaterials(filters?: MaterialFilters): Promise<MaterialsResponse> {
    const response = await this.client.get<MaterialsResponse>("/materials", {
      params: filters,
    });
    return response.data;
  }

  async getMaterial(id: string): Promise<Material> {
    const response = await this.client.get<Material>(`/materials/${id}`);
    return response.data;
  }

  async updateMaterial(id: string, data: MaterialUpdate): Promise<Material> {
    const response = await this.client.put<Material>(`/materials/${id}`, data);
    return response.data;
  }

  async deleteMaterial(id: string): Promise<void> {
    await this.client.delete(`/materials/${id}`);
  }

  async getDistinctValues(field: string): Promise<Array<{ value: string }>> {
    const response = await this.client.get<Array<{ value: string }>>(
      `/materials/distinct/${field}`,
    );
    return response.data;
  }

  // ==================== Stats ====================

  async getStats(): Promise<DashboardStats> {
    const response = await this.client.get<DashboardStats>("/stats");
    return response.data;
  }

  // ==================== Scraping ====================

  async triggerScraping(sources?: string[]): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>(
      "/scraping/trigger",
      { sources },
    );
    return response.data;
  }

  async getScrapingStatus(): Promise<ScrapingStatus> {
    const response = await this.client.get<ScrapingStatus>("/scraping/status");
    return response.data;
  }

  async getScrapingLogs(limit = 20, source?: string): Promise<ScrapingLog[]> {
    const response = await this.client.get<ScrapingLog[]>("/scraping/logs", {
      params: { limit, source },
    });
    return response.data;
  }
}

export const api = new ApiClient();
