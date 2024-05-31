import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { id, startDate, endDate } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid driver ID' });
    }

    try {
      const driverId = parseInt(id);
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const rides = await prisma.ride.findMany({
        where: {
          driverId: driverId,
          status: 'Completed',
          pickupTime: {
            gte: start,
            lte: end,
          },
        },
      });

      const earnings = rides.map(ride => ({
        id: ride.id,
        date: ride.pickupTime,
        amount: ride.fare * (1 - 0.3),
      }));

      const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);

      res.status(200).json({ rides: earnings, total: totalEarnings });
    } catch (error) {
      console.error('Error fetching earnings:', error);
      res.status(500).json({ message: 'Error fetching earnings' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
