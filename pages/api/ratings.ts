// pages/api/driver/ratings.ts

import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const ratings = await prisma.driver.findUnique({
        where: { id: session.user.id },
        include: { ratings: true },
      });

      if (!ratings) {
        return res.status(404).json({ message: 'Driver not found' });
      }

      res.status(200).json(ratings);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      res.status(500).json({ message: 'Error fetching ratings' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
