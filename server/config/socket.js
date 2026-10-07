const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

let io = null;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Authenticate socket connections using JWT
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth?.token;

            if (!token && socket.handshake.headers?.authorization) {
                const authHeader = socket.handshake.headers.authorization;
                if (authHeader.startsWith("Bearer ")) {
                    token = authHeader.split(" ")[1];
                } else {
                    token = authHeader;
                }
            }

            if (!token && socket.handshake.query?.token) {
                token = socket.handshake.query.token;
            }

            if (!token) {
                return next(new Error("Authentication error: Token required"));
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            const user = await User.findById(decoded.id);
            if (!user) {
                return next(new Error("Authentication error: User not found"));
            }

            socket.user = user;
            socket.userId = user._id.toString();

            next();
        } catch (error) {
            console.error("Socket authentication failed:", error.message);
            return next(new Error("Authentication error: Invalid or expired token"));
        }
    });

    io.on("connection", (socket) => {
        const verifiedUserId = socket.userId;
        console.log(`🔌 Socket connected: ${socket.id} (Authenticated User: ${verifiedUserId})`);

        // Automatically join the verified user's private notification room
        const room = `user:${verifiedUserId}`;
        socket.join(room);
        console.log(`👤 User ${verifiedUserId} joined room ${room}`);

        // Register event handler with strict ownership validation
        socket.on("register", (userId) => {
            if (!userId) {
                console.log(`⚠️ No userId provided for socket ${socket.id}`);
                return;
            }

            // Prevent registering as any user other than the authenticated identity
            if (userId.toString() !== verifiedUserId) {
                console.warn(
                    `🚨 Unauthorized socket registration attempt: Socket ${socket.id} (${verifiedUserId}) tried to register as ${userId}`
                );
                socket.emit("error", {
                    message: "Forbidden: You cannot register or listen to another user's notifications",
                });
                return;
            }

            socket.join(room);
            console.log(`👤 Verified user ${verifiedUserId} registered on socket ${socket.id}`);
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