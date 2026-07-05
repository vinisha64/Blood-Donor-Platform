const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const User = require("../models/User");
const Notification = require("../models/Notification");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/auth");

// Prevent brute-force login attempts and registration spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many attempts from this device. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

// @route   POST /api/auth/register/donor
router.post("/register/donor", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      bloodGroup,
      age,
      gender,
      address,
      latitude,
      longitude,
    } = req.body;

    if (
      !name || !email || !password || !phone || !bloodGroup ||
      !age || !gender || latitude === undefined || longitude === undefined
    ) {
      return res.status(400).json({ message: "Please fill in all required fields, including location" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: "donor",
      bloodGroup,
      age,
      gender,
      address,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    });

    const token = generateToken(user._id, user.role);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// @route   POST /api/auth/register/hospital
router.post("/register/hospital", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      hospitalName,
      licenseNumber,
      address,
      latitude,
      longitude,
    } = req.body;

    if (
      !name || !email || !password || !phone || !hospitalName ||
      !licenseNumber || latitude === undefined || longitude === undefined
    ) {
      return res.status(400).json({ message: "Please fill in all required fields, including location" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: "hospital",
      hospitalName,
      licenseNumber,
      address,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    });

    const token = generateToken(user._id, user.role);
    res.status(201).json({
      token,
      user,
      notice: "Your hospital account has been created and is pending admin verification. You can browse donors, but sending requests requires verification.",
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// @route   POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.role);
    user.password = undefined;
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// @route   GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });
  res.json({ user: req.user, unreadCount });
});

module.exports = router;
