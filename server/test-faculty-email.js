import fetch from 'node-fetch';

async function testFacultyEmail() {
  try {
    console.log('🧪 Testing Faculty Email Sender...\n');

    const testData = {
      firstname: 'Ma. Angela',
      lastname: 'Galicia',
      email: 'galicia.maangela.natano@gmail.com',
      faculty_id: 'FA0001MN2024'
    };

    console.log('📤 Sending request with data:', testData);
    console.log('📧 Email will be sent to:', testData.email);

    const response = await fetch('http://localhost:5050/admin/faculty', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    console.log('\n📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Faculty account created successfully!');
      console.log('🔑 Generated Password:', result.data?.generated_password);
      console.log('📧 Check your email inbox for the credentials');
      console.log('📱 Email should arrive at:', testData.email);
    } else {
      console.log('\n❌ Faculty creation failed!');
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testFacultyEmail();
