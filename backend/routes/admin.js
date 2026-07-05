const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Request = require("../models/Request");
const Notification = require("../models/Notification");
const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("admin"));

// @route   GET /api/admin/users
router.get("/users", async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ users });
});

// @route   PUT /api/admin/users/:id/verify
// @desc    Verify a hospital account
router.put("/users/:id/verify", async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: "hospital" },
    { isVerified: true },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: "Hospital not found" });

  await Notification.create({
    user: user._id,
    message: "Your hospital account has been verified. You can now send blood requests.",
    type: "account_verified",
  });

  res.json({ user });
});

// @route   PUT /api/admin/users/:id/toggle-active
// @desc    Suspend/unsuspend a user by toggling isAvailable/isVerified as a soft block
router.put("/users/:id/suspend", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.role === "hospital") {
    user.isVerified = !user.isVerified;
  } else if (user.role === "donor") {
    user.isAvailable = !user.isAvailable;
  }
  await user.save();
  res.json({ user });
});

// @route   DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role === "admin") {
    return res.status(400).json({ message: "Cannot delete an admin account" });
  }

  await User.deleteOne({ _id: user._id });
  await Request.deleteMany({ $or: [{ donor: user._id }, { hospital: user._id }] });
  await Notification.deleteMany({ user: user._id });

  res.json({ message: "User and related data deleted" });
});

// @route   GET /api/admin/requests
router.get("/requests", async (req, res) => {
  const requests = await Request.find()
    .populate("hospital", "hospitalName name")
    .populate("donor", "name bloodGroup")
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ requests });
});

// @route   GET /api/admin/stats
router.get("/stats", async (req, res) => {
  const [totalDonors, totalHospitals, pendingVerification, totalRequests, byStatus, byBloodGroup] =
    await Promise.all([
      User.countDocuments({ role: "donor" }),
      User.countDocuments({ role: "hospital" }),
      User.countDocuments({ role: "hospital", isVerified: false }),
      Request.countDocuments(),
      Request.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { role: "donor" } },
        { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
      ]),
    ]);

  res.json({
    totalDonors,
    totalHospitals,
    pendingVerification,
    totalRequests,
    requestsByStatus: byStatus,
    donorsByBloodGroup: byBloodGroup,
  });
});

module.exports = router;
