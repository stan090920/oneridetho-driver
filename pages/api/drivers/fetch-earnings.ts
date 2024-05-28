import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid driver ID' });
    }

    try {
      const driverId = parseInt(id);

      const rides = await prisma.ride.findMany({
        where: {
          driverId: driverId,
          status: 'Completed',
        },
      });

      const earnings = rides.map(ride => ({
        date: ride.pickupTime,
        amount: ride.fare * (1 - 0.3),
      }));

      const dailyEarnings = calculateDailyEarnings(earnings);
      const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);

      res.status(200).json({ daily: dailyEarnings, total: totalEarnings });
    } catch (error) {
      console.error('Error fetching earnings:', error);
      res.status(500).json({ message: 'Error fetching earnings' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

interface Earning {
  date: Date;
  amount: number;
}

function calculateDailyEarnings(earnings: Earning[]): { date: string, total: number }[] {
  const dailyEarnings: { [key: string]: number } = {};

  earnings.forEach(earning => {
    const dateKey = earning.date.toISOString().split('T')[0];
    if (!dailyEarnings[dateKey]) {
      dailyEarnings[dateKey] = 0;
    }
    dailyEarnings[dateKey] += earning.amount;
  });

  return Object.keys(dailyEarnings).map(date => ({
    date,
    total: dailyEarnings[date],
  }));
}
