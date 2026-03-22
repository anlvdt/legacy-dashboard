var https = require('https');
function fetch(url) {
    return new Promise(function(resolve) {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, function(res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetch(res.headers.location));
            }
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() { resolve({ status: res.statusCode, body: body }); });
        }).on('error', function(e) { resolve({ status: 0, body: 'ERR:' + e.message }); });
    });
}
var urls = [
    'https://laodong.vn/rss/cong-nghe.rss',
    'https://laodong.vn/rss/cong-nghe',
    'https://laodong.vn/rss/khoa-hoc-cong-nghe.rss',
    'https://laodong.vn/rss/feed.rss'
];
Promise.all(urls.map(fetch)).then(function(results) {
    for (var i = 0; i < urls.length; i++) {
        var r = results[i];
        var items = r.body.match(/<item>/gi);
        console.log(urls[i]);
        console.log('  status=' + r.status + ', items=' + (items ? items.length : 0) + ', bytes=' + r.body.length);
    }
});
