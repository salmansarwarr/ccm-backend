const express = require("express");
const { authenticate } = require("../middleware/auth");
const { register, login, verifyEmail, getMe } = require("../controllers/auth");

const router = express.Router();

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Verify email
router.post("/verify-email", verifyEmail);

// Get current user
router.get("/auth/me", authenticate, getMe);

module.exports = router;
