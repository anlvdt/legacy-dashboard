const https = require('https');
const http = require('http');

/**
 * Whitelist các domain được phép proxy
 * Chỉ cho phép các nguồn tin RSS, giá vàng SJC, và tỷ giá
 */
const ALLOWED_DOMAINS = [
    'vnexpress.net',
    'thanhnien.vn',
    'dantri.com.vn',
    'tuoitre.vn',
    'sjc.com.vn',
    'open.er-api.com'
];

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function isAllowedUrl(url) {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();
        for (let i = 0; i < ALLOWED_DOMAINS.length; i++) {
            if (hostname === ALLOWED_DOMAINS[i] || hostname.endsWith('.' + ALLOWED_DOMAINS[i])) {
                return true;
            }
        }
    } catch (e) {
        return false;
    }
    return false;
}

/**
 * Fetch URL với recursive redirect (tối đa maxRedirects hops).
 * Validate whitelist tại TỪNG bước redirect — không chỉ URL ban đầu.
 * Trả về { statusCode, headers, body, finalUrl } để caller có thể
 * kiểm tra finalUrl một lần nữa nếu cần.
 */
function fetchWithRedirects(url, maxRedirects) {
    return new Promise((resolve, reject) => {
        if (maxRedirects <= 0) {
            return reject(new Error('Too many redirects'));
        }
        // Validate whitelist tại mỗi hop — ngăn redirect chain bypass
        if (!isAllowedUrl(url)) {
            return resolve({ statusCode: 403, headers: {}, body: JSON.stringify({ error: 'Redirect domain not allowed' }), finalUrl: url });
        }
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 10000
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const nextUrl = res.headers.location;
                // Validate redirect destination trước khi follow
                if (!isAllowedUrl(nextUrl)) {
                    return resolve({ statusCode: 403, headers: {}, body: JSON.stringify({ error: 'Redirect destination not allowed' }), finalUrl: nextUrl });
                }
                fetchWithRedirects(nextUrl, maxRedirects - 1).then(resolve).catch(reject);
                return;
            }
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body, finalUrl: url }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
}

exports.handler = async function(event, context) {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    const targetUrl = event.queryStringParameters && event.queryStringParameters.url;

    if (!targetUrl) {
        return { statusCode: 400, headers: CORS_HEADERS, body: 'Missing URL parameter' };
    }

    if (!isAllowedUrl(targetUrl)) {
        return {
            statusCode: 403,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Domain not allowed' })
        };
    }

    try {
        const data = await fetchWithRedirects(targetUrl, 5);

        // Double-check: validate final URL sau toàn bộ redirect chain
        if (!isAllowedUrl(data.finalUrl)) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Final redirect destination not allowed' })
            };
        }

        return {
            statusCode: data.statusCode || 200,
            headers: Object.assign({}, CORS_HEADERS, {
                'Content-Type': data.headers ? data.headers['content-type'] : 'text/plain'
            }),
            body: data.body
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message })
        };
    }
};
