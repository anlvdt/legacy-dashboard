/**
 * video-gen/video-builder.js — Ghép ảnh + audio + subtitle thành video TikTok
 * Dùng FFmpeg command line trực tiếp (không dùng fluent-ffmpeg vì deprecated)
 */
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var config = require('./config');

function exec(cmd) {
    return new Promise(function(resolve, reject) {
        child_process.exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, function(err, stdout, stderr) {
            if (err) return reject(new Error(stderr || err.message));
            resolve(stdout.trim());
        });
    });
}

/** Lấy duration audio bằng ffprobe */
async function getAudioDuration(audioPath) {
    var cmd = 'ffprobe -v error -show_entries format=duration -of csv=p=0 "' + audioPath + '"';
    var out = await exec(cmd);
    return parseFloat(out) || 5;
}

/** Escape text cho FFmpeg drawtext filter (Windows compatible) */
function escapeFFText(text) {
    // FFmpeg drawtext trên Windows cần escape đặc biệt
    return text
        .replace(/\\/g, '/')
        .replace(/'/g, "\u2019")  // thay dấu nháy đơn bằng Unicode right quote
        .replace(/:/g, '\\:')
        .replace(/%/g, '%%');
}

/** Escape font path cho Windows FFmpeg */
function escapeFFPath(p) {
    return p.replace(/\\/g, '/').replace(/:/g, '\\\\:');
}

/** Tạo file SRT phụ đề */
function generateSRT(items, durations, srtPath) {
    var lines = [];
    var currentTime = 0;

    // Intro
    lines.push('1');
    lines.push(formatSrtTime(0) + ' --> ' + formatSrtTime(3));
    lines.push('BẢN TIN TỔNG HỢP');
    lines.push('');
    currentTime = 3;

    for (var i = 0; i < items.length; i++) {
        var dur = durations[i] || 5;
        var idx = lines.length / 4 + 1;

        // Title subtitle
        lines.push(String(Math.floor(idx)));
        lines.push(formatSrtTime(currentTime) + ' --> ' + formatSrtTime(currentTime + dur));

        // Chia text thành dòng ngắn cho subtitle
        var fullText = items[i].title;
        var summary = items[i].summary || '';
        if (summary && summary !== items[i].title && summary.length > 20) {
            fullText += '. ' + summary;
        }
        // Cắt thành dòng ~40 ký tự
        var subLines = wrapText(fullText, 40);
        lines.push(subLines.join('\n'));
        lines.push('');

        currentTime += dur + 0.5; // 0.5s gap giữa các tin
    }

    // Credits slide
    var creditIdx = Math.floor(lines.length / 4) + 1;
    lines.push(String(creditIdx));
    lines.push(formatSrtTime(currentTime) + ' --> ' + formatSrtTime(currentTime + 4));
    var sources = [];
    items.forEach(function(item) {
        if (item.source && sources.indexOf(item.source) === -1) sources.push(item.source);
    });
    lines.push('Nguồn: ' + sources.join(', '));
    lines.push('');

    fs.writeFileSync(srtPath, lines.join('\n'), 'utf8');
    return srtPath;
}

function formatSrtTime(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    var ms = Math.round((seconds % 1) * 1000);
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s) + ',' + pad3(ms);
}

function pad2(n) { return n < 10 ? '0' + n : String(n); }
function pad3(n) { return n < 10 ? '00' + n : n < 100 ? '0' + n : String(n); }

function wrapText(text, maxLen) {
    var words = text.split(' ');
    var lines = [];
    var current = '';
    for (var i = 0; i < words.length; i++) {
        if (current.length + words[i].length + 1 > maxLen && current.length > 0) {
            lines.push(current);
            current = words[i];
        } else {
            current = current ? current + ' ' + words[i] : words[i];
        }
    }
    if (current) lines.push(current);
    // Giới hạn 3 dòng
    if (lines.length > 3) {
        lines = lines.slice(0, 3);
        lines[2] = lines[2].substring(0, lines[2].length - 3) + '...';
    }
    return lines;
}

/** Wrap title thành nhiều dòng, mỗi dòng tối đa maxChars ký tự */
function wrapTitle(text, maxChars) {
    var words = text.split(' ');
    var lines = [];
    var current = '';
    for (var i = 0; i < words.length; i++) {
        if (current.length + words[i].length + 1 > maxChars && current.length > 0) {
            lines.push(current);
            current = words[i];
        } else {
            current = current ? current + ' ' + words[i] : words[i];
        }
    }
    if (current) lines.push(current);
    // Tối đa 4 dòng
    if (lines.length > 4) {
        lines = lines.slice(0, 4);
        lines[3] = lines[3].substring(0, Math.max(0, lines[3].length - 3)) + '...';
    }
    return lines;
}

/**
 * Tạo video segment cho 1 tin: ảnh + audio + text overlay
 * Layout: gradient overlay ở giữa-dưới, title wrap nhiều dòng, badge số thứ tự
 */
