/**
 * video-gen/image-download.js — Tải ảnh nền từ Picsum
 */
var https = require('https');
var fs = require('fs');
var path = require('path');
var config = require('./config');

function downloadImage(url, dest, maxRedirects) {
    if (!maxRedirects) maxRedirects = 5;
    return new Promise(function(resolve, reject) {
        https.get(url, function(res) {
            if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirects > 0) {
                return downloadImage(res.headers.location, dest, maxRedirects - 1).then(resolve, reject);
            }
            var file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', function() { file.close(resolve); });
        }).on('error', reject);
    });
}

function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
}

async function downloadAllImages(count, tempDir) {
    console.log('[img] Đang tải ' + count + ' ảnh nền từ Picsum...');
    var ids = shuffleArray(config.PICSUM_IDS).slice(0, count);
    var images = [];

    for (var i = 0; i < count; i++) {
        var id = ids[i] || config.PICSUM_IDS[Math.floor(Math.random() * config.PICSUM_IDS.length)];
        var url = 'https://picsum.photos/id/' + id + '/' + config.WIDTH + '/' + config.HEIGHT;
        var imgPath = path.join(tempDir, 'img_' + i + '.jpg');

        try {
            await downloadImage(url, imgPath);
            var stat = fs.statSync(imgPath);
            if (stat.size < 5000) {
                // Ảnh lỗi, thử ID khác
                var fallbackId = config.PICSUM_IDS[Math.floor(Math.random() * config.PICSUM_IDS.length)];
                url = 'https://picsum.photos/id/' + fallbackId + '/' + config.WIDTH + '/' + config.HEIGHT;
                await downloadImage(url, imgPath);
            }
            console.log('[img] #' + i + ' OK (id=' + id + ')');
            images.push(imgPath);
        } catch(e) {
            console.log('[img] #' + i + ' lỗi: ' + e.message);
            images.push(null);
        }
    }

    return images;
}

module.exports = downloadAllImages;
