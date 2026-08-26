const { Resend } = require("resend");

// Initialize Resend with API Key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY || "re_your_api_key");

const sendEmail = async (to, subject, htmlContent, textContent) => {
  try {
    const fromAddress = 'delivered@resend.dev';
    const fromName = process.env.FROM_NAME || "SignalFlow Alerts";

    const emailOptions = {
      from: 'Acme <onboarding@resend.dev>',
      to: 'delivered@resend.dev',
      subject,
    };

    if (htmlContent) {
      emailOptions.html = htmlContent;
    }
    if (textContent) {
      emailOptions.text = textContent;
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error(`Email Failed to send to ${to}:`, error.message);
      throw error;
    }

    console.log(`Email Sent successfully to ${to} (ID: ${data.id})`);
    return true;
  } catch (error) {
    console.error(`Email Failed to send to ${to}:`, error.message);
    throw error;
  }
};

module.exports = sendEmail;
