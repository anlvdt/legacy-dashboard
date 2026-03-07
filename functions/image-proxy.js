/**
 * image-proxy.js — Netlify Function proxy cho hình ảnh
 * Trả về binary image data từ picsum.photos qua server
 * để bypass TLS issues trên iPad Mini 1 (iOS 9)
 *
 * Endpoint: /.netlify/functions/image-proxy?url=ENCODED_URL
 * Hoặc:     /api/image-proxy?url=ENCODED_URL
 */
const https = require('https');
const http = require('http');

exports.handler = async function (event, context) {
    var targetUrl = (event.queryStringParameters && event.queryStringParameters.url) || '';

    if (!targetUrl) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: 'Missing url parameter'
        };
    }

    try {
        var result = await fetchImage(targetUrl, 3); // Allow up to 3 redirects

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': result.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=3600'
            },
            body: result.buffer.toString('base64'),
            isBase64Encoded: true
        };
    } catch (err) {
        console.error('Image proxy error:', err.message);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: err.message })
        };
    }
};

function fetchImage(url, maxRedirects) {
    return new Promise(function (resolve, reject) {
        var lib = url.indexOf('https') === 0 ? https : http;

        lib.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        }, function (res) {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                if (maxRedirects <= 0) {
                    reject(new Error('Too many redirects'));
                    return;
                }
                fetchImage(res.headers.location, maxRedirects - 1).then(resolve, reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error('HTTP ' + res.statusCode));
                return;
            }

            var chunks = [];
            res.on('data', function (chunk) { chunks.push(chunk); });
            res.on('end', function () {
                resolve({
                    buffer: Buffer.concat(chunks),
                    contentType: res.headers['content-type'] || 'image/jpeg'
                });
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}
