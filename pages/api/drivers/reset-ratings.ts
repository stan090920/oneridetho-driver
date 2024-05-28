import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    const { id } = req.query;

    try {
      const driverId = parseInt(id as string);
      const updatedDriver = await prisma.driver.update({
        where: { id: driverId },
        data: {
          ratings: {
            deleteMany: {},
          },
          numberOfRatings: 0,
          rating: 0,
        },
      });

      res.status(200).json({ message: 'Driver ratings reset successfully' });
    } catch (error) {
      console.error('Error resetting driver ratings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}
