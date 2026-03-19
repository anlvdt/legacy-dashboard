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
 * Fetch URL với recursive redirect (tối đa maxRedirects hops)
 * Chỉ follow redirect đến domain trong whitelist
 */
function fetchWithRedirects(url, maxRedirects) {
    return new Promise((resolve, reject) => {
        if (maxRedirects <= 0) {
            return reject(new Error('Too many redirects'));
        }
        if (!isAllowedUrl(url)) {
            return resolve({ statusCode: 403, headers: {}, body: JSON.stringify({ error: 'Redirect domain not allowed' }) });
        }
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 10000
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchWithRedirects(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
                return;
            }
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
}

exports.handler = async function(event, context) {
    const targetUrl = event.queryStringParameters.url;
    
    if (!targetUrl) {
         return { statusCode: 400, body: 'Missing URL parameter' };
    }

    if (!isAllowedUrl(targetUrl)) {
        return {
            statusCode: 403,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Domain not allowed' })
        };
    }

    try {
        const data = await fetchWithRedirects(targetUrl, 5);

        return {
            statusCode: data.statusCode || 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': data.headers ? data.headers['content-type'] : 'text/plain',
            },
            body: data.body
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
};
