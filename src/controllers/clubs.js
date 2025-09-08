const Club = require("../models/ClubModel");
const User = require("../models/UserModel");
const { generateInviteCode } = require("../utils/helpers");

const createClub = async (req, res) => {
    try {
        const {
            name,
            description,
            logo,
            rules,
            isPublic,
            joinMethod,
            category,
            tags,
        } = req.body;

        const club = new Club({
            name,
            description,
            logo,
            rules,
            isPublic,
            joinMethod,
            category,
            tags,
            adminId: req.user._id,
            inviteCode: generateInviteCode(),
            members: [
                {
                    userId: req.user._id,
                    role: "admin",
                },
            ],
            memberCount: 1,
        });

        await club.save();

        // Add club to user's joinedClubs
        await User.findByIdAndUpdate(req.user._id, {
            $push: { joinedClubs: club._id },
        });

        res.status(201).json(club);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getClubs = async (req, res) => {
    try {
        const { search, category, page = 1, limit = 20 } = req.query;

        let query = { isPublic: true };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        if (category) {
            query.category = category;
        }

        const clubs = await Club.find(query)
            .populate("adminId", "username")
            .sort({ memberCount: -1, createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Club.countDocuments(query);

        res.json({
            clubs,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalClubs: total,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getClubById = async (req, res) => {
    try {
        const club = await Club.findById(req.params.id)
            .populate("adminId", "username firstName lastName avatar")
            .populate("moderators", "username firstName lastName avatar")
            .populate(
                "members.userId",
                "username firstName lastName avatar rating"
            )
            .populate("tournaments");

        if (!club) {
            return res.status(404).json({ error: "Club not found" });
        }

        res.json(club);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const joinClub = async (req, res) => {
    try {
        const { inviteCode, message } = req.body;
        const club = await Club.findById(req.params.id);

        if (!club) {
            return res.status(404).json({ error: "Club not found" });
        }

        // Check if already a member
        const existingMember = club.members.find(
            (member) => member.userId.toString() === req.user._id.toString()
        );
        if (existingMember) {
            return res
                .status(400)
                .json({ error: "Already a member of this club" });
        }

        if (club.joinMethod === "open" && club.isPublic) {
            // Direct join for open clubs
            club.members.push({ userId: req.user._id });
            club.memberCount += 1;
            await club.save();

            await User.findByIdAndUpdate(req.user._id, {
                $push: { joinedClubs: club._id },
            });

            res.json({ message: "Successfully joined the club" });
        } else if (club.joinMethod === "invite") {
            // Check invite code
            if (!inviteCode || inviteCode !== club.inviteCode) {
                return res.status(400).json({ error: "Invalid invite code" });
            }

            club.members.push({ userId: req.user._id });
            club.memberCount += 1;
            await club.save();

            await User.findByIdAndUpdate(req.user._id, {
                $push: { joinedClubs: club._id },
            });

            res.json({ message: "Successfully joined the club" });
        } else if (club.joinMethod === "approval") {
            // Add to pending applications
            club.pendingApplications.push({
                userId: req.user._id,
                message: message || "",
            });
            await club.save();

            // Notify club admin
            const notification = new Notification({
                userId: club.adminId,
                title: "New Club Application",
                message: `${req.user.username} has applied to join ${club.name}`,
                type: "club",
                actionUrl: `/clubs/${club._id}/manage`,
            });
            await notification.save();

            res.json({
                message: "Application submitted. Waiting for admin approval.",
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const resolveApplication =     async (req, res) => {
    try {
        const { action } = req.params;
        const club = await Club.findById(req.params.id);

        if (!club) {
            return res.status(404).json({ error: "Club not found" });
        }

        // Check if user is admin or moderator
        const isAdmin = club.adminId.toString() === req.user._id.toString();
        const isModerator = club.moderators.some(
            (mod) => mod.toString() === req.user._id.toString()
        );

        if (!isAdmin && !isModerator) {
            return res
                .status(403)
                .json({ error: "Not authorized to manage applications" });
        }

        const applicationIndex = club.pendingApplications.findIndex(
            (app) => app.userId.toString() === req.params.userId
        );

        if (applicationIndex === -1) {
            return res.status(404).json({ error: "Application not found" });
        }

        const application = club.pendingApplications[applicationIndex];

        if (action === "approve") {
            // Add to members
            club.members.push({ userId: application.userId });
            club.memberCount += 1;

            // Add club to user's joinedClubs
            await User.findByIdAndUpdate(application.userId, {
                $push: { joinedClubs: club._id },
            });

            // Notify user
            const notification = new Notification({
                userId: application.userId,
                title: "Club Application Approved",
                message: `Your application to join ${club.name} has been approved!`,
                type: "club",
                actionUrl: `/clubs/${club._id}`,
            });
            await notification.save();
        }

        // Remove from pending applications
        club.pendingApplications.splice(applicationIndex, 1);
        await club.save();

        res.json({ message: `Application ${action}d successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createClub,
    getClubs,
    getClubById,
    joinClub,
    resolveApplication
};
