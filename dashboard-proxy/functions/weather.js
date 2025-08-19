const https = require('https://');

const fetch = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                reject(new Error("Failed to parse JSON response."));
            }
        });
    }).on('error', (err) => reject(new Error("API request failed: " + err.message)));
});

exports.handler = async function(event, context) {
    const { lat, lon } = event.queryStringParameters;

    if (!lat || !lon) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Latitude (lat) and Longitude (lon) are required.' }),
        };
    }

    const GEOCODING_URL = `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=vi&format=json`;
    const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;

    try {
        const [geoData, weatherData] = await Promise.all([
            fetch(GEOCODING_URL),
            fetch(WEATHER_URL)
        ]);

        const response = {
            location: (geoData && geoData.results && geoData.results.length > 0) ? geoData.results[0].name : "Không rõ",
            weather: (weatherData && weatherData.current) ? weatherData.current : null
        };

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(response)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message }),
        };
    }
};