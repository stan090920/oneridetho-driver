import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const totalRides = await prisma.ride.count();
      const activeRides = await prisma.ride.count({
        where: { status: 'InProgress' }
      });
      const scheduledRides = await prisma.ride.count({
        where: { status: 'Scheduled' }
      });
      const completedRides = await prisma.ride.count({
        where: { status: 'Completed' }
      });
      const cancelledRides = await prisma.ride.count({
        where: { status: 'Cancelled' }
      });

      res.status(200).json({ totalRides, activeRides, scheduledRides, completedRides, cancelledRides });
    } catch (error) {
      console.error('Error fetching ride statistics:', error);
      res.status(500).json({ message: 'Error fetching ride statistics' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
