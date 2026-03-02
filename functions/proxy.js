const https = require('https');
const http = require('http');

exports.handler = async function(event, context) {
    const targetUrl = event.queryStringParameters.url;
    
    if (!targetUrl) {
         return { statusCode: 400, body: 'Missing URL parameter' };
    }

    try {
        const data = await new Promise((resolve, reject) => {
            const lib = targetUrl.startsWith('https') ? https : http;
            lib.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
                 // Xử lý redirect cơ bản nếu có
                 if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                     lib.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res2) => {
                         let body = '';
                         res2.on('data', chunk => body += chunk);
                         res2.on('end', () => resolve({ statusCode: res2.statusCode, body }));
                     }).on('error', reject);
                     return;
                 }
                
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
            }).on('error', reject);
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
