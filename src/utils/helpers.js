const Transaction = require("../models/TransactionModel");
const Notification = require("../models/NotificationModel");

async function distributePrizes(tournament) {
    const totalPrizePool = tournament.participants.length * tournament.entryFee;

    for (const prizeRule of tournament.prizeDistribution) {
        const participant = tournament.participants.find(
            (p) => p.rank === prizeRule.position
        );
        if (participant) {
            const prizeAmount = Math.floor(
                totalPrizePool * (prizeRule.percentage / 100)
            );

            const transaction = new Transaction({
                userId: participant.userId,
                tournamentId: tournament._id,
                type: "prize_payout",
                amount: prizeAmount,
                status: "completed",
            });

            await transaction.save();

            // Create notification
            const notification = new Notification({
                userId: participant.userId,
                title: "Prize Won!",
                message: `Congratulations! You won ${prizeAmount} ETH in ${tournament.name}`,
                type: "payment",
            });

            await notification.save();
        }
    }
}


const generateInviteCode = () => {
    return crypto.randomBytes(8).toString("hex").toUpperCase();
};

module.exports = {
    distributePrizes,
    generateInviteCode,
};