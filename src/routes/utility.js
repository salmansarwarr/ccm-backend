const express = require("express");

const router = express.Router();
const { getHealth, getPublicStats } = require("../controllers/utility");

router.get("/health", getHealth);

// Get platform statistics (public)
router.get("/stats", getPublicStats);

module.exports = router;