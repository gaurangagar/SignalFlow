const express = require("express");

const {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword   
} = require("../routes/auth.route");

const router = express.Router();

router.post("/signup", register);

router.post("/login", login);

router.get("/me", getMe);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

module.exports = router;