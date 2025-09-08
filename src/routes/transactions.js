const express = require("express");
const { authenticate } = require("../middleware/auth");
const { getTransactions, createTransaction, processPaymentForTournamentEntry } = require("../controllers/transactions");

const router = express.Router();

// Get user transactions
router.get("/", authenticate, getTransactions);

// Create deposit transaction
router.post("/deposit", authenticate, createTransaction);

// Process payment for tournament entry
router.post("/:id/pay", authenticate, processPaymentForTournamentEntry);

module.exports = router;