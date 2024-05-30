import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

interface EarningsByDriver {
  driverId: number;
  _sum: {
    fare: number | null;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Total earnings for completed rides
      const totalEarningsResult = await prisma.ride.aggregate({
        _sum: {
          fare: true,
        },
        where: {
          status: 'Completed',
        },
      });
      const totalEarnings = totalEarningsResult._sum.fare ?? 0;

      // Calculate OneRideTho's payment
      const oneRideThoPayment = totalEarnings * 0.30;

      // Earnings by driver for completed rides
      const earningsByDriver: EarningsByDriver[] = await prisma.ride.groupBy({
        by: ['driverId'],
        _sum: {
          fare: true,
        },
        where: {
          status: 'Completed',
        },
      }) as unknown as EarningsByDriver[];

      // Fetch driver names separately
      const driverIds = earningsByDriver.map((item) => item.driverId);
      const drivers = await prisma.driver.findMany({
        where: {
          id: { in: driverIds },
        },
        select: {
          id: true,
          name: true,
        },
      });

      // Map driver names to the earningsByDriver results and sort by earnings in descending order
      const earningsWithDriverNames = earningsByDriver.map((item) => {
        const driver = drivers.find((driver) => driver.id === item.driverId);
        return {
          driverId: item.driverId,
          driverName: driver ? driver.name : 'Unknown',
          amount: item._sum.fare ?? 0, // Ensure a default value of 0 if fare is null
        };
      }).sort((a, b) => b.amount - a.amount);

      // Earnings trends over time for completed rides
      const earningsTrendsRaw = await prisma.ride.groupBy({
        by: ['pickupTime'],
        _sum: {
          fare: true,
        },
        where: {
          status: 'Completed',
        },
        orderBy: {
          pickupTime: 'asc',
        },
      });

      // Transform the earningsTrends data to match the required format
      const earningsTrends = earningsTrendsRaw.map(item => ({
        date: item.pickupTime.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        earnings: item._sum.fare ?? 0,
      }));

      res.status(200).json({
        totalEarnings,
        oneRideThoPayment,
        earningsByDriver: earningsWithDriverNames,
        earningsTrends,
      });
    } catch (error) {
      console.error('Error fetching earnings statistics:', error);
      res.status(500).json({ message: 'Error fetching earnings statistics' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
