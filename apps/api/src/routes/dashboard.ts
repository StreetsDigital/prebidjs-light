import { FastifyInstance } from 'fastify';
import { db, publishers, adUnits, users } from '../db';
import { requireAuth, requireAdmin, TokenPayload } from '../middleware/auth';
import { eq } from 'drizzle-orm';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard stats - admin only
  fastify.get('/stats', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const user = request.user as TokenPayload;

    // Count publishers
    const allPublishers = db.select().from(publishers).all();
    const totalPublishers = allPublishers.length;
    const activePublishers = allPublishers.filter(p => p.status === 'active').length;

    // Count ad units
    const allAdUnits = db.select().from(adUnits).all();
    const totalAdUnits = allAdUnits.length;
    const activeAdUnits = allAdUnits.filter(u => u.status === 'active').length;

    // Count users
    const allUsers = db.select().from(users).all();
    const totalUsers = allUsers.length;

    // For impressions and revenue, return mock data for now
    // In a real implementation, these would come from analytics tables
    const todayImpressions = 0;
    const todayRevenue = 0;

    return {
      publishers: {
        total: totalPublishers,
        active: activePublishers,
      },
      adUnits: {
        total: totalAdUnits,
        active: activeAdUnits,
      },
      users: {
        total: totalUsers,
      },
      today: {
        impressions: todayImpressions,
        revenue: todayRevenue,
      },
    };
  });
}
