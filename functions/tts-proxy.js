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

exports.handler = async function (event, context) {
    // Lấy query parameters
    var q = (event.queryStringParameters && event.queryStringParameters.q) || '';
    var voice = (event.queryStringParameters && event.queryStringParameters.voice) || 'vi-VN-HoaiMyNeural';
    var rate = (event.queryStringParameters && event.queryStringParameters.rate) || '-0%';

    if (!q) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: 'Missing q parameter'
        };
    }

    // Giới hạn độ dài để tránh timeout Lambda (10s)
    q = q.substring(0, 1500);

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

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=86400' // cache TTS requests
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true
        };

    } catch (err) {
        console.error("Edge TTS Error:", err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: err.message })
        };
    }
};
