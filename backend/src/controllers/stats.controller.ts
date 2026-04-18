import { Request, Response, NextFunction } from "express";
import { Material } from "../models/Material";

/**
 * GET /api/stats
 * Get dashboard statistics
 */
export const getStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, byStatus, byCompany, recentlyAdded] = await Promise.all([
      Material.countDocuments(),

      Material.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      Material.aggregate([
        { $match: { companyName: { $ne: null } } },
        { $group: { _id: "$companyName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { company_name: "$_id", count: 1, _id: 0 } },
      ]),

      Material.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    const statusStats = {
      PENDING: 0,
      CONTACTED: 0,
      NOT_INTERESTED: 0,
      CONVERTED: 0,
    };

    byStatus.forEach((item: any) => {
      if (item._id in statusStats) {
        statusStats[item._id as keyof typeof statusStats] = item.count;
      }
    });

    res.json({
      total,
      byStatus: statusStats,
      byCompany,
      recentlyAdded,
    });
  } catch (error) {
    return next(error);
  }
};
