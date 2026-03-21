const https = require('https');

// Simple in-memory rate limiter: 20 req/min per IP
const _rl = {};
function rateLimit(ip) {
    var now = Date.now();
    var w = _rl[ip];
    if (!w || now - w.t > 60000) { _rl[ip] = { t: now, c: 1 }; return false; }
    if (w.c >= 20) { return true; }
    w.c++;
    return false;
}

// A simple utility to fetch raw HTML
const fetchHTML = (url) => new Promise((resolve, reject) => {
    https.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml'
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
    }).on('error', (err) => resolve(null));
});

exports.handler = async function (event, context) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }
    const clientIp = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'unknown';
    if (rateLimit(clientIp)) {
        return { statusCode: 429, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Too many requests' }) };
    }
    // We scrape a reliable public source like webgia.com for petrol prices since there's no official open API
    const TARGET_URL = 'https://webgia.com/gia-xang-dau/petrolimex/';

    try {
        const html = await fetchHTML(TARGET_URL);
        if (!html) throw new Error("Could not fetch page html.");

        const prices = {};

        // Very basic regex scraping to find the prices of RON 95, E5, and DO from the HTML table
        // We look for patterns like: <td>RON 95-III</td> <td>24,500</td>
        const extractPrice = (htmlStr, keyword) => {
            // Regex handles patterns like: <th><a ...>Xăng RON 95-III</a></th><td class="text-right">20.570</td>
            const regex = new RegExp(`${keyword}.*?<td[^>]*>([0-9.,]+)<\/td>`, 'i');
            const match = htmlStr.match(regex);
            if (match && match[1]) {
                // Strip dots/commas to get a pure integer string
                return match[1].replace(/[,.]/g, '');
            }
            return null;
        };

        prices['ron95'] = extractPrice(html, 'RON 95-III');
        prices['e5'] = extractPrice(html, 'E5 RON 92-II');
        prices['do'] = extractPrice(html, 'DO 0,05S-II');

        // If we failed to scrape via regex (e.g., website layout changed), we fallback to some hardcoded placeholders
        // just so the widget doesn't break, but ideally, this should throw an error or return nulls.
        if (!prices['ron95'] && !prices['e5'] && !prices['do']) {
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: "Failed to parse fuel prices." })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                data: prices,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: "Lỗi kết nối API giá xăng." }),
        };
    }
};
