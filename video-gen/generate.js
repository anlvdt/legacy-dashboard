#!/usr/bin/env node
/**
 * video-gen/generate.js — Entry point: tạo video tin tức TikTok tự động
 *
 * Chạy: node video-gen/generate.js
 *
 * Flow:
 * 1. Fetch tin tức từ API
 * 2. Tải audio TTS
 * 3. Tải ảnh Picsum
 * 4. Ghép video FFmpeg (intro + segments + credits)
 * 5. Tạo file SRT phụ đề
 * 6. Output: video-gen/output/news_YYYYMMDD_HHmmss.mp4 + .srt
 */
var fs = require('fs');
var path = require('path');
var config = require('./config');
var fetchNews = require('./fetch-news');
var downloadAudio = require('./tts-download');
var downloadImages = require('./image-download');
var videoBuilder = require('./video-builder');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanDir(dir) {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(function(f) {
            var fp = path.join(dir, f);
            try { if (fs.statSync(fp).isFile()) fs.unlinkSync(fp); } catch(e) { /* ignore locked files */ }
        });
    }
}

function timestamp() {
    var d = new Date();
    return d.getFullYear()
        + pad2(d.getMonth() + 1)
        + pad2(d.getDate()) + '_'
        + pad2(d.getHours())
        + pad2(d.getMinutes())
        + pad2(d.getSeconds());
}

function pad2(n) { return n < 10 ? '0' + n : String(n); }

async function main() {
    var startTime = Date.now();
    console.log('═══════════════════════════════════════');
    console.log('  VIDEO TIN TỨC TIKTOK — AUTO GENERATOR');
    console.log('  ' + new Date().toLocaleString('vi-VN'));
    console.log('═══════════════════════════════════════\n');

    // Chuẩn bị thư mục
    ensureDir(config.OUTPUT_DIR);
    ensureDir(config.TEMP_DIR);
    cleanDir(config.TEMP_DIR);

    try {
        // 1. Fetch tin tức
        var items = await fetchNews();
        if (items.length === 0) {
            console.log('[!] Không có tin nào. Dừng.');
            return;
        }

        // 2. Tải audio TTS
        var audioFiles = await downloadAudio(items, config.TEMP_DIR);

        // 3. Tải ảnh nền
        var imageFiles = await downloadImages(items.length, config.TEMP_DIR);

        // Lọc bỏ tin thiếu audio hoặc ảnh
        var validItems = [];
        var validAudio = [];
        var validImages = [];
        for (var i = 0; i < items.length; i++) {
            if (audioFiles[i] && imageFiles[i]) {
                validItems.push(items[i]);
                validAudio.push(audioFiles[i]);
                validImages.push(imageFiles[i]);
            }
        }

        if (validItems.length === 0) {
            console.log('[!] Không có tin hợp lệ (thiếu audio/ảnh). Dừng.');
            return;
        }

        console.log('\n[OK] ' + validItems.length + '/' + items.length + ' tin hợp lệ\n');

        // 4. Tạo video
        var ts = timestamp();
        var videoPath = path.join(config.OUTPUT_DIR, 'news_' + ts + '.mp4');
        var srtPath = path.join(config.OUTPUT_DIR, 'news_' + ts + '.srt');

        await videoBuilder.buildVideo(validItems, validAudio, validImages, srtPath, videoPath, config.TEMP_DIR);

        // 5. Cleanup temp
        cleanDir(config.TEMP_DIR);

        var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('\n═══════════════════════════════════════');
        console.log('  HOÀN THÀNH trong ' + elapsed + 's');
        console.log('  Video: ' + videoPath);
        console.log('  Phụ đề: ' + srtPath);
        console.log('═══════════════════════════════════════');

    } catch(err) {
        console.error('\n[LỖI] ' + err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

main();
