const nodemailer = require("nodemailer");

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false, // use STARTTLS (upgrade connection to TLS after connecting)
  auth: {
    user: process.env.SMTP_USER || "[EMAIL_ADDRESS]",
    pass: process.env.SMTP_PASS || "password",
  },
});

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const info = await transporter.sendMail({
      from: `"SignalFlow Alerts" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log(
      `Email Sent successfully to ${to} (ID: ${info.messageId})`
    );

    return true;
  } catch (error) {
    console.error(
      `Email Failed to send to ${to}:`,
      error.message
    );

    throw error;
  }
};

module.exports = sendEmail;