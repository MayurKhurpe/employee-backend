const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to DB
mongoose.connect(
  'mongodb+srv://hrseekersautomation:Mayur123@mayur.urnkzrg.mongodb.net/employeeDB?retryWrites=true&w=majority&appName=Mayur',
  { useNewUrlParser: true, useUnifiedTopology: true }
);

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  isApproved: Boolean,
  role: String
});

const User = mongoose.model('User', UserSchema);

async function updatePassword() {
  const email = 'admin@example.com';
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const result = await User.findOneAndUpdate(
    { email },
    { password: hashedPassword, isApproved: true, role: 'admin' },
    { new: true }
  );

  if (result) {
    console.log('✅ Password updated successfully.');
  } else {
    console.log('❌ Admin user not found.');
  }

  mongoose.disconnect();
}

updatePassword();
