import { z } from "zod";

// Material validation schema
export const MaterialSchema = z.object({
  productName: z.string().min(1).max(500),
  email: z.string().email().optional().nullable(),
  mobile: z.string().max(50).optional().nullable(),
  companyName: z.string().min(1).max(255),
  location: z.string().max(255).optional().nullable(),
  price: z.string().max(100).optional().nullable(),
  status: z
    .enum(["PENDING", "CONTACTED", "NOT_INTERESTED", "CONVERTED"])
    .optional(),
  remarks: z.string().optional().nullable(),
  lastContacted: z.string().datetime().optional().nullable(),
});

// Update material schema (partial)
export const UpdateMaterialSchema = MaterialSchema.partial();

// Create material schema (required fields only)
export const CreateMaterialSchema = z.object({
  caseNo: z.string().min(1).max(50),
  productName: z.string().min(1).max(500),
  companyName: z.string().min(1).max(255),
  sourceUrl: z.string().min(1),
  sourceSite: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  mobile: z.string().max(50).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  price: z.string().max(100).optional().nullable(),
  status: z
    .enum(["PENDING", "CONTACTED", "NOT_INTERESTED", "CONVERTED"])
    .optional(),
  remarks: z.string().optional().nullable(),
});

// Query filters schema
export const MaterialFiltersSchema = z.object({
  search: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  status: z
    .enum(["PENDING", "CONTACTED", "NOT_INTERESTED", "CONVERTED"])
    .optional(),
  priceMin: z.string().optional(),
  priceMax: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type MaterialInput = z.infer<typeof MaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof UpdateMaterialSchema>;
export type CreateMaterialInput = z.infer<typeof CreateMaterialSchema>;
export type MaterialFilters = z.infer<typeof MaterialFiltersSchema>;
