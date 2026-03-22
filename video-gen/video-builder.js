/**
 * video-gen/video-builder.js — Ghép ảnh + audio + subtitle thành video TikTok
 * Style: Ken Burns zoom/pan + gradient overlay + text fade-in
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

async function getAudioDuration(audioPath) {
    var cmd = 'ffprobe -v error -show_entries format=duration -of csv=p=0 "' + audioPath + '"';
    var out = await exec(cmd);
    return parseFloat(out) || 5;
}

function esc(text) {
    return text.replace(/\\/g, '/').replace(/'/g, "\u2019").replace(/:/g, '\\:').replace(/%/g, '%%').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function escPath(p) {
    return p.replace(/\\/g, '/').replace(/:/g, '\\\\:');
}

function pad2(n) { return n < 10 ? '0' + n : String(n); }
function pad3(n) { return n < 10 ? '00' + n : n < 100 ? '0' + n : String(n); }

function fmtSrt(sec) {
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    var s = Math.floor(sec % 60), ms = Math.round((sec % 1) * 1000);
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s) + ',' + pad3(ms);
}

function wrap(text, max) {
    if (!max) max = 26;
    var w = text.split(' '), lines = [], l = '';
    for (var i = 0; i < w.length; i++) {
        var t = l ? l + ' ' + w[i] : w[i];
        if (t.length > max && l) { lines.push(l); l = w[i]; } else { l = t; }
    }
    if (l) lines.push(l);
    return lines.slice(0, 4);
}

function kbFilter(idx, dur) {
    var f = Math.ceil(dur * config.FPS), W = config.WIDTH, H = config.HEIGHT, fps = config.FPS;
    var p = [
        "zoompan=z='min(1.0+0.15*on/" + f + "\\,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=" + f + ":s=" + W + "x" + H + ":fps=" + fps,
        "zoompan=z='1.1':x='(iw-iw/zoom)*on/" + f + "':y='ih/2-(ih/zoom/2)':d=" + f + ":s=" + W + "x" + H + ":fps=" + fps,
        "zoompan=z='1.1':x='(iw-iw/zoom)*(1-on/" + f + ")':y='ih/2-(ih/zoom/2)':d=" + f + ":s=" + W + "x" + H + ":fps=" + fps,
        "zoompan=z='max(1.15-0.15*on/" + f + "\\,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=" + f + ":s=" + W + "x" + H + ":fps=" + fps
    ];
    return p[idx % 4];
}

async function buildSegment(idx, item, audioPath, imagePath, tempDir) {
    var dur = await getAudioDuration(audioPath);
    var out = path.join(tempDir, 'seg_' + idx + '.mp4');
    var W = config.WIDTH, H = config.HEIGHT;
    var fb = escPath(config.FONT_BOLD), fn = escPath(config.FONT_FILE);
    var lines = wrap(item.title, 26), lc = lines.length;
    var kb = kbFilter(idx, dur);
    var gH = Math.round(H * 0.45), gY = H - gH;
    var grad = "drawbox=x=0:y=" + gY + ":w=" + W + ":h=" + gH + ":color=black@0.7:t=fill";
    var bY = gY + 20;
    var bar = "drawbox=x=40:y=" + bY + ":w=6:h=" + (lc * 62 + 20) + ":color=#FFCC00:t=fill";
    var bdY = bY - 60;
    var badge = "drawbox=x=40:y=" + bdY + ":w=56:h=56:color=#FFCC00:t=fill";
    var bdTxt = "drawtext=fontfile=" + fb + ":text=" + (idx+1) + ":fontsize=32:fontcolor=black:x=56:y=" + (bdY+12);
    var tf = [];
    for (var i = 0; i < lc; i++) {
        var e = esc(lines[i]), ty = bY + 10 + i * 62;
        var fd = (0.3 + i * 0.15).toFixed(2);
        var al = "if(lt(t\\," + fd + ")\\,0\\,min((t-" + fd + ")/0.3\\,1))";
        tf.push("drawtext=fontfile=" + fb + ":text='" + e + "':fontsize=52:fontcolor=white:x=64:y=" + ty + ":alpha='" + al + "'");
    }
    var src = esc(item.source || 'News'), sY = bY + lc * 62 + 30;
    var sf = (0.3 + lc * 0.15 + 0.2).toFixed(2);
    var sa = "if(lt(t\\," + sf + ")\\,0\\,min((t-" + sf + ")/0.3\\,1))";
    var srcF = "drawtext=fontfile=" + fn + ":text='" + src + "':fontsize=30:fontcolor=#FFCC00:x=64:y=" + sY + ":alpha='" + sa + "'";
    var all = [kb, grad, bar, badge, bdTxt].concat(tf).concat([srcF]).join(',');
    var cmd = 'ffmpeg -y -loop 1 -i "' + imagePath + '" -i "' + audioPath + '"'
        + ' -filter_complex "[0:v]scale=' + W + ':' + H + ':force_original_aspect_ratio=increase,crop=' + W + ':' + H + ',' + all + '[v]"'
        + ' -map "[v]" -map 1:a -c:v libx264 -preset fast -crf 23 -c:a aac -ar 44100 -b:a 128k'
        + ' -t ' + dur.toFixed(2) + ' -shortest -pix_fmt yuv420p "' + out + '"';
    console.log('[build] Seg #' + idx + ' (' + dur.toFixed(1) + 's) - ' + item.title.substring(0, 40));
    await exec(cmd);
    return out;
}

async function buildIntro(tempDir) {
    var o = path.join(tempDir, 'intro.mp4');
    var W = config.WIDTH, H = config.HEIGHT;
    var fb = escPath(config.FONT_BOLD), fn = escPath(config.FONT_FILE);
    var now = new Date();
    var ds = pad2(now.getDate()) + '/' + pad2(now.getMonth()+1) + '/' + now.getFullYear();
    var l1 = esc('TIN TỨC HÔM NAY'), l2 = esc(ds);
    var ac = "drawbox=x=" + (W/2-60) + ":y=" + (H/2-20) + ":w=120:h=4:color=#FFCC00:t=fill";
    var a1 = "if(lt(t\\,0.3)\\,0\\,min((t-0.3)/0.4\\,1))";
    var a2 = "if(lt(t\\,0.7)\\,0\\,min((t-0.7)/0.4\\,1))";
    var t1 = "drawtext=fontfile=" + fb + ":text=" + l1 + ":fontsize=72:fontcolor=white:x=(w-text_w)/2:y=" + (H/2-90) + ":alpha='" + a1 + "'";
    var t2 = "drawtext=fontfile=" + fn + ":text=" + l2 + ":fontsize=44:fontcolor=#FFCC00:x=(w-text_w)/2:y=" + (H/2+30) + ":alpha='" + a2 + "'";
    var fc = "color=c=#0a0a1a:s=" + W + "x" + H + ":d=3:r=" + config.FPS + "," + ac + "," + t1 + "," + t2 + "[v];anullsrc=r=44100:cl=stereo[a]";
    var cmd = 'ffmpeg -y -filter_complex "' + fc + '" -map "[v]" -map "[a]" -t 3'
        + ' -c:v libx264 -preset fast -crf 23 -c:a aac -ar 44100 -b:a 128k -pix_fmt yuv420p -shortest "' + o + '"';
    console.log('[build] Intro (3s)');
    await exec(cmd);
    return o;
}

async function buildCredits(tempDir) {
    var o = path.join(tempDir, 'credits.mp4');
    var W = config.WIDTH, H = config.HEIGHT;
    var fb = escPath(config.FONT_BOLD), fn = escPath(config.FONT_FILE);
    var l1 = esc('CẢM ƠN ĐÃ XEM'), l2 = esc('Theo dõi để cập nhật tin mới');
    var ac = "drawbox=x=" + (W/2-60) + ":y=" + (H/2-20) + ":w=120:h=4:color=#FFCC00:t=fill";
    var a1 = "if(lt(t\\,0.3)\\,0\\,min((t-0.3)/0.4\\,1))";
    var a2 = "if(lt(t\\,0.7)\\,0\\,min((t-0.7)/0.4\\,1))";
    var t1 = "drawtext=fontfile=" + fb + ":text=" + l1 + ":fontsize=72:fontcolor=white:x=(w-text_w)/2:y=" + (H/2-90) + ":alpha='" + a1 + "'";
    var t2 = "drawtext=fontfile=" + fn + ":text=" + l2 + ":fontsize=36:fontcolor=#FFCC00:x=(w-text_w)/2:y=" + (H/2+30) + ":alpha='" + a2 + "'";
    var fc = "color=c=#0a0a1a:s=" + W + "x" + H + ":d=3:r=" + config.FPS + "," + ac + "," + t1 + "," + t2 + "[v];anullsrc=r=44100:cl=stereo[a]";
    var cmd = 'ffmpeg -y -filter_complex "' + fc + '" -map "[v]" -map "[a]" -t 3'
        + ' -c:v libx264 -preset fast -crf 23 -c:a aac -ar 44100 -b:a 128k -pix_fmt yuv420p -shortest "' + o + '"';
    console.log('[build] Credits (3s)');
    await exec(cmd);
    return o;
}

function genSrt(items, durs, srtPath) {
    var srt = '', off = 3;
    for (var i = 0; i < items.length; i++) {
        srt += (i+1) + '\n' + fmtSrt(off) + ' --> ' + fmtSrt(off + durs[i]) + '\n' + items[i].title + '\n\n';
        off += durs[i];
    }
    fs.writeFileSync(srtPath, srt, 'utf8');
    console.log('[srt] Phụ đề: ' + srtPath);
}

async function concat(parts, outputPath, tempDir) {
    var lf = path.join(tempDir, 'concat_list.txt'), c = '';
    for (var i = 0; i < parts.length; i++) c += "file '" + path.resolve(parts[i]).replace(/\\/g, '/') + "'\n";
    fs.writeFileSync(lf, c);
    var cmd = 'ffmpeg -y -f concat -safe 0 -i "' + lf + '" -c copy "' + outputPath + '"';
    console.log('[concat] Ghép ' + parts.length + ' đoạn...');
    await exec(cmd);
    console.log('[concat] OK — ' + (fs.statSync(outputPath).size / 1048576).toFixed(1) + 'MB');
}

async function buildVideo(items, audioFiles, imageFiles, srtPath, outputPath, tempDir) {
    console.log('\n[video] Bắt đầu (' + items.length + ' tin)...\n');
    var durs = [];
    for (var i = 0; i < audioFiles.length; i++) durs.push(await getAudioDuration(audioFiles[i]));
    var intro = await buildIntro(tempDir);
    var segs = [];
    for (var i = 0; i < items.length; i++) segs.push(await buildSegment(i, items[i], audioFiles[i], imageFiles[i], tempDir));
    var credits = await buildCredits(tempDir);
    await concat([intro].concat(segs).concat([credits]), outputPath, tempDir);
    genSrt(items, durs, srtPath);
    console.log('\n[video] Hoàn thành: ' + outputPath);
}

module.exports = { buildVideo: buildVideo, buildSegment: buildSegment, buildIntro: buildIntro, buildCredits: buildCredits };
