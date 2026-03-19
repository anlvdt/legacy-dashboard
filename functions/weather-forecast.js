const https = require('https');

const fetch = (url) => new Promise((resolve, reject) => {
    const req = https.get(url, {
        headers: { 'User-Agent': 'LegacyFrame/1.0' }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP Error ${res.statusCode}`));
                }
            } catch (e) {
                reject(new Error("Failed to parse JSON response."));
            }
        });
    });
    req.on('error', (err) => reject(new Error("API request failed: " + err.message)));
    req.setTimeout(8000, () => { req.destroy(); reject(new Error("Request timeout")); });
});

exports.handler = async function (event, context) {
    const { lat, lon } = event.queryStringParameters;

    if (!lat || !lon) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'lat and lon are required.' }),
        };
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto&forecast_days=2`;
        const data = await fetch(url);

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: "Lỗi tải dự báo: " + error.message }),
        };
    }
};
