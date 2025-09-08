const express = require("express");
const { authenticate } = require("../middleware/auth");
const { createClub, getClubs, getClubById, joinClub, resolveApplication } = require("../controllers/clubs");
const router = express.Router();

// Create club
router.post("/", authenticate, createClub);

// Get clubs (with search and filtering)
router.get("/", getClubs);

// Get club by ID
router.get("/:id", getClubById);

// Join club
router.post("/:id/join", authenticate, joinClub);

// Approve/reject club application
router.post(
    "/:id/applications/:userId/:action",
    authenticate,
    resolveApplication
);

module.exports = router;