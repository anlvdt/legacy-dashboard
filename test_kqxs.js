const https = require('https');

const fetchJSON = (url, headers = {}) => new Promise((resolve) => {
    https.get(url, { headers }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', (err) => resolve({ status: 500, error: err.message }));
});

async function testXoso() {
    console.log("Testing API xoso.me with User-Agent");
    const res = await fetchJSON('https://api.xoso.me/v1/kq?region=mb', {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    });
    console.log("Status:", res.status);
    console.log("Data snippet:", res.data.substring(0, 100));
}
testXoso();
