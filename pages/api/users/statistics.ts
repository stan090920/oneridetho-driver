import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const totalUsers = await prisma.user.count();

      // Count distinct users who had sessions created in the last 30 days
      const activeUsers = await prisma.session.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Active within the last 30 days
          }
        },
        _count: {
          _all: true
        }
      });

      const averageUserRating = await prisma.user.aggregate({
        _avg: {
          rating: true,
        }
      });

      res.status(200).json({
        totalUsers,
        activeUsers: activeUsers.length, // Number of distinct active users
        averageUserRating: averageUserRating._avg.rating
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      res.status(500).json({ message: 'Error fetching user statistics' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
