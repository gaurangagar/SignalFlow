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

router.post("/reset-password", resetPassword);

module.exports = router;