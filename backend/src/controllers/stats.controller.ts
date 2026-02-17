import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";

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
    // Get total counts
    const [total, byStatus, byCompany, recentlyAdded] = await Promise.all([
      // Total materials
      prisma.material.count(),

      // Count by status
      prisma.material.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Count by company (top 10)
      prisma.$queryRaw`
        SELECT company_name, COUNT(*)::integer as count
        FROM materials
        GROUP BY company_name
        ORDER BY count DESC
        LIMIT 10
      `,

      // Recently added (last 7 days)
      prisma.material.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Transform status counts
    const statusStats = {
      PENDING: 0,
      CONTACTED: 0,
      NOT_INTERESTED: 0,
      CONVERTED: 0,
    };

    byStatus.forEach((item: any) => {
      statusStats[item.status as keyof typeof statusStats] = item._count;
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
