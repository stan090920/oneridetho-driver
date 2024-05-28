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
      const cancelledRides = await prisma.ride.count({
        where: { status: 'Cancelled' }
      });
      const cancellationRate = (cancelledRides / totalRides) * 100;


      res.status(200).json({ cancellationRate });
    } catch (error) {
      console.error('Error fetching cancellation statistics:', error);
      res.status(500).json({ message: 'Error fetching cancellation statistics' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
