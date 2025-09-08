const Club = require("../models/ClubModel");
const Tournament = require("../models/TournamentModel");
const User = require("../models/UserModel");
const Transaction = require("../models/TransactionModel");
const { distributePrizes } = require("../utils/helpers");

const createTournament = async (req, res) => {
    try {
        const {
            name,
            description,
            clubId,
            format,
            timeControl,
            maxParticipants,
            entryFee,
            prizeDistribution,
            registrationStart,
            registrationEnd,
            tournamentStart,
            platform,
        } = req.body;

        // Verify user is admin/moderator of the club
        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({ error: "Club not found" });
        }

        const isAdmin = club.adminId.toString() === req.user._id.toString();
        const isModerator = club.moderators.some(
            (mod) => mod.toString() === req.user._id.toString()
        );
        const userMember = club.members.find(
            (member) =>
                member.userId.toString() === req.user._id.toString() &&
                ["admin", "moderator"].includes(member.role)
        );

        if (!isAdmin && !isModerator && !userMember) {
            return res
                .status(403)
                .json({
                    error: "Not authorized to create tournaments in this club",
                });
        }

        const tournament = new Tournament({
            name,
            description,
            clubId,
            organizerId: req.user._id,
            format,
            timeControl,
            maxParticipants,
            entryFee: entryFee || 0,
            prizeDistribution,
            registrationStart: new Date(registrationStart),
            registrationEnd: new Date(registrationEnd),
            tournamentStart: new Date(tournamentStart),
            platform: platform || "lichess",
        });

        await tournament.save();

        // Add tournament to club
        club.tournaments.push(tournament._id);
        await club.save();

        // Notify club members
        const members = await User.find({
            _id: { $in: club.members.map((m) => m.userId) },
        });
        const notifications = members.map((member) => ({
            userId: member._id,
            title: "New Tournament",
            message: `${tournament.name} has been created in ${club.name}`,
            type: "tournament",
            actionUrl: `/tournaments/${tournament._id}`,
        }));
        await Notification.insertMany(notifications);

        res.status(201).json(tournament);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getTournaments = async (req, res) => {
    try {
        const { status, clubId, page = 1, limit = 20 } = req.query;

        let query = {};
        if (status) query.status = status;
        if (clubId) query.clubId = clubId;

        const tournaments = await Tournament.find(query)
            .populate("clubId", "name logo")
            .populate("organizerId", "username")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Tournament.countDocuments(query);

        res.json({
            tournaments,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalTournaments: total,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getTournamentById = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id)
            .populate("clubId", "name logo")
            .populate("organizerId", "username firstName lastName")
            .populate(
                "participants.userId",
                "username firstName lastName rating avatar"
            );

        if (!tournament) {
            return res.status(404).json({ error: "Tournament not found" });
        }

        res.json(tournament);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const registerInTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ error: "Tournament not found" });
        }

        // Check if registration is open
        const now = new Date();
        if (
            now < tournament.registrationStart ||
            now > tournament.registrationEnd
        ) {
            return res.status(400).json({ error: "Registration is not open" });
        }

        // Check if tournament is full
        if (tournament.participants.length >= tournament.maxParticipants) {
            return res.status(400).json({ error: "Tournament is full" });
        }

        // Check if already registered
        const existingParticipant = tournament.participants.find(
            (p) => p.userId.toString() === req.user._id.toString()
        );
        if (existingParticipant) {
            return res
                .status(400)
                .json({ error: "Already registered for this tournament" });
        }

        // Check if user is member of the club
        const club = await Club.findById(tournament.clubId);
        const isMember = club.members.some(
            (member) => member.userId.toString() === req.user._id.toString()
        );
        if (!isMember) {
            return res
                .status(403)
                .json({ error: "Must be a club member to register" });
        }

        // Add participant
        tournament.participants.push({
            userId: req.user._id,
            paid: tournament.entryFee === 0, // Free tournaments are automatically paid
        });

        await tournament.save();

        // If entry fee required, create transaction
        if (tournament.entryFee > 0) {
            const transaction = new Transaction({
                userId: req.user._id,
                tournamentId: tournament._id,
                type: "entry_fee",
                amount: tournament.entryFee,
                status: "pending",
            });
            await transaction.save();

            res.json({
                message: "Registered successfully. Please complete payment.",
                paymentRequired: true,
                transactionId: transaction._id,
            });
        } else {
            res.json({ message: "Registered successfully!" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const startTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id).populate(
            "participants.userId",
            "lichessUsername chessComUsername"
        );

        if (!tournament) {
            return res.status(404).json({ error: "Tournament not found" });
        }

        // Check authorization
        if (tournament.organizerId.toString() !== req.user._id.toString()) {
            return res
                .status(403)
                .json({ error: "Only the organizer can start the tournament" });
        }

        if (tournament.status !== "registration") {
            return res
                .status(400)
                .json({
                    error: "Tournament cannot be started in current status",
                });
        }

        try {
            let externalTournamentId;

            if (tournament.platform === "lichess") {
                // Create tournament on Lichess
                const lichessResponse = await axios.post(
                    "https://lichess.org/api/tournament",
                    {
                        name: tournament.name,
                        clockTime: tournament.timeControl.initial / 60, // Convert to minutes
                        clockIncrement: tournament.timeControl.increment,
                        minutes: 60, // Tournament duration
                        startDate: tournament.tournamentStart.getTime(),
                        variant: "standard",
                        rated: true,
                        description: tournament.description,
                        password: `club-${tournament.clubId}`, // Simple password system
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.LICHESS_TOKEN}`,
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                    }
                );

                externalTournamentId = lichessResponse.data.id;
                tournament.lichessId = externalTournamentId;
            } else if (tournament.platform === "chesscom") {
                // Chess.com API integration would go here
                // Note: Chess.com has different API structure
                externalTournamentId = `chesscom-${tournament._id}`;
                tournament.chessComId = externalTournamentId;
            }

            tournament.status = "ongoing";
            await tournament.save();

            // Notify participants
            const notifications = tournament.participants.map(
                (participant) => ({
                    userId: participant.userId._id,
                    title: "Tournament Started",
                    message: `${tournament.name} has started! Join now on ${tournament.platform}.`,
                    type: "tournament",
                    actionUrl:
                        tournament.platform === "lichess"
                            ? `https://lichess.org/tournament/${externalTournamentId}`
                            : `/tournaments/${tournament._id}`,
                })
            );
            await Notification.insertMany(notifications);

            res.json({
                message: "Tournament started successfully",
                externalTournamentId,
                url:
                    tournament.platform === "lichess"
                        ? `https://lichess.org/tournament/${externalTournamentId}`
                        : `https://chess.com/tournament/${externalTournamentId}`,
            });
        } catch (externalError) {
            console.error(
                "External platform error:",
                externalError.response?.data || externalError.message
            );
            res.status(500).json({
                error: "Failed to create tournament on external platform",
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


const syncResults = async (req, res) => {
    try {
        const tournament = await Tournament.findById(
            req.params.id
        ).populate(
            "participants.userId",
            "username lichessUsername chessComUsername"
        );

        if (!tournament) {
            return res.status(404).json({ error: "Tournament not found" });
        }

        // Check authorization
        if (tournament.organizerId.toString() !== req.user._id.toString()) {
            return res
                .status(403)
                .json({ error: "Only the organizer can sync results" });
        }

        try {
            let results = [];

            if (tournament.platform === "lichess" && tournament.lichessId) {
                // Fetch results from Lichess
                const resultsResponse = await axios.get(
                    `https://lichess.org/api/tournament/${tournament.lichessId}/results`,
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.LICHESS_TOKEN}`,
                        },
                    }
                );

                results = resultsResponse.data;
            } else if (
                tournament.platform === "chesscom" &&
                tournament.chessComId
            ) {
                // Chess.com API integration would go here
                // Placeholder for Chess.com results
                results = [];
            }

            // Update participant scores and rankings
            for (const participant of tournament.participants) {
                const userPlatformUsername =
                    tournament.platform === "lichess"
                        ? participant.userId.lichessUsername
                        : participant.userId.chessComUsername;

                const result = results.find(
                    (r) => r.username === userPlatformUsername
                );
                if (result) {
                    participant.score = result.score || 0;
                    participant.rank = result.rank || 0;
                }
            }

            // Sort participants by score
            tournament.participants.sort((a, b) => b.score - a.score);

            // Update rankings
            tournament.participants.forEach((participant, index) => {
                participant.rank = index + 1;
            });

            tournament.status = "completed";
            await tournament.save();

            // Distribute prizes if applicable
            if (
                tournament.entryFee > 0 &&
                tournament.prizeDistribution.length > 0
            ) {
                await distributePrizes(tournament);
            }

            res.json({
                message: "Results synchronized successfully",
                results: tournament.participants,
            });
        } catch (externalError) {
            console.error(
                "External platform error:",
                externalError.response?.data || externalError.message
            );
            res.status(500).json({
                error: "Failed to fetch results from external platform",
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {createTournament, getTournaments, getTournamentById, registerInTournament, startTournament, syncResults}