const express = require("express");
const { authenticate } = require("../middleware/auth");
const { getNotifications, markAsRead, markAllAsRead } = require("../controllers/notifications");

const router = express.Router();

// Get user notifications
router.get("/", authenticate, getNotifications);

// Mark notification as read
router.put("/:id/read", authenticate, markAsRead);

// Mark all notifications as read
router.put("/read-all", authenticate, markAllAsRead);

module.exports = router;