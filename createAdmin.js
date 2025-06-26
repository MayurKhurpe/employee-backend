// createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(
  'mongodb+srv://hrseekersautomation:Mayur123@mayur.urnkzrg.mongodb.net/employeeDB?retryWrites=true&w=majority&appName=Mayur'
);

mongoose.connection.once('open', async () => {
  const email = 'admin@example.com';
  const plainPassword = 'admin123';

  const existing = await User.findOne({ email });

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  if (existing) {
    existing.password = hashedPassword;
    existing.role = 'admin';
    existing.isApproved = true;
    await existing.save();
    console.log('✅ Admin password updated.');
  } else {
    const admin = new User({
      name: 'Admin User',
      email,
      password: hashedPassword,
      role: 'admin',
      isApproved: true,
    });
    await admin.save();
    console.log('✅ Admin created.');
  }

  mongoose.disconnect();
});
