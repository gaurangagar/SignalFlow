const { Server } = require("socket.io");

let io = null;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // Register the connected user
        socket.on("register", (userId) => {
            if (!userId) {
                console.log(`⚠️ No userId provided for socket ${socket.id}`);
                return;
            }

            const room = `user:${userId}`;

            socket.join(room);

            // Store userId on socket for disconnect logging
            socket.userId = userId;

            console.log(`👤 User ${userId} registered on socket ${socket.id}`);
        });

        socket.on("disconnect", (reason) => {
            console.log(
                `❌ Socket disconnected: ${socket.id} (${reason})`
            );
        });
    });

    console.log("🔌 Socket.IO initialized");

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO not initialized");
    }

    return io;
};

const sendLiveNotification = (userId, payload) => {
    if (!userId) {
        throw new Error("userId is required");
    }

    const room = `user:${userId}`;

    getIO().to(room).emit("notification", {
        ...payload,
        userId,
    });

    console.log(`🔔 Live notification sent to user ${userId}`);
};

module.exports = {
    initializeSocket,
    getIO,
    sendLiveNotification,
};