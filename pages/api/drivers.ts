import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (req.query.id) {
      // Fetch a specific driver by ID
      try {
        const driverId = parseInt(req.query.id as string);
        const driver = await prisma.driver.findUnique({
          where: {
            id: driverId
          }
        });

        if (!driver) {
          res.status(404).json({ message: 'Driver not found' });
          return;
        }

        res.status(200).json(driver);
      } catch (error) {
        console.error('Error fetching driver:', error);
        res.status(500).json({ message: 'Error fetching driver' });
      }
    } else {
      // Fetch all drivers
      try {
        const drivers = await prisma.driver.findMany();
        res.status(200).json(drivers);
      } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).json({ message: 'Error fetching drivers' });
      }
    }
  } else if (req.method === 'POST') {
    // Add a new driver
    try {
      const { name, email, carType, licensePlate, phone, password, photoUrl, carImageUrl } = req.body;

      const hashedPassword = await bcrypt.hash(password, 12);

      const newDriver = await prisma.driver.create({
        data: {
          name,
          email,
          carType,
          licensePlate,
          phone,
          password: hashedPassword,
          photoUrl,
          carImageUrl,
        },
      });

      res.status(201).json(newDriver);
    } catch (error) {
      console.error('Error adding driver:', error);
      res.status(500).json({ message: 'Error adding driver' });
    }
  } else if (req.method === 'PUT') {
    // Update driver information
    try {
      const driverId = parseInt(req.query.id as string);
      const { name, email, carType, licensePlate, phone, photoUrl, carImageUrl  } = req.body;

      await prisma.driver.update({
        where: {
          id: driverId
        },
        data: {
          name,
          email,
          carType,
          licensePlate,
          phone,
          photoUrl,
          carImageUrl,
          rating: 0,
          numberOfRatings: 0,
        },
      });

      res.status(200).json({ message: 'Driver updated successfully' });
    } catch (error) {
      console.error('Error updating driver:', error);
      res.status(500).json({ message: 'Error updating driver' });
    }
  } else if (req.method === 'DELETE') {
    // Delete driver
    try {
      const driverId = parseInt(req.query.id as string);

      if (isNaN(driverId)) {
        return res.status(400).json({ message: 'Invalid driver ID' });
      }

      // Log the driverId to be deleted
      console.log(`Attempting to delete driver with ID: ${driverId}`);

      // First, delete all related ratings
      await prisma.rating.deleteMany({
        where: { driverId },
      });

      // Then, delete the driver
      await prisma.driver.delete({
        where: { id: driverId },
      });

      res.status(200).json({ message: 'Driver deleted successfully' });
    } catch (error) {
      console.error('Error deleting driver:', error);
      res.status(500).json({ message: 'Error deleting driver' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
