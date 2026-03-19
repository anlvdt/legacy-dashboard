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
        const data = await new Promise((resolve, reject) => {
            const lib = targetUrl.startsWith('https') ? https : http;
            const req = lib.get(targetUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                timeout: 10000
            }, (res) => {
                 // Xử lý redirect — chỉ cho phép redirect đến domain trong whitelist
                 if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                     if (!isAllowedUrl(res.headers.location)) {
                         return resolve({ statusCode: 403, headers: {}, body: JSON.stringify({ error: 'Redirect domain not allowed' }) });
                     }
                     const lib2 = res.headers.location.startsWith('https') ? https : http;
                     lib2.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res2) => {
                         let body = '';
                         res2.on('data', chunk => body += chunk);
                         res2.on('end', () => resolve({ statusCode: res2.statusCode, body }));
                     }).on('error', reject);
                     return;
                 }
                
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        });

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
