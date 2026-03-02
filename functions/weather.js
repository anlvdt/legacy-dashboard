const https = require('https');

const fetch = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
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
    }).on('error', (err) => reject(new Error("API request failed: " + err.message)));
});

exports.handler = async function (event, context) {
    const { lat, lon } = event.queryStringParameters;

    if (!lat || !lon) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Latitude (lat) and Longitude (lon) are required.' }),
        };
    }

    const providers = [
        // 1. Primary: Open-Meteo
        async () => {
            const GEOCODING_URL = `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=vi&format=json`;
            const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;

            const [geoData, weatherData] = await Promise.all([
                fetch(GEOCODING_URL),
                fetch(WEATHER_URL)
            ]);

            return {
                location: (geoData && geoData.results && geoData.results.length > 0) ? geoData.results[0].name : "Không rõ",
                weather: (weatherData && weatherData.current) ? weatherData.current : null,
                source: "Open-Meteo"
            };
        },
        // 2. Fallback 1: DBThoiTiet / WeatherAPI alternative (Simulated structure if primary 500s)
        async () => {
            const FALLBACK_URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
            const weatherData = await fetch(FALLBACK_URL);
            return {
                location: "Vị trí Dự phòng",
                weather: (weatherData && weatherData.current) ? weatherData.current : null,
                source: "Fallback Node"
            };
        }
    ];

    let finalResponse = null;
    let fallbackError = null;

    for (const provider of providers) {
        try {
            const data = await provider();
            if (data && data.weather) {
                finalResponse = data;
                break; // Thành công, thoát vòng lặp fallback
            }
        } catch (error) {
            fallbackError = error;
            console.log(`[Redundancy] Provider failed, trying next... ${error.message}`);
            continue; // Chuyển sang provider tiếp theo
        }
    }

    if (finalResponse) {
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(finalResponse)
        };
    } else {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: "Tất cả các nguồn thời tiết đều không phản hồi: " + (fallbackError ? fallbackError.message : "Unknown error") }),
        };
    }
};
