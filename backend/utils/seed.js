// Run with: npm run seed
// Creates one admin account and a handful of sample donors/hospitals for testing.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Seeding data...");

  await User.deleteMany({ email: { $regex: "@seed.test$" } });

  const admin = await User.findOne({ role: "admin" });
  if (!admin) {
    await User.create({
      name: "Platform Admin",
      email: "admin@seed.test",
      password: "admin123",
      phone: "9999999999",
      role: "admin",
    });
    console.log("Created admin: admin@seed.test / admin123");
  } else {
    console.log("Admin already exists, skipping.");
  }

  // Sample donors around Bengaluru, India (varying lat/lng slightly)
  const sampleDonors = [
    { name: "Ravi Kumar", bloodGroup: "O+", lat: 12.9716, lng: 77.5946 },
    { name: "Asha Rao", bloodGroup: "A+", lat: 12.9352, lng: 77.6245 },
    { name: "Vijay Singh", bloodGroup: "B+", lat: 13.0067, lng: 77.5667 },
    { name: "Priya Sharma", bloodGroup: "O-", lat: 12.9611, lng: 77.6387 },
    { name: "Karan Mehta", bloodGroup: "AB+", lat: 12.9784, lng: 77.6408 },
  ];

  for (const d of sampleDonors) {
    const email = `${d.name.split(" ")[0].toLowerCase()}@seed.test`;
    const exists = await User.findOne({ email });
    if (exists) continue;
    await User.create({
      name: d.name,
      email,
      password: "password123",
      phone: "9876543210",
      role: "donor",
      bloodGroup: d.bloodGroup,
      age: 28,
      gender: "male",
      address: "Bengaluru, Karnataka",
      location: { type: "Point", coordinates: [d.lng, d.lat] },
    });
  }
  console.log(`Seeded ${sampleDonors.length} sample donors (password: password123)`);

  const hospitalExists = await User.findOne({ email: "cityhospital@seed.test" });
  if (!hospitalExists) {
    await User.create({
      name: "Dr. Suresh Nair",
      email: "cityhospital@seed.test",
      password: "password123",
      phone: "9123456780",
      role: "hospital",
      hospitalName: "City Care Hospital",
      licenseNumber: "LIC-2024-0099",
      address: "MG Road, Bengaluru",
      location: { type: "Point", coordinates: [77.6103, 12.9757] },
      isVerified: true,
    });
    console.log("Seeded verified hospital: cityhospital@seed.test / password123");
  }

  console.log("Seeding complete.");
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
