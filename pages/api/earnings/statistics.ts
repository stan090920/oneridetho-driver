import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

interface EarningsByDriver {
  driverId: number;
  _sum: {
    fare: number | null;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Total earnings
      const totalEarningsResult = await prisma.ride.aggregate({
        _sum: {
          fare: true,
        },
      });
      const totalEarnings = totalEarningsResult._sum.fare ?? 0;

      // Earnings by driver
      const earningsByDriver: EarningsByDriver[] = await prisma.ride.groupBy({
        by: ['driverId'],
        _sum: {
          fare: true,
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

      // Map driver names to the earningsByDriver results
      const earningsWithDriverNames = earningsByDriver.map((item) => {
        const driver = drivers.find((driver) => driver.id === item.driverId);
        return {
          driverId: item.driverId,
          driverName: driver ? driver.name : 'Unknown',
          amount: item._sum.fare ?? 0, // Ensure a default value of 0 if fare is null
        };
      });

      // Earnings trends over time
      const earningsTrends = await prisma.ride.groupBy({
        by: ['pickupTime'],
        _sum: {
          fare: true,
        },
        orderBy: {
          pickupTime: 'asc',
        },
      });

      res.status(200).json({
        totalEarnings,
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
