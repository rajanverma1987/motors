import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();

/** Nodemailer transporter when Gmail SMTP is configured (SMTP_USER + SMTP_PASS). */
let transporter = null;
if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export function hasSmtp() {
  return !!transporter;
}

export function getTransporter() {
  return transporter;
}
