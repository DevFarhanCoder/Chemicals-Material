import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { Material } from "../models/Material";
import { AdminAction } from "../models/AdminAction";
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
    const filters = MaterialFiltersSchema.parse(req.query);

    const query: any = { parentId: null };

    if (filters.search) {
      const re = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { productName: re },
        { caseNo: re },
        { email: re },
        { mobile: re },
        { companyName: re },
        { location: re },
        { price: re },
        { remarks: re },
      ];
    }

    if (filters.company) {
      query.companyName = new RegExp(filters.company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    if (filters.location) {
      query.location = new RegExp(filters.location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = (filters.page - 1) * filters.limit;
    const sortDir = filters.sortOrder === "asc" ? 1 : -1;

    const [topRows, total] = await Promise.all([
      Material.find(query)
        .sort({ [filters.sortBy]: sortDir })
        .skip(skip)
        .limit(filters.limit)
        .lean(),
      Material.countDocuments(query),
    ]);

    const topIds = topRows.map((r: any) => r._id);
    const allSubRows = await Material.find({ parentId: { $in: topIds } })
      .sort({ createdAt: 1 })
      .lean();

    const subRowMap: Record<string, any[]> = {};
    for (const sub of allSubRows) {
      const pid = (sub as any).parentId;
      if (!subRowMap[pid]) subRowMap[pid] = [];
      subRowMap[pid].push({ ...(sub as any), id: (sub as any)._id });
    }

    const materials = topRows.map((r: any) => ({
      ...r,
      id: r._id,
      subRows: subRowMap[r._id] || [],
    }));

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

    const material = await Material.findById(id).lean();

    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    res.json({ ...(material as any), id: (material as any)._id });
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
    const createData = CreateMaterialSchema.parse(req.body);

    const newMaterial = await Material.create({
      _id: randomUUID(),
      ...createData,
      status: createData.status || "PENDING",
      scrapedAt: new Date(),
    });

    logger.info(`Material ${newMaterial._id} created manually`);

    res.status(201).json({ ...newMaterial.toJSON(), id: newMaterial._id });
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
    const updateData = UpdateMaterialSchema.parse(req.body);

    const existingMaterial = await Material.findById(id);
    if (!existingMaterial) {
      return res.status(404).json({ error: "Material not found" });
    }

    const adminActions: Promise<any>[] = [];

    if (updateData.status && updateData.status !== existingMaterial.status) {
      adminActions.push(
        AdminAction.create({
          materialId: id,
          action: "status_change",
          oldValue: existingMaterial.status,
          newValue: updateData.status,
        }),
      );
    }

    if (updateData.remarks && updateData.remarks !== existingMaterial.remarks) {
      adminActions.push(
        AdminAction.create({
          materialId: id,
          action: "remark_added",
          oldValue: existingMaterial.remarks || "",
          newValue: updateData.remarks,
        }),
      );
    }

    await Promise.all(adminActions);

    const updatePayload: any = { ...updateData };
    if (updateData.lastContacted !== undefined) {
      updatePayload.lastContacted = updateData.lastContacted
        ? new Date(updateData.lastContacted)
        : null;
    }

    const updatedMaterial = await Material.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, lean: true },
    );

    logger.info(`Material ${id} updated`, { changes: updateData });

    res.json({ ...(updatedMaterial as any), id });
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

    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Delete sub-rows first, then parent (cascade)
    await Material.deleteMany({ parentId: id });
    await Material.findByIdAndDelete(id);

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

    const allowedFields = ["companyName", "location", "status", "sourceSite"];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: "Invalid field" });
    }

    const values = await Material.distinct(field, { [field]: { $ne: null } });
    values.sort();

    res.json(values.map((v) => ({ value: v })));
  } catch (error) {
    return next(error);
  }
};
