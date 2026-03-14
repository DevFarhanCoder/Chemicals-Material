import { Router } from "express";
import {
  listMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getDistinctValues,
} from "../controllers/materials.controller";

const router = Router();

/**
 * @route   GET /api/materials
 * @desc    List all materials with filtering and pagination
 * @query   search, company, location, status, priceMin, priceMax, page, limit, sortBy, sortOrder
 */
router.get("/", listMaterials);

/**
 * @route   GET /api/materials/distinct/:field
 * @desc    Get distinct values for a field (for dropdowns)
 * @params  field (companyName, location, status, sourceSite)
 */
router.get("/distinct/:field", getDistinctValues);

/**
 * @route   GET /api/materials/:id
 * @desc    Get a single material by ID
 */
router.get("/:id", getMaterial);

/**
 * @route   POST /api/materials
 * @desc    Create a new material
 */
router.post("/", createMaterial);

/**
 * @route   PUT /api/materials/:id
 * @desc    Update a material
 */
router.put("/:id", updateMaterial);

/**
 * @route   DELETE /api/materials/:id
 * @desc    Delete a material
 */
router.delete("/:id", deleteMaterial);

export default router;
