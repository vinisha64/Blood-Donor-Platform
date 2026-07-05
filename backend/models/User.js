const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["donor", "hospital", "admin"],
      required: true,
    },

    // Donor-specific fields
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: function () {
        return this.role === "donor";
      },
    },
    age: {
      type: Number,
      min: 18,
      max: 65,
      required: function () {
        return this.role === "donor";
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: function () {
        return this.role === "donor";
      },
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Hospital-specific fields
    hospitalName: {
      type: String,
      required: function () {
        return this.role === "hospital";
      },
    },
    licenseNumber: {
      type: String,
      required: function () {
        return this.role === "hospital";
      },
    },
    isVerified: {
      type: Boolean,
      default: function () {
        // Donors are auto-usable; hospitals need admin verification
        return this.role !== "hospital";
      },
    },

    // Shared location field (GeoJSON) - used by donors and hospitals
    address: {
      type: String,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Helper: is donor eligible to donate again (90-day gap rule)
userSchema.methods.isEligibleToDonate = function () {
  if (!this.lastDonationDate) return true;
  const daysSinceLastDonation =
    (Date.now() - new Date(this.lastDonationDate).getTime()) /
    (1000 * 60 * 60 * 24);
  return daysSinceLastDonation >= 90;
};

userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
module.exports.BLOOD_GROUPS = BLOOD_GROUPS;
