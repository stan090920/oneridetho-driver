const nodemailer = require("nodemailer");
require("dotenv").config();


const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  debug: true,
  auth: {
    user: process.env.MY_EMAIL,
    pass: process.env.MY_PASSWORD,
  },
});

const sendEmail = async ({
  subject,
  text,
  html,
  recipient_email,
}) => {
  try {
    const mailOptions = {
      from: process.env.MY_EMAIL,
      to: recipient_email,
      subject: subject,
      text: text,
      html: html,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = sendEmail;
