import axios from 'axios';

async function testCreate() {
    try {
        const response = await axios.post('http://localhost:5000/api/payment/create', {
            userId: 'test_script',
            userEmail: 'test@example.com',
            totalAmount: 1850,
            sources: [
                { type: 'WALLET', amount: 850 },
                { type: 'CARD', amount: 1000 }
            ]
        });
        console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.status : error.message);
        if (error.response) console.error('Data:', error.response.data);
    }
}

testCreate();