async function buildSegment(index, item, audioPath, imagePath, tempDir) {
    var duration = await getAudioDuration(audioPath);
    duration += 1; // thêm 1s padding

    var segmentPath = path.join(tempDir, 'segment_' + index + '.mp4');
    var sourceEsc = escapeFFText(item.source || '');
    var fontBold = escapeFFPath(config.FONT_BOLD);
    var fontNormal = escapeFFPath(config.FONT_FILE);

    // Wrap title thành nhiều dòng (~22 ký tự/dòng cho fontsize 56 trên 1080px, có padding)
    var titleLines = wrapTitle(item.title, 24);
    var titleFontSize = 56;
    var lineHeight = Math.round(titleFontSize * 1.35);

    // Tính vùng text: bắt đầu từ 38% chiều cao, mỗi dòng cách nhau lineHeight
    var textStartY = 0.38;
    var totalTextHeight = titleLines.length * lineHeight + 120; // +120 cho source + padding
    var boxTop = Math.round(config.HEIGHT * textStartY) - 40;
    var boxHeight = totalTextHeight + 80;

    // FFmpeg: ảnh loop + audio + text overlay
    var vf = '';
    // Scale ảnh về đúng kích thước video
    vf += 'scale=' + config.WIDTH + ':' + config.HEIGHT + ':force_original_aspect_ratio=increase,'
        + 'crop=' + config.WIDTH + ':' + config.HEIGHT + ',';
    // Gradient overlay (2 lớp: trên mờ, dưới đậm)
    vf += 'drawbox=x=0:y=' + boxTop + ':w=iw:h=' + boxHeight + ':color=black@0.6:t=fill,';
    // Badge số thứ tự (hình tròn vàng + số)
    vf += 'drawbox=x=30:y=30:w=80:h=80:color=0xFFCC00@0.9:t=fill,';
    vf += 'drawtext=fontfile=' + fontBold
        + ':text=' + "'" + (index + 1) + "'"
        + ':fontcolor=0x1a1a2e:fontsize=48:x=70-text_w/2:y=70-text_h/2,';

    // Tiêu đề tin — nhiều dòng
    for (var i = 0; i < titleLines.length; i++) {
        var lineEsc = escapeFFText(titleLines[i]);
        var yPos = Math.round(config.HEIGHT * textStartY) + (i * lineHeight);
        vf += 'drawtext=fontfile=' + fontBold
            + ':text=' + "'" + lineEsc + "'"
            + ':fontcolor=white:fontsize=' + titleFontSize
            + ':x=(w-text_w)/2:y=' + yPos
            + ':shadowcolor=black@0.8:shadowx=3:shadowy=3,';
    }

    // Nguồn tin (dưới title, căn giữa, có icon-like prefix)
    var sourceY = Math.round(config.HEIGHT * textStartY) + (titleLines.length * lineHeight) + 20;
    vf += 'drawtext=fontfile=' + fontNormal
        + ':text=' + "'" + escapeFFText('📰 ' + sourceEsc) + "'"
        + ':fontcolor=0xFFCC00:fontsize=32:x=(w-text_w)/2:y=' + sourceY
        + ':shadowcolor=black@0.6:shadowx=1:shadowy=1';

    var cmd = 'ffmpeg -y'
        + ' -loop 1 -i "' + imagePath + '"'
        + ' -i "' + audioPath + '"'
        + ' -c:v libx264 -tune stillimage -pix_fmt yuv420p'
        + ' -c:a aac -b:a 128k -ar 44100'
        + ' -t ' + duration.toFixed(1)
        + ' -vf "' + vf + '"'
        + ' -shortest "' + segmentPath + '"';

    await exec(cmd);
    return { path: segmentPath, duration: duration };
}

/**
 * Tạo intro slide (3 giây) — style đẹp hơn
 */
async function buildIntro(tempDir) {
    var introPath = path.join(tempDir, 'intro.mp4');
    var now = new Date();
    var dateStr = pad2(now.getDate()) + '/' + pad2(now.getMonth() + 1) + '/' + now.getFullYear();
    var dateEsc = escapeFFText(dateStr);
    var fontBold = escapeFFPath(config.FONT_BOLD);
    var fontNormal = escapeFFPath(config.FONT_FILE);

    var cmd = 'ffmpeg -y'
        + ' -f lavfi -i color=c=0x1a1a2e:s=' + config.WIDTH + 'x' + config.HEIGHT + ':d=3'
        + ' -f lavfi -i anullsrc=r=44100:cl=stereo -t 3'
        + ' -c:v libx264 -pix_fmt yuv420p -c:a aac'
        + ' -vf "'
        // Accent line
        + 'drawbox=x=' + Math.round(config.WIDTH * 0.3) + ':y=' + Math.round(config.HEIGHT * 0.34)
        + ':w=' + Math.round(config.WIDTH * 0.4) + ':h=4:color=0xFFCC00:t=fill,'
        // Title
        + 'drawtext=fontfile=' + fontBold
        + ':text=' + "'" + escapeFFText('BẢN TIN') + "'"
        + ':fontcolor=white:fontsize=80:x=(w-text_w)/2:y=h*0.38,'
        + 'drawtext=fontfile=' + fontBold
        + ':text=' + "'" + escapeFFText('TỔNG HỢP') + "'"
        + ':fontcolor=0xFFCC00:fontsize=80:x=(w-text_w)/2:y=h*0.38+90,'
        // Date
        + 'drawtext=fontfile=' + fontNormal
        + ':text=' + "'" + dateEsc + "'"
        + ':fontcolor=white@0.7:fontsize=40:x=(w-text_w)/2:y=h*0.38+200'
        + '"'
        + ' "' + introPath + '"';

    await exec(cmd);
    return introPath;
}

