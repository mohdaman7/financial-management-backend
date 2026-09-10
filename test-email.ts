import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function test() {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // send to self
      subject: 'Test Email',
      text: 'This is a test email.',
    });
    console.log('SUCCESS! Email sent:', info.messageId);
  } catch (error) {
    console.error('FAILED TO SEND EMAIL:', error);
  }
}

test();
