import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const useSocket = (userId) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!userId) return;

        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

        const socketInstance = io(SOCKET_URL, {
            auth: {
                token,
            },
        });

        socketInstance.on("connect_error", (err) => {
            console.error("❌ WebSocket Connection Error:", err.message);
        });

        socketInstance.on("connect", async () => {
            setIsConnected(true);
            // 1. Tell Express who is connecting right now
            socketInstance.emit("register", userId);
            console.log(
                `⚡ WebSocket Connected & Registered Persona ID: "${userId}"`,
            );

            // If the user's Wi-Fi dropped, fetch what they missed while offline.
            try {
                console.log("🔄 Syncing latest notifications from database...");
                const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                // Route is GET /api/notifications/:userId/notifications
                const response = await fetch(
                    `${SOCKET_URL}/api/notifications/${userId}/notifications`,
                    {
                        headers: {
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Safely extract the array whether your API returns { data: [] } or just []
                    const fetchedNotifs = Array.isArray(data)
                        ? data
                        : data.data || data.notifications || [];

                    if (fetchedNotifs.length > 0) {
                        // Replace local state with the absolute truth from the database
                        setNotifications(fetchedNotifs);
                        console.log(
                            `✅ Successfully synced ${fetchedNotifs.length} notifications!`,
                        );
                    }
                }
            } catch (error) {
                console.warn(
                    "⚠️ Could not sync missed notifications (API might not be mounted yet):",
                    error,
                );
            }
        });

        socketInstance.on("disconnect", () => {
            setIsConnected(false);
            console.warn(
                "⚠️ WebSocket Disconnected! UI will update badge to Offline.",
            );
        });

        // 2. Catch ONLY real notification events the backend sends while online
        socketInstance.on("notification", (data) => {
            console.log(`📡 [Socket Listener] Caught notification event:`, data);

            const safeData = data || {};

            // 3. Guarantee a 'message' property exists for rendering
            let alertText = safeData.message;

            // If it's a price drop, format a nice readable alert
            if (!alertText && safeData.type === "price_drop" && safeData.payload) {
                alertText = `🚨 Price Drop: ${safeData.payload.productName} is now $${safeData.payload.newPrice}!`;
            } else if (!alertText) {
                alertText = "🔔 New Notification Received!";
            }

            // Construct the final object
            const formattedNotification = {
                ...safeData,
                message: alertText,
            };

            // Put the newest notification at the top of the array
            setNotifications((prev) => [formattedNotification, ...prev]);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.off("notification"); // Clean up the notification listener
            socketInstance.disconnect();
        };
    }, [userId]);

    return { socket, isConnected, notifications, setNotifications };
}