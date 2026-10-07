const { Router } = require('express');
const {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword
} = require("../controllers/auth.controller");
const protect = require("../middleware/auth.middleware");

const router = Router();

router.post("/signup", register);

router.post("/login", login);

router.get("/me", protect, getMe);

router.post("/forgot-password", forgotPassword);

router.get("/reset-password", (req, res) => {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const token = req.query.token ? `?token=${encodeURIComponent(req.query.token)}` : "";
    res.redirect(`${clientUrl}/reset-password${token}`);
});

router.post("/reset-password", resetPassword);

module.exports = router;