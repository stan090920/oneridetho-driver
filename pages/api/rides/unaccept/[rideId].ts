import { PrismaClient } from "@prisma/client";
import { Twilio } from "twilio";
import type { NextApiRequest, NextApiResponse } from "next";
import sendEmail from "../../../../lib/emailServer";

const prisma = new PrismaClient();
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function formatTime(date: any) {
  if (!date) return "";
  const dateTime = new Date(Date.parse(date));
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };
  return dateTime.toLocaleString("en-US", options);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { rideId } = req.body;
    if (typeof rideId !== "number") {
      return res.status(400).json({ message: "Invalid ride ID" });
    }

    try {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
      });

      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      if (!ride.isAccepted) {
        return res.status(400).json({ message: "Ride is not accepted" });
      }

      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: {
          isAccepted: false,
          driverId: null,
        },
        include: {
          driver: true,
          user: true,
        },
      });

      if (updatedRide.user?.email) {
        let subject: string = "";
        let text: string = "";
        let html: string = "";

        if (updatedRide.isScheduled && updatedRide.scheduledPickupTime) {
          const formattedTime = formatTime(updatedRide.scheduledPickupTime);
          subject = `Your driver unaccepted the ride`;
          text = `Unfortunately, your driver has unaccepted the scheduled ride for ${formattedTime}. Please hold on as we match you with another driver. Visit https://www.oneridetho.com/rides/${updatedRide.id} for more details.`;
          html = `<p>Unfortunately, your driver has unaccepted the ride. Please hold on as we match you with another driver. Visit <a href="https://www.oneridetho.com/rides/${updatedRide.id}">here</a> for more details.</p>`;
        } else{
          subject = `Your driver unaccepted the ride`;
          text = `Unfortunately, your driver has unaccepted the ride. Please hold on as we match you with another driver. Visit https://www.oneridetho.com/rides/${updatedRide.id} for more details.`;
          html = `<p>Unfortunately, your driver has unaccepted the ride. Please hold on as we match you with another driver. Visit <a href="https://www.oneridetho.com/rides/${updatedRide.id}">here</a> for more details.</p>`;
        }

        await sendEmail({
          subject: subject,
          text: text,
          html: html,
          recipient_email: updatedRide.user.email,
        });
      }

      if (updatedRide.user?.phone) {
        let bodyMessage;

        if (updatedRide.isScheduled && updatedRide.scheduledPickupTime) {
          const formattedTime = formatTime(updatedRide.scheduledPickupTime);
          bodyMessage = `Unfortunately, your driver has unaccepted the scheduled ride for ${formattedTime}. Please hold on as we match you with another driver. Visit https://www.oneridetho.com/rides/${updatedRide.id} for more details.`;
        } else {
          bodyMessage = `Unfortunately, your driver has unaccepted the ride. Please hold on as we match you with another driver. Visit https://www.oneridetho.com/rides/${updatedRide.id} for more details.`;
        }

        try {
          await twilioClient.messages.create({
            body: bodyMessage,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: updatedRide.user.phone,
          });
        } catch (twilioError) {
          console.error("Error sending text message:", twilioError);
          // Continue without failing
        }
      }

      res
        .status(200)
        .json({ message: "Ride unaccepted successfully", updatedRide });
    } catch (error) {
      console.error("Error unaccepting the ride:", error);
      res.status(500).json({ message: "Error unaccepting the ride" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
