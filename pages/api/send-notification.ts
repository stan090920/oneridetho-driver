// pages/api/send-notification.ts
import { NextApiRequest, NextApiResponse } from "next";
const sendEmail = require("../../lib/emailServer");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { subject, text, html, recipient_email } = req.body;

  if (!subject || !text || !recipient_email) {
    return res.status(400).json({ message: "Bad Request" });
  }

  try {
    await sendEmail({ subject, text, html, recipient_email });
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
