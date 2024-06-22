import { PrismaClient } from '@prisma/client';
import { Twilio } from 'twilio';
import type { NextApiRequest, NextApiResponse } from 'next';
import sendEmail from '../../../../lib/emailServer';

const prisma = new PrismaClient();
const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function formatTime(date: any) {
  if (!date) return "";

  const d = new Date(date);
  // Get the local timezone offset in minutes and convert to milliseconds
  const timezoneOffset = d.getTimezoneOffset() * 60000;

  // Adjust the date to the local timezone
  const localDate = new Date(d.getTime() - timezoneOffset);

  return localDate.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const rideIdStr = typeof req.query.rideId === 'string' ? req.query.rideId : null;
    if (!rideIdStr) {
      return res.status(400).json({ message: 'Invalid ride ID' });
    }
    const rideId = parseInt(rideIdStr);

    const driverId = typeof req.body.driverId === 'number' ? req.body.driverId : null;
    if (driverId === null) {
      return res.status(400).json({ message: 'Invalid driver ID' });
    }

    try {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
      });

      if (ride?.isAccepted) {
        if (ride?.driverId === driverId) {
          return res.status(200).json({ message: 'You already accepted this ride' });
        } else {
          return res.status(400).json({ message: 'Ride already accepted by another driver' });
        }
      }

      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: {
          isAccepted: true,
          driverId: driverId
        },
        include: {
          driver: true,
          user: true
        }
      });

      if (updatedRide.driver && updatedRide.user?.email) {
        let subject: string = '';
        let text: string = '';
        let html: string = '';

        if (updatedRide.isScheduled && updatedRide.scheduledPickupTime) {
          const formattedTime = formatTime(updatedRide.scheduledPickupTime);
          subject = `Your scheduled ride for ${formattedTime} has been confirmed!`;
          text = `Your scheduled ride for ${formattedTime} has been confirmed! Your driver ${updatedRide.driver.name} will arrive in a ${updatedRide.driver.carType} with license plate ${updatedRide.driver.licensePlate}. Please visit https://www.oneridetho.com/rides/${updatedRide.id} for more details.\n\nHave a great trip!`;
          html = `<p>Your scheduled ride for ${formattedTime} has been confirmed! Your driver ${updatedRide.driver.name} will arrive in a ${updatedRide.driver.carType} with license plate ${updatedRide.driver.licensePlate}. Please visit <a href="https://www.oneridetho.com/rides/${updatedRide.id}">here</a> for more details.</p><p>Have a great trip!</p>`;
        } else {
          subject = `Your ride with ${updatedRide.driver.name} has been confirmed`;
          text = `Great news! Your ride with ${updatedRide.driver.name} has been confirmed. Your driver will be in a ${updatedRide.driver.carType} with license plate ${updatedRide.driver.licensePlate}. For more details about your ride, visit: https://www.oneridetho.com/rides/${updatedRide.id}\n\nWe wish you a safe and pleasant journey!`;
          html = `<p>Great news! Your ride with ${updatedRide.driver.name} has been confirmed. Your driver will be in a ${updatedRide.driver.carType} with license plate ${updatedRide.driver.licensePlate}. For more details about your ride, visit: <a href="https://www.oneridetho.com/rides/${updatedRide.id}">here</a></p><p>We wish you a safe and pleasant journey!</p>`;
        }

        await sendEmail({
          subject: subject,
          text: text,
          html: html,
          recipient_email: updatedRide.user.email,
        });
      }


      if (updatedRide.driver && updatedRide.user?.phone) {
        let bodyMessage;
        if (updatedRide.isScheduled && updatedRide.scheduledPickupTime) {
          const formattedTime = formatTime(updatedRide.scheduledPickupTime);
          bodyMessage = `Your scheduled ride for ${formattedTime} has been confirmed! Your driver ${updatedRide.driver.name} will arrive in a ${updatedRide.driver.carType} with license plate ${updatedRide.driver.licensePlate}. Please visit https://www.oneridetho.com/rides/${updatedRide.id} for more details.\n\nHave a great trip!`;
        } else {
          bodyMessage = `Great news! Your ride with ${updatedRide.driver.name} has been confirmed. Your driver will be in a ${updatedRide.driver.carType} with license plate ${updatedRide.driver.licensePlate}. For more details about your ride, visit: https://www.oneridetho.com/rides/${updatedRide.id}\n\nWe wish you a safe and pleasant journey!`;
        }

        await twilioClient.messages.create({
          body: bodyMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: updatedRide.user.phone
        });
      }

      res.status(200).json({ message: 'Ride accepted successfully', updatedRide });
    } catch (error) {
      console.error('Error accepting the ride:', error);
      res.status(500).json({ message: 'Error accepting the ride' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}