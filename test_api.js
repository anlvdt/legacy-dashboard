const https = require('https');

const fetchJSON = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            } else {
                resolve({ status: res.statusCode, data: data });
            }
        });
    }).on('error', (err) => resolve({ status: 500, error: err.message }));
});

async function runTests() {
    console.log("=== Testing API Endpoints ===");
    
    // 1. Weather
    console.log("\n[1] Testing Weather (Open-Meteo)");
    const weather = await fetchJSON('https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code');
    console.log(`Status: ${weather.status}, Data: ${typeof weather.data === 'object' ? 'OK' : 'Failed'}`);

    // 2. Gold (Vang.Today)
    console.log("\n[2] Testing Gold (Vang.Today)");
    const gold = await fetchJSON('https://api.vang.today/');
    console.log(`Status: ${gold.status}, Data: ${typeof gold.data === 'object' ? 'OK' : String(gold.data).substring(0, 50)}`);

    // 3. Gold SJC XML
    console.log("\n[3] Testing Gold SJC XML (Direct)");
    const goldXml = await fetchJSON('https://sjc.com.vn/xml/tygiavang.xml');
    console.log(`Status: ${goldXml.status}, Data: ${typeof goldXml.data === 'string' ? String(goldXml.data).substring(0, 50) : 'Failed'}`);
    
    // 4. Lottery (xoso.me)
    console.log("\n[4] Testing Lottery (xoso.me MB)");
    const lottery = await fetchJSON('https://api.xoso.me/v1/kq?region=mb');
    console.log(`Status: ${lottery.status}, Data: ${typeof lottery.data === 'object' ? 'OK' : 'Failed'}`);
}

runTests();
