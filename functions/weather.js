const https = require('https');

// Simple in-memory rate limiter: 30 req/min per IP
const _rl = {};
function rateLimit(ip) {
    var now = Date.now();
    var w = _rl[ip];
    if (!w || now - w.t > 60000) { _rl[ip] = { t: now, c: 1 }; return false; }
    if (w.c >= 30) { return true; }
    w.c++;
    return false;
}

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
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }
    const { lat, lon, city } = event.queryStringParameters;

    const clientIp = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'unknown';
    if (rateLimit(clientIp)) {
        return { statusCode: 429, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Too many requests' }) };
    }

    if (!lat || !lon) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Latitude (lat) and Longitude (lon) are required.' }),
        };
    }

    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN) || latN < -90 || latN > 90 || lonN < -180 || lonN > 180) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Invalid lat/lon range.' }),
        };
    }

    try {
        // Nếu frontend đã gửi city từ IP detection, dùng luôn — không cần reverse geocoding
        const needGeo = !city;
        const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
        const GEO_URL = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=vi&zoom=5`;

        const promises = [fetch(WEATHER_URL)];
        if (needGeo) {
            promises.push(fetch(GEO_URL).catch(() => null));
        }

        const results = await Promise.all(promises);
        const weatherData = results[0];
        const geoData = needGeo ? results[1] : null;

        // Xác định tên vị trí: ưu tiên city từ frontend > reverse geocoding
        let location = city || null;
        if (!location && geoData && geoData.address) {
            location = geoData.address.city
                || geoData.address.state
                || geoData.address.town
                || geoData.address.municipality
                || geoData.address.county
                || null;
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                location: location || null,
                weather: (weatherData && weatherData.current) ? weatherData.current : null,
                source: "Open-Meteo"
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: "Lỗi tải thời tiết: " + error.message }),
        };
    }
};
