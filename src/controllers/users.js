const User = require("../models/UserModel");
const Tournament = require("../models/TournamentModel");

const updateProfile = async (req, res) => {
    try {
        const updates = req.body;
        const allowedUpdates = [
            "firstName",
            "lastName",
            "avatar",
            "lichessUsername",
            "chessComUsername",
        ];
        const actualUpdates = {};

        Object.keys(updates).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                actualUpdates[key] = updates[key];
            }
        });

        const user = await User.findByIdAndUpdate(req.user._id, actualUpdates, {
            new: true,
            runValidators: true,
        }).select("-password");

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getStats = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Get tournament participation stats
        const tournamentStats = await Tournament.aggregate([
            { $match: { "participants.userId": user._id } },
            { $unwind: "$participants" },
            { $match: { "participants.userId": user._id } },
            {
                $group: {
                    _id: null,
                    totalTournaments: { $sum: 1 },
                    totalScore: { $sum: "$participants.score" },
                    averageRank: { $avg: "$participants.rank" },
                },
            },
        ]);

        res.json({
            user: {
                id: user._id,
                username: user.username,
                rating: user.rating,
                gamesPlayed: user.gamesPlayed,
                wins: user.wins,
                losses: user.losses,
                draws: user.draws,
                achievements: user.achievements,
            },
            tournaments: tournamentStats[0] || {
                totalTournaments: 0,
                totalScore: 0,
                averageRank: 0,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { updateProfile, getStats };
