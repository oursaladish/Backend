require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

// ✅ Pick the right URI (priority: MONGO_URI > LOCAL > ATLAS)
const uri =
  process.env.MONGO_URI ||
  process.env.MONGO_URI_LOCAL ||
  process.env.MONGO_URI_ATLAS;

if (!uri) {
  console.error('❌ No MongoDB URI found in .env');
  process.exit(1);
}

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function seedAdmin() {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@oursaladish.com' });

    if (existingAdmin) {
      console.log('⚠️ Admin already exists:', existingAdmin.email);
      process.exit();
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const adminUser = new User({
      name: 'Super Admin',
      email: 'admin@oursaladish.com',
      password: "Admin@123",
      role: 'admin',
      address: 'HQ Office',
      phone: '9999999999',
      // firebaseUid is optional (only for Firebase accounts)
    });

    await adminUser.save();
    console.log('✅ Admin user seeded successfully');
    console.log('👉 Email: admin@oursaladish.com | Password: Admin@123');
    process.exit();
  } catch (err) {
    console.error('❌ Error seeding admin:', err);
    process.exit(1);
  }
}

seedAdmin();
