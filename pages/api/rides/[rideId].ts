import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { Twilio } from 'twilio';

const prisma = new PrismaClient();
const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { rideId } = req.query;

  try {
    const rideIdNumber = parseInt(rideId as string);

    if (req.method === 'GET') {
      const ride = await prisma.ride.findUnique({
        where: { id: rideIdNumber },
        include: { user: true },
      });

      if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      res.status(200).json(ride);

    } else if (req.method === 'PATCH' || req.method === 'POST') {
      const { status, dropoffTime, driverId } = req.body;

      const ride = await prisma.ride.findUnique({
        where: { id: rideIdNumber },
      });

      if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      if (ride.isAccepted && ride.driverId !== driverId) {
        return res.status(403).json({ message: 'This ride has already been accepted by another driver.' });
      }

      const updatedRide = await prisma.ride.update({
        where: { id: rideIdNumber },
        data: {
          status,
          dropoffTime: dropoffTime ? new Date(dropoffTime) : null,
          isAccepted: true,
          driverId,
        },
        include: { user: true },
      });

      if (status === 'InProgress' && updatedRide.user?.phone) {
        await twilioClient.messages.create({
          body: 'Your driver has arrived, you have 10 minutes to enter the vehicle, otherwise your ride will be cancelled.',
          from: process.env.TWILIO_PHONE_NUMBER,
          to: updatedRide.user.phone,
        });
      } else if (status === 'Completed' && updatedRide.user?.phone) {
        const ratingLink = `https://oneridetho-ten.vercel.app/rides/${rideIdNumber}`;
        await twilioClient.messages.create({
          body: `Thank you for riding with us. Please rate your driver here: ${ratingLink}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: updatedRide.user.phone,
        });
      }

      res.status(200).json(updatedRide);

    } else {
      res.setHeader('Allow', ['GET', 'PATCH', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }

  } catch (error) {
    const errorMessage = (error as Error).message;
    res.status(500).json({ message: 'Internal server error', error: errorMessage });
  }
}