/**
 * Tạo credits slide cuối (4 giây) — style đẹp hơn
 */
async function buildCredits(items, tempDir) {
    var creditsPath = path.join(tempDir, 'credits.mp4');
    var sources = [];
    items.forEach(function(item) {
        if (item.source && sources.indexOf(item.source) === -1) sources.push(item.source);
    });
    var srcText = escapeFFText(sources.join(' • '));
    var fontBold = escapeFFPath(config.FONT_BOLD);
    var fontNormal = escapeFFPath(config.FONT_FILE);

    var cmd = 'ffmpeg -y'
        + ' -f lavfi -i color=c=0x1a1a2e:s=' + config.WIDTH + 'x' + config.HEIGHT + ':d=4'
        + ' -f lavfi -i anullsrc=r=44100:cl=stereo -t 4'
        + ' -c:v libx264 -pix_fmt yuv420p -c:a aac'
        + ' -vf "'
        // Accent line
        + 'drawbox=x=' + Math.round(config.WIDTH * 0.3) + ':y=' + Math.round(config.HEIGHT * 0.34)
        + ':w=' + Math.round(config.WIDTH * 0.4) + ':h=4:color=0xFFCC00:t=fill,'
        // Thank you
        + 'drawtext=fontfile=' + fontBold
        + ':text=' + "'" + escapeFFText('CẢM ƠN') + "'"
        + ':fontcolor=white:fontsize=76:x=(w-text_w)/2:y=h*0.38,'
        + 'drawtext=fontfile=' + fontBold
        + ':text=' + "'" + escapeFFText('ĐÃ XEM') + "'"
        + ':fontcolor=0xFFCC00:fontsize=76:x=(w-text_w)/2:y=h*0.38+86,'
        // Sources
        + 'drawtext=fontfile=' + fontNormal
        + ':text=' + "'" + srcText + "'"
        + ':fontcolor=white@0.5:fontsize=28:x=(w-text_w)/2:y=h*0.38+220'
        + '"'
        + ' "' + creditsPath + '"';

    await exec(cmd);
    return creditsPath;
}

/**
 * Concat tất cả segments thành 1 video
 */
async function concatSegments(segmentPaths, outputPath, tempDir) {
    var listPath = path.join(tempDir, 'concat_list.txt');
    var lines = segmentPaths.map(function(p) {
        // Dùng absolute path và forward slash cho FFmpeg
        var abs = path.resolve(p).replace(/\\/g, '/');
        return "file '" + abs + "'";
    });
    fs.writeFileSync(listPath, lines.join('\n'), 'utf8');

    var cmd = 'ffmpeg -y -f concat -safe 0 -i "' + listPath + '"'
        + ' -c copy -movflags +faststart'
        + ' "' + outputPath + '"';

    await exec(cmd);
    return outputPath;
}

/**
 * Build toàn bộ video
 */
async function buildVideo(items, audioFiles, imageFiles, srtPath, outputPath, tempDir) {
    console.log('[video] Bắt đầu tạo video...');
    var segments = [];

    // 1. Intro
    var introPath = await buildIntro(tempDir);
    segments.push(introPath);
    console.log('[video] Intro OK');

    // 2. Từng tin
    var durations = [];
    for (var i = 0; i < items.length; i++) {
        if (!audioFiles[i] || !imageFiles[i]) {
            console.log('[video] Bỏ qua tin #' + i + ' (thiếu audio/ảnh)');
            durations.push(0);
            continue;
        }
        var seg = await buildSegment(i, items[i], audioFiles[i], imageFiles[i], tempDir);
        segments.push(seg.path);
        durations.push(seg.duration);
        console.log('[video] Segment #' + i + ' OK (' + seg.duration.toFixed(1) + 's)');
    }

    // 3. Credits
    var creditsPath = await buildCredits(items, tempDir);
    segments.push(creditsPath);
    console.log('[video] Credits OK');

    // 4. Tạo SRT
    generateSRT(items, durations, srtPath);
    console.log('[video] SRT phụ đề OK');

    // 5. Concat
    await concatSegments(segments, outputPath, tempDir);
    var stat = fs.statSync(outputPath);
    console.log('[video] Hoàn thành: ' + outputPath + ' (' + (stat.size / 1024 / 1024).toFixed(1) + 'MB)');

    return outputPath;
}

module.exports = { buildVideo: buildVideo, getAudioDuration: getAudioDuration };
