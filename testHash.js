const bcrypt = require('bcryptjs');

const hash = '$2b$10$...'; // Paste the password hash from MongoDB here

bcrypt.compare('admin123', hash).then(result => {
  console.log('Password match:', result);
});
