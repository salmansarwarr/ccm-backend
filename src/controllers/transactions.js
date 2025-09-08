const Transaction = require("../models/TransactionModel");
const Tournament = require("../models/TournamentModel");

const getTransactions = async (req, res) => {
    try {
        const { type, page = 1, limit = 20 } = req.query;

        let query = { userId: req.user._id };
        if (type) query.type = type;

        const transactions = await Transaction.find(query)
            .populate("tournamentId", "name")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalTransactions: total,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const createTransaction = async (req, res) => {
    try {
        const { amount, txHash } = req.body;

        const transaction = new Transaction({
            userId: req.user._id,
            type: "deposit",
            amount,
            txHash,
            status: "pending",
        });

        await transaction.save();

        // In a real implementation, you would verify the transaction on-chain
        // For now, we'll mark it as completed
        setTimeout(async () => {
            transaction.status = "completed";
            await transaction.save();
        }, 5000);

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const processPaymentForTournamentEntry = async (req, res) => {
    try {
        const { txHash } = req.body;
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        if (transaction.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: "Not authorized" });
        }

        transaction.txHash = txHash;
        transaction.status = "completed";
        await transaction.save();

        // Update tournament participant as paid
        if (transaction.tournamentId) {
            await Tournament.updateOne(
                {
                    _id: transaction.tournamentId,
                    "participants.userId": req.user._id,
                },
                {
                    $set: { "participants.$.paid": true },
                }
            );
        }

        res.json({ message: "Payment processed successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getTransactions, createTransaction, processPaymentForTournamentEntry};