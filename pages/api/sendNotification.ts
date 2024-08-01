import { PrismaClient } from '@prisma/client';
import { Twilio } from 'twilio';
import type { NextApiRequest, NextApiResponse } from 'next';
import sendEmail from '../../lib/emailServer';

const prisma = new PrismaClient();
const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { rideId } = req.body;

    try {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: { user: true },
      });

      if (!ride || !ride.user) {
        return res.status(404).json({ message: 'Ride or user not found' });
      }

      const messageBody = `Alert: Your ride has exceeded the 10-minute mark. You will be charged $1 for every additional minute.`;
      const emailSubject = 'Ride Exceeded 10-Minute Mark';
      const emailBody = `<p>${messageBody}</p>`;

      try {
        // Attempt to send the SMS notification
        if (ride && ride.user && ride.user.phone) {
          await twilioClient.messages.create({
            body: messageBody,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: ride.user.phone,
          });
          res.status(200).json({ message: 'Notification sent to user successfully' });
        } else {
          res.status(404).json({ message: 'Ride or user not found' });
        }
      } catch (twilioError) {
        console.error('Error sending SMS notification:', twilioError);
        // Proceed to send an email notification if SMS fails
        if (ride.user.email) {
          try {
            await sendEmail({
              subject: emailSubject,
              text: messageBody,
              html: emailBody,
              recipient_email: ride.user.email,
            });
            res.status(200).json({ message: 'SMS failed. Email notification sent.' });
          } catch (emailError) {
            console.error('Error sending email notification:', emailError);
            res.status(500).json({ message: 'Error sending SMS and email notifications' });
          }
        } else {
          res.status(500).json({ message: 'Error sending SMS notification, no email available' });
        }
      }
    } catch (error) {
      console.error('Error handling notification:', error);
      res.status(500).json({ message: 'Error handling notification' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
