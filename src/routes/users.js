const express = require("express");
const { authenticate } = require("../middleware/auth");
const { updateProfile, getStats } = require("../controllers/users");

const router = express.Router();

// Update profile
router.put("/profile", authenticate, updateProfile);

// Get user statistics
router.get("/:id/stats", getStats);

module.exports = router;