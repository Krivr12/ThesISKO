import bcrypt from 'bcrypt';

// Choose your new password here
const newPassword = 'admin123'; // ⬅️ CHANGE THIS TO YOUR DESIRED PASSWORD

// Generate hash (same method used in your app)
const saltRounds = 10;
bcrypt.hash(newPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  
  console.log('✅ New password hash generated!');
  console.log('\n📋 Copy this hash and update your database:\n');
  console.log(hash);
  console.log('\n🔑 Password:', newPassword);
  console.log('\nUpdate your database with this SQL:');
  console.log(`UPDATE users_info SET password_hash = '${hash}' WHERE email = 'your-email@example.com';`);
});


