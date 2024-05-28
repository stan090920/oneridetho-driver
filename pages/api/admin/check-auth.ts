import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = verify(token, secret!);
    const admin = await prisma.admin.findUnique({
      where: {
        id: (decoded as any).id,
      },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    res.status(200).json({ id: admin.id });
  } catch (error: any) {
    console.error('Error in check-auth API:', error.message);
    res.status(401).json({ message: 'Unauthorized' });
  }
}
