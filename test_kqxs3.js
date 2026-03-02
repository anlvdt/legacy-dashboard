const https = require('https');

const fetchJSON = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
             resolve({ status: res.statusCode, data });
        });
    }).on('error', (err) => resolve({ status: 500, error: err.message }));
});

async function runTests() {
    console.log("=== Testing Lottery API Endpoint (ManyCai) ===");
    const lottery = await fetchJSON('https://manycai.com/xoso/mb');
    console.log(`Status: ${lottery.status}, Data size: ${lottery.data.length}`);
}

runTests();
