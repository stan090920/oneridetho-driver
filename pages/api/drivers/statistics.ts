import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const totalDrivers = await prisma.driver.count();
      
      const averageRating = await prisma.driver.aggregate({
        _avg: {
          rating: true,
        }
      });

      // Finding top-performing drivers based on completed rides
      const topPerformingDrivers = await prisma.driver.findMany({
        select: {
          id: true,
          name: true,
          rides: {
            where: {
              status: 'Completed'
            },
            select: {
              id: true
            }
          }
        }
      });

      const topDrivers = topPerformingDrivers.map(driver => ({
        id: driver.id,
        name: driver.name,
        completedRides: driver.rides.length
      })).sort((a, b) => b.completedRides - a.completedRides).slice(0, 5);

      res.status(200).json({
        totalDrivers,
        averageRating: averageRating._avg.rating,
        topPerformingDrivers: topDrivers
      });
    } catch (error) {
      console.error('Error fetching driver statistics:', error);
      res.status(500).json({ message: 'Error fetching driver statistics' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
