const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(
  'mongodb+srv://hrseekersautomation:Mayur123@mayur.urnkzrg.mongodb.net/employeeDB?retryWrites=true&w=majority&appName=Mayur',
  { useNewUrlParser: true, useUnifiedTopology: true }
);

// Define the schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isApproved: Boolean,
});

const User = mongoose.model('User', UserSchema);

async function createAdmin() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = new User({
    name: 'Admin User',
    email: 'admin@example.com',
    password: hashedPassword,
    role: 'admin',
    isApproved: true,
  });

  try {
    await admin.save();
    console.log('✅ Admin created successfully with password: admin123');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin();
