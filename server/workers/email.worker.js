const { Worker } = require("bullmq");
const redisConnection = require("../config/ioredis");
const sendEmail = require("../config/nodemailer");
const User = require("../models/user.model");
const Delivery = require("../models/delivery.model");

const emailWorker = new Worker(
    'email-queue',
    async job => {
        const { eventId, userId, subject, payload } = job.data;
        console.log(`📧 Email Worker: Picking up job for User ID ${userId}`);

        const user = await User.findById(userId);
        if (!user) {
            console.error('user not found');
            if (eventId) {
                await Delivery.findOneAndUpdate(
                    { eventId: eventId, userId: userId, channel: "email" },
                    {
                        status: "failed",
                        errorMessage: "User account was deleted from database.",
                        faultType: "ORPHANED_USER",
                    },
                );
            }
            return;
        }

        const productName = payload?.productName || "Your Watched Item";
        const oldPrice = payload?.oldPrice || "N/A";
        const newPrice = payload?.newPrice || "N/A";

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                <h2 style="color: #333;">Watchlist Update</h2>
                <p>Hello ${user.name},</p>
                <p>A new price change has been recorded for your watched item: <strong>${productName}</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #555;">Old Price:</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #777;">${oldPrice}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #555;">New Price:</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #10b981; font-size: 1.1em; font-weight: bold;">${newPrice}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; color: #666; font-size: 0.9em;">Thank you for using SignalFlow!</p>
            </div>
        `;

        try {
            const emailSubject = subject || `Watchlist Update: New price recorded for ${productName}`;
            await sendEmail(user.email, emailSubject, html);

            console.log(`✅ Email Worker: Delivered to ${user.email}`);

            if (eventId) {
                await Delivery.findOneAndUpdate(
                    { eventId: eventId, userId: user._id, channel: "email" },
                    { status: "success", sentAt: new Date() },
                );
            }
        } catch (error) {
            console.error('Email worker failed:', error.message);

            if (eventId) {
                await Delivery.findOneAndUpdate(
                    { eventId: eventId, userId: user._id, channel: "email" },
                    {
                        status: "failed",
                        errorMessage: error.message,
                        faultType: "DELIVERY_FAILURE",
                    },
                );
            }
        }

    },
    { connection: redisConnection },
);

module.exports=emailWorker;