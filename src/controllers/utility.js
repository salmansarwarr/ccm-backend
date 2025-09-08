const Club = require("../models/ClubModel");
const User = require("../models/UserModel");
const Tournament = require("../models/TournamentModel");

const getHealth = (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
    });
}

const getPublicStats = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const clubCount = await Club.countDocuments({ isPublic: true });
        const tournamentCount = await Tournament.countDocuments();

        res.json({
            users: userCount,
            clubs: clubCount,
            tournaments: tournamentCount,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getHealth, getPublicStats
};