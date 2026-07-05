const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "new_request",
        "request_accepted",
        "request_declined",
        "request_completed",
        "account_verified",
        "system",
      ],
      default: "system",
    },
    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
