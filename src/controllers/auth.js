const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const { transporter } = require("../config/email");
const { generateToken } = require("../utils/jwt");

const register = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName } = req.body;

        // Validation
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        });
        if (existingUser) {
            return res
                .status(400)
                .json({
                    error: "User with this email or username already exists",
                });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString("hex");

        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            emailVerificationToken,
        });

        await user.save();

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${emailVerificationToken}`;
        await transporter.sendMail({
            to: email,
            subject: "Verify your email",
            html: `<p>Please click <a href="${verificationUrl}">here</a> to verify your email address.</p>`,
        });

        res.status(201).json({
            message:
                "User registered successfully. Please check your email for verification.",
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Update last active
        user.lastActive = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                rating: user.rating,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        const user = await User.findOne({ emailVerificationToken: token });
        if (!user) {
            return res
                .status(400)
                .json({ error: "Invalid verification token" });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        await user.save();

        res.json({ message: "Email verified successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate("joinedClubs", "name logo memberCount")
            .select("-password -emailVerificationToken -resetPasswordToken");

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { register, login, verifyEmail, getMe };