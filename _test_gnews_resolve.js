// Test: resolve Google News redirect links
var https = require('https');
function resolveLink(url) {
    return new Promise(function(resolve) {
        var req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 3000 }, function(res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                resolve(res.headers.location);
            } else {
                // Google News may return 200 with JS redirect — check body
                var body = '';
                res.on('data', function(c) { body += c; });
                res.on('end', function() {
                    var m = body.match(/href="(https?:\/\/[^"]+)"/);
                    resolve(m ? m[1] : url);
                });
            }
            res.resume();
        });
        req.on('error', function() { resolve(url); });
        req.on('timeout', function() { req.destroy(); resolve(url); });
    });
}

var testUrl = 'https://news.google.com/rss/articles/CBMiogFBVV95cUxQNURtR0lOc0ZDMzlhNklPWlBfZ2Z';
resolveLink(testUrl).then(function(resolved) {
    console.log('Original:', testUrl.substring(0, 60) + '...');
    console.log('Resolved:', resolved);
});
