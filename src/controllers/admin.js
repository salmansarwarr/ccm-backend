const User = require("../models/UserModel");
const Club = require("../models/ClubModel");
const Tournament = require("../models/TournamentModel");
const Transaction = require("../models/TransactionModel");

const getPlatformStats = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const clubCount = await Club.countDocuments();
        const tournamentCount = await Tournament.countDocuments();
        const activeUsers = await User.countDocuments({
            lastActive: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            }, // Last 7 days
        });

        // Revenue stats
        const revenueStats = await Transaction.aggregate([
            { $match: { type: "entry_fee", status: "completed" } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount" },
                    totalTransactions: { $sum: 1 },
                },
            },
        ]);

        res.json({
            users: {
                total: userCount,
                active: activeUsers,
            },
            clubs: {
                total: clubCount,
            },
            tournaments: {
                total: tournamentCount,
            },
            revenue: revenueStats[0] || {
                totalRevenue: 0,
                totalTransactions: 0,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 50, search } = req.query;

        let query = {};
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
            ];
        }

        const users = await User.find(query)
            .select("-password -emailVerificationToken -resetPasswordToken")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalUsers: total,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!["admin", "moderator", "member"].includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getPlatformStats, getAllUsers, updateUserRole };
