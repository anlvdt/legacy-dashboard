/**
 * tts-proxy.js — Netlify Function proxy cho Microsoft Edge TTS
 * Trả về audio/mpeg binary từ Edge Read Aloud API
 *
 * Endpoint: /.netlify/functions/tts-proxy?q=TEXT&voice=vi-VN-HoaiMyNeural
 */
const crypto = require('crypto');
// Polyfill for Node 18 compatibility required by msedge-tts
if (!globalThis.crypto) {
    globalThis.crypto = crypto.webcrypto;
}

const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

/**
 * Rate limit dựa trên Netlify Blobs (persistent) hoặc fallback in-memory.
 * Tối đa RATE_LIMIT_MAX requests/phút per IP.
 *
 * Netlify Blobs chỉ khả dụng khi deploy trên Netlify (context.site.id tồn tại).
 * Khi chạy local (netlify dev), tự động fallback về in-memory.
 */
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW = 60000;

// In-memory fallback (dùng khi local dev hoặc Blobs không khả dụng)
const _memRateLimit = {};

async function checkRateLimit(ip, context) {
    var now = Date.now();
    var key = 'rl_' + ip.replace(/[^a-zA-Z0-9]/g, '_');

    // Thử dùng Netlify Blobs nếu đang chạy trên Netlify
    try {
        if (context && context.site && context.site.id) {
            const { getStore } = require('@netlify/blobs');
            var store = getStore({ name: 'rate-limit', consistency: 'strong' });
            var raw = await store.get(key);
            var entry = raw ? JSON.parse(raw) : null;

            if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
                await store.set(key, JSON.stringify({ start: now, count: 1 }), { ttl: 120 });
                return true;
            }
            entry.count++;
            await store.set(key, JSON.stringify(entry), { ttl: 120 });
            return entry.count <= RATE_LIMIT_MAX;
        }
    } catch (e) {
        // Blobs không khả dụng — fallback in-memory
    }

    // Fallback: in-memory (không bền vững qua cold start, nhưng vẫn có tác dụng trong warm instance)
    if (!_memRateLimit[ip] || now - _memRateLimit[ip].start > RATE_LIMIT_WINDOW) {
        _memRateLimit[ip] = { start: now, count: 1 };
        return true;
    }
    _memRateLimit[ip].count++;
    return _memRateLimit[ip].count <= RATE_LIMIT_MAX;
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async function (event, context) {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    // Rate limit check
    var clientIp = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'unknown';
    // x-forwarded-for có thể chứa nhiều IP (proxy chain) — lấy IP đầu tiên
    clientIp = clientIp.split(',')[0].trim();

    if (!(await checkRateLimit(clientIp, context))) {
        return {
            statusCode: 429,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Too many requests. Please wait.' })
        };
    }

    // Lấy query parameters
    var q = (event.queryStringParameters && event.queryStringParameters.q) || '';
    var voice = (event.queryStringParameters && event.queryStringParameters.voice) || 'vi-VN-HoaiMyNeural';
    var rate = (event.queryStringParameters && event.queryStringParameters.rate) || '-0%';

    // Validate và giới hạn độ dài input trước khi xử lý
    if (!q || typeof q !== 'string') {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: 'Missing q parameter'
        };
    }
    if (q.length > 3000) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Text quá dài. Tối đa 3000 ký tự.' })
        };
    }

    // Validate voice parameter (chỉ cho phép các giọng tiếng Việt)
    var ALLOWED_VOICES = ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'];
    if (ALLOWED_VOICES.indexOf(voice) === -1) {
        voice = 'vi-VN-HoaiMyNeural';
    }

    // Escape XML characters để tránh lỗi SSML parse của msedgetts
    q = q.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    try {
        const tts = new MsEdgeTTS();
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        const { audioStream } = tts.toStream(q, { rate: rate });

        const chunks = [];
        await new Promise((resolve, reject) => {
            audioStream.on('data', chunk => chunks.push(chunk));
            audioStream.on('end', resolve);
            audioStream.on('error', reject);
        });

        const buffer = Buffer.concat(chunks);

        if (buffer.length === 0) {
            console.error("Edge TTS returned empty audio for:", q.substring(0, 60));
            return {
                statusCode: 502,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Empty audio response' })
            };
        }

        console.log("TTS OK:", q.substring(0, 40), "→", buffer.length, "bytes");

        return {
            statusCode: 200,
            headers: Object.assign({}, CORS_HEADERS, {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=86400'
            }),
            body: buffer.toString('base64'),
            isBase64Encoded: true
        };

    } catch (err) {
        console.error("Edge TTS Error:", err);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: err.message })
        };
    }
};
