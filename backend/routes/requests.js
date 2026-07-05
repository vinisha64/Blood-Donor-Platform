const express = require("express");
const router = express.Router();
const Request = require("../models/Request");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// @route   POST /api/requests
// @desc    Hospital sends a blood request to a specific donor
router.post("/", protect, authorize("hospital"), async (req, res) => {
  try {
    if (!req.user.isVerified) {
      return res.status(403).json({
        message: "Your hospital account is pending admin verification. You cannot send requests yet.",
      });
    }

    const { donorId, bloodGroup, unitsNeeded, urgency, message } = req.body;
    if (!donorId || !bloodGroup) {
      return res.status(400).json({ message: "donorId and bloodGroup are required" });
    }

    const donor = await User.findOne({ _id: donorId, role: "donor" });
    if (!donor) return res.status(404).json({ message: "Donor not found" });

    const request = await Request.create({
      hospital: req.user._id,
      donor: donorId,
      bloodGroup,
      unitsNeeded: unitsNeeded || 1,
      urgency: urgency || "normal",
      message,
    });

    await Notification.create({
      user: donor._id,
      message: `${req.user.hospitalName} requested ${unitsNeeded || 1} unit(s) of ${bloodGroup} blood${urgency === "critical" ? " — CRITICAL" : ""}.`,
      type: "new_request",
      relatedRequest: request._id,
    });

    const populated = await request.populate([
      { path: "hospital", select: "hospitalName name phone address" },
      { path: "donor", select: "name bloodGroup phone" },
    ]);

    // @route   POST /api/requests/broadcast
// @desc    Hospital sends the same request to every matching donor in a radius at once
router.post("/broadcast", protect, authorize("hospital"), async (req, res) => {
  try {
    if (!req.user.isVerified) {
      return res.status(403).json({
        message: "Your hospital account is pending admin verification. You cannot send requests yet.",
      });
    }

    const { bloodGroup, latitude, longitude, maxDistance, unitsNeeded, urgency, message } = req.body;
    if (!bloodGroup || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "bloodGroup, latitude and longitude are required" });
    }

    const distanceMeters = (parseFloat(maxDistance) || 25) * 1000;

    const donors = await User.find({
      role: "donor",
      bloodGroup,
      isAvailable: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: distanceMeters,
        },
      },
    }).limit(50); // safety cap so one broadcast can't spam hundreds of people

    if (donors.length === 0) {
      return res.status(404).json({ message: "No matching donors found in this radius to broadcast to" });
    }

    const requests = await Request.insertMany(
      donors.map((donor) => ({
        hospital: req.user._id,
        donor: donor._id,
        bloodGroup,
        unitsNeeded: unitsNeeded || 1,
        urgency: urgency || "critical",
        message,
      }))
    );

    await Notification.insertMany(
      donors.map((donor) => ({
        user: donor._id,
        message: `URGENT: ${req.user.hospitalName} needs ${unitsNeeded || 1} unit(s) of ${bloodGroup} blood nearby. Please respond if you can help.`,
        type: "new_request",
        relatedRequest: requests.find((r) => String(r.donor) === String(donor._id))._id,
      }))
    );

    res.status(201).json({
      message: `Broadcast sent to ${donors.length} donor(s)`,
      count: donors.length,
    });
  } catch (err) {
    res.status(500).json({ message: "Broadcast failed", error: err.message });
  }
});

    res.status(201).json({ request: populated });
  } catch (err) {
    res.status(500).json({ message: "Failed to send request", error: err.message });
  }
});

// @route   GET /api/requests/my
// @desc    Donor: requests received. Hospital: requests sent.
router.get("/my", protect, authorize("donor", "hospital"), async (req, res) => {
  try {
    const filter = req.user.role === "donor"
      ? { donor: req.user._id }
      : { hospital: req.user._id };

    const requests = await Request.find(filter)
      .populate("hospital", "hospitalName name phone address")
      .populate("donor", "name bloodGroup phone address")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
});

// @route   PUT /api/requests/:id/respond
// @desc    Donor accepts or declines a pending request
router.put("/:id/respond", protect, authorize("donor"), async (req, res) => {
  try {
    const { action } = req.body; // "accept" | "decline"
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ message: "action must be 'accept' or 'decline'" });
    }

    const request = await Request.findOne({ _id: req.params.id, donor: req.user._id });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: `Request already ${request.status}` });
    }

    request.status = action === "accept" ? "accepted" : "declined";
    await request.save();

    await Notification.create({
      user: request.hospital,
      message: `${req.user.name} has ${request.status} your request for ${request.bloodGroup} blood.`,
      type: action === "accept" ? "request_accepted" : "request_declined",
      relatedRequest: request._id,
    });

    res.json({ request });
  } catch (err) {
    res.status(500).json({ message: "Failed to update request", error: err.message });
  }
});

// @route   PUT /api/requests/:id/complete
// @desc    Hospital marks an accepted request as completed (donation happened)
router.put("/:id/complete", protect, authorize("hospital"), async (req, res) => {
  try {
    const request = await Request.findOne({ _id: req.params.id, hospital: req.user._id });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "accepted") {
      return res.status(400).json({ message: "Only accepted requests can be marked completed" });
    }

    request.status = "completed";
    await request.save();

    // Update donor's last donation date automatically
    await User.findByIdAndUpdate(request.donor, { lastDonationDate: new Date() });

    await Notification.create({
      user: request.donor,
      message: `Thank you! Your donation for ${request.hospital} has been marked completed.`,
      type: "request_completed",
      relatedRequest: request._id,
    });

    res.json({ request });
  } catch (err) {
    res.status(500).json({ message: "Failed to complete request", error: err.message });
  }
});

// @route   PUT /api/requests/:id/cancel
// @desc    Hospital cancels a request it sent, as long as it's still pending
router.put("/:id/cancel", protect, authorize("hospital"), async (req, res) => {
  try {
    const request = await Request.findOne({ _id: req.params.id, hospital: req.user._id });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: `Cannot cancel a request that is already ${request.status}` });
    }

    request.status = "cancelled";
    await request.save();

    await Notification.create({
      user: request.donor,
      message: `${req.user.hospitalName} cancelled their request for ${request.bloodGroup} blood.`,
      type: "system",
      relatedRequest: request._id,
    });

    res.json({ request });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel request", error: err.message });
  }
});

// @route   GET /api/requests/notifications
router.get("/notifications/all", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications", error: err.message });
  }
});

// @route   PUT /api/requests/notifications/:id/read
router.put("/notifications/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ message: "Failed to update notification", error: err.message });
  }
});

// @route   PUT /api/requests/notifications/read-all
router.put("/notifications/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update notifications", error: err.message });
  }
});

module.exports = router;
