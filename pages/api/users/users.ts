import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import sendEmail from "../../../lib/emailServer";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    if (req.query.id) {
      // Fetch a specific user by ID
      try {
        const userId = parseInt(req.query.id as string);
        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
        });

        if (!user) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        res.status(200).json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Error fetching user" });
      }
    } else {
      // Fetch all users
      try {
        const users = await prisma.user.findMany();
        res.status(200).json(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Error fetching users" });
      }
    }
  } else if (req.method === "PUT") {
    // Update user information (only verified status for now)
    try {
      const userId = parseInt(req.query.id as string);
      const { verified, denyReason } = req.body;

      const dataToUpdate = verified
        ? { verified }
        : {
            verified,
            governmentIssuedId: null,
            verificationPhotoUrl: null,
          };

      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },
        data: dataToUpdate,
      });

      let emailSubject = "";
      let emailText = "";
      let emailHtml = "";

      if (verified) {
        emailSubject = "Verification Successful";
        emailText = `Dear ${updatedUser.name}, your account has been verified successfully.`;
        emailHtml = `<p>Dear ${updatedUser.name},</p><p>Your account has been verified successfully.</p>`;
      } else if (!verified && denyReason) {
        emailSubject = "Verification Denied";
        emailText = `Dear ${updatedUser.name}, your account verification was denied. Reason: ${denyReason}`;
        emailHtml = `<p>Dear ${updatedUser.name},</p><p>Your account verification was denied.</p><p>Reason: ${denyReason}</p>`;
      } else {
        emailSubject = "Verification Revoked";
        emailText = `Dear ${updatedUser.name}, your account verification has been revoked.`;
        emailHtml = `<p>Dear ${updatedUser.name},</p><p>Your account verification has been revoked.</p>`;
      }

      await sendEmail({
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        recipient_email: updatedUser.email,
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Error updating user" });
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
