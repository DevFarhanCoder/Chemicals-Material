import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import {
  MaterialFiltersSchema,
  UpdateMaterialSchema,
  CreateMaterialSchema,
} from "../types/validation";
import logger from "../config/logger";

/**
 * GET /api/materials
 * List all materials with optional filtering and pagination
 */
export const listMaterials = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Validate query parameters
    const filters = MaterialFiltersSchema.parse(req.query);

    // Build where clause
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { productName: { contains: filters.search, mode: "insensitive" } },
        { caseNo: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { mobile: { contains: filters.search, mode: "insensitive" } },
        { companyName: { contains: filters.search, mode: "insensitive" } },
        { location: { contains: filters.search, mode: "insensitive" } },
        { price: { contains: filters.search, mode: "insensitive" } },
        { remarks: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.company) {
      where.companyName = { contains: filters.company, mode: "insensitive" };
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: "insensitive" };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Calculate pagination
    const skip = (filters.page - 1) * filters.limit;
    const take = filters.limit;

    // Only return top-level rows (parentId IS NULL); sub-rows are nested inside
    const topLevelWhere = { ...where, parentId: null };

    // Execute query
    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where: topLevelWhere,
        include: { subRows: { orderBy: { createdAt: "asc" } } },
        skip,
        take,
        orderBy: {
          [filters.sortBy]: filters.sortOrder,
        },
      }),
      prisma.material.count({ where: topLevelWhere }),
    ]);

    res.json({
      data: materials,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/materials/:id
 * Get a single material by ID
 */
export const getMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const material = await prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    res.json(material);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/materials
 * Create a new material (admin action)
 */
export const createMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Validate create data
    const createData = CreateMaterialSchema.parse(req.body);

    // Create material with default status
    const newMaterial = await prisma.material.create({
      data: {
        ...createData,
        status: createData.status || "PENDING",
        scrapedAt: new Date(),
      },
    });

    logger.info(`Material ${newMaterial.id} created manually`);

    res.status(201).json(newMaterial);
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/materials/:id
 * Update a material (admin action)
 */
export const updateMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    // Validate update data
    const updateData = UpdateMaterialSchema.parse(req.body);

    // Check if material exists
    const existingMaterial = await prisma.material.findUnique({
      where: { id },
    });

    if (!existingMaterial) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Log admin action if status changed
    if (updateData.status && updateData.status !== existingMaterial.status) {
      await prisma.adminAction.create({
        data: {
          materialId: id,
          action: "status_change",
          oldValue: existingMaterial.status,
          newValue: updateData.status,
        },
      });
    }

    // Log admin action if remarks changed
    if (updateData.remarks && updateData.remarks !== existingMaterial.remarks) {
      await prisma.adminAction.create({
        data: {
          materialId: id,
          action: "remark_added",
          oldValue: existingMaterial.remarks || "",
          newValue: updateData.remarks,
        },
      });
    }

    // Update material
    const updatedMaterial = await prisma.material.update({
      where: { id },
      data: {
        ...updateData,
        // Explicitly handle lastContacted so null correctly clears the field
        ...(updateData.lastContacted !== undefined
          ? {
              lastContacted: updateData.lastContacted
                ? new Date(updateData.lastContacted)
                : null,
            }
          : {}),
      },
    });

    logger.info(`Material ${id} updated`, { changes: updateData });

    res.json(updatedMaterial);
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/materials/:id
 * Delete a material
 */
export const deleteMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    // Check if material exists
    const material = await prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Delete material
    await prisma.material.delete({
      where: { id },
    });

    logger.info(`Material ${id} deleted`);

    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/materials/distinct/:field
 * Get distinct values for a field (for filter dropdowns)
 */
export const getDistinctValues = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { field } = req.params;

    // Validate field and map to database column names
    const fieldMapping: Record<string, string> = {
      companyName: "company_name",
      location: "location",
      status: "status",
      sourceSite: "source_site",
    };

    if (!fieldMapping[field]) {
      return res.status(400).json({ error: "Invalid field" });
    }

    const dbColumnName = fieldMapping[field];

    // Get distinct values - use raw query for flexibility
    const result = await prisma.$queryRawUnsafe(
      `SELECT DISTINCT "${dbColumnName}" as value FROM materials WHERE "${dbColumnName}" IS NOT NULL ORDER BY "${dbColumnName}"`,
    );

    res.json(result);
  } catch (error) {
    return next(error);
  }
};
