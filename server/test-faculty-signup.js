import fetch from 'node-fetch';

async function testFacultySignup() {
  try {
    console.log('🧪 Testing Faculty Signup API...\n');

    const testData = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@example.com',
      faculty_id: 'FA1234AB2025'
    };

    console.log('📤 Sending request with data:', testData);

    const response = await fetch('http://localhost:5050/admin/faculty', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Faculty signup successful!');
      console.log('📧 Check the email for login credentials');
      console.log('🔑 Generated Password:', result.data?.generated_password);
    } else {
      console.log('\n❌ Faculty signup failed!');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Test with missing faculty_id (should fail)
async function testFacultySignupMissingId() {
  try {
    console.log('\n🧪 Testing Faculty Signup with Missing Faculty ID (should fail)...\n');

    const testData = {
      firstname: 'Jane',
      lastname: 'Smith',
      email: 'jane.smith@example.com'
      // No faculty_id provided - should fail validation
    };

    console.log('📤 Sending request with data:', testData);

    const response = await fetch('http://localhost:5050/admin/faculty', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n❌ This should have failed but succeeded!');
    } else {
      console.log('\n✅ Faculty signup correctly failed due to missing faculty_id');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run tests
testFacultySignup();
setTimeout(() => testFacultySignupMissingId(), 2000);
