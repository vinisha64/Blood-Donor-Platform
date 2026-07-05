const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// @route   GET /api/donors/search
// @desc    Search nearby donors using geospatial query
// @access  Hospital, Admin
// @query   latitude, longitude, bloodGroup, maxDistance (km, default 25)
router.get("/search", protect, authorize("hospital", "admin"), async (req, res) => {
  try {
    const { latitude, longitude, bloodGroup, maxDistance, onlyAvailable } = req.query;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "latitude and longitude query params are required" });
    }

    const distanceMeters = (parseFloat(maxDistance) || 25) * 1000;

    const query = {
      role: "donor",
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: distanceMeters,
        },
      },
    };

    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }
    if (onlyAvailable === "true") {
      query.isAvailable = true;
    }

    const donors = await User.find(query).limit(100);

    // Attach computed eligibility + distance info
    const results = donors.map((d) => {
      const [dLng, dLat] = d.location.coordinates;
      const distanceKm = haversineDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        dLat,
        dLng
      );
      return {
        ...d.toJSON(),
        distanceKm: Math.round(distanceKm * 10) / 10,
        eligibleToDonate: d.isEligibleToDonate(),
      };
    });

    res.json({ count: results.length, donors: results });
  } catch (err) {
    res.status(500).json({ message: "Search failed", error: err.message });
  }
});

// @route   GET /api/donors/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const donor = await User.findOne({ _id: req.params.id, role: "donor" });
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    res.json({
      ...donor.toJSON(),
      eligibleToDonate: donor.isEligibleToDonate(),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch donor", error: err.message });
  }
});

// @route   PUT /api/donors/profile
// @desc    Update own donor profile (location, availability, last donation date, etc.)
router.put("/profile/update", protect, authorize("donor"), async (req, res) => {
  try {
    const allowedFields = [
      "name", "phone", "address", "bloodGroup", "age", "gender",
      "isAvailable", "lastDonationDate",
    ];
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

    const donor = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ user: donor });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

// Haversine formula: straight-line distance in km between two lat/lng points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = router;
