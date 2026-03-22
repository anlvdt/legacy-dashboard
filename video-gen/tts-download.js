/**
 * video-gen/tts-download.js — Tạo audio TTS bằng cách gọi trực tiếp tts-proxy function
 */
var fs = require('fs');
var path = require('path');
var config = require('./config');
var normalize = require('./tts-normalize');

var ttsFunc = null;
function getTtsHandler() {
    if (!ttsFunc) {
        ttsFunc = require(path.resolve(__dirname, '..', 'functions', 'tts-proxy.js'));
    }
    return ttsFunc;
}

async function generateAudio(text, voice, outputPath) {
    var handler = getTtsHandler();
    var event = {
        httpMethod: 'GET',
        headers: { 'x-forwarded-for': '127.0.0.1' },
        queryStringParameters: {
            q: text,
            voice: voice,
            rate: config.TTS_RATE
        }
    };
    var result = await handler.handler(event, {});
    if (result.statusCode !== 200) {
        throw new Error('TTS error: ' + result.statusCode + ' ' + (result.body || '').substring(0, 100));
    }
    var buffer = Buffer.from(result.body, 'base64');
    fs.writeFileSync(outputPath, buffer);
    return buffer.length;
}

async function downloadAllAudio(items, tempDir) {
    console.log('[tts] Đang tạo audio cho ' + items.length + ' tin...');
    var audioFiles = [];

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var parts = [];
        if (item.title) parts.push(item.title + '.');
        var summary = item.summary || '';
        if (summary && summary !== item.title) {
            if (summary.length > 300) {
                summary = summary.substring(0, 300);
                var lastDot = summary.lastIndexOf('.');
                if (lastDot > 150) summary = summary.substring(0, lastDot + 1);
            }
            parts.push(summary);
        }
        var fullText = normalize(parts.join(' '));
        if (fullText.length > 1400) fullText = fullText.substring(0, 1400);

        var voice = config.VOICES[i % 2];
        var audioPath = path.join(tempDir, 'audio_' + i + '.mp3');

        try {
            var size = await generateAudio(fullText, voice, audioPath);
            if (size < 1000) {
                console.log('[tts] #' + i + ' audio quá nhỏ (' + size + 'B), bỏ qua');
                audioFiles.push(null);
            } else {
                console.log('[tts] #' + i + ' OK (' + Math.round(size/1024) + 'KB) - ' + item.title.substring(0, 50));
                audioFiles.push(audioPath);
            }
        } catch(e) {
            console.log('[tts] #' + i + ' lỗi: ' + e.message);
            audioFiles.push(null);
        }

        // Delay nhẹ giữa các request
        if (i < items.length - 1) {
            await new Promise(function(r) { setTimeout(r, 300); });
        }
    }

    return audioFiles;
}

module.exports = downloadAllAudio;
