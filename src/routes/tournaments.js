const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
    createTournament,
    getTournaments,
    getTournamentById,
    registerInTournament,
    startTournament,
    syncResults,
} = require("../controllers/tournaments");

const router = express.Router();

// Create tournament
router.post("/", authenticate, createTournament);

// Get tournaments
router.get("/", getTournaments);

// Get tournament by ID
router.get("/:id", getTournamentById);

// Register for tournament
router.post("/:id/register", authenticate, registerInTournament);

// Start tournament (integrate with Lichess/Chess.com)
router.post("/:id/start", authenticate, startTournament);

// Sync tournament results from Lichess/Chess.com
router.post("/:id/sync-results", authenticate, syncResults);

module.exports = router;
