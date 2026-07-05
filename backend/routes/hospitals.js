const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// @route   PUT /api/hospitals/profile/update
// @desc    Update own hospital profile (name, phone, address, location)
router.put("/profile/update", protect, authorize("hospital"), async (req, res) => {
  try {
    const allowedFields = ["name", "phone", "address", "hospitalName"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      updates.location = {
        type: "Point",
        coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
      };
    }

    const hospital = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ user: hospital });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

module.exports = router;
