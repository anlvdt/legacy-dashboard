var https = require('https');

// Google News links dạng: https://news.google.com/rss/articles/XXXXX?oc=5
// Khi GET, nó trả 200 với HTML chứa redirect link thật
// Hoặc có thể decode base64 từ URL path

function resolveGoogleLink(gnUrl) {
    return new Promise(function(resolve) {
        var req = https.get(gnUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 3000
        }, function(res) {
            // 301/302 redirect
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                resolve(res.headers.location);
                res.resume();
                return;
            }
            // 200 — parse HTML for redirect
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() {
                // Try meta refresh or JS redirect
                var m = body.match(/href="(https?:\/\/(?!news\.google)[^"]+)"/);
                if (m) { return resolve(m[1]); }
                var m2 = body.match(/url=(https?:\/\/[^"&]+)/);
                if (m2) { return resolve(m2[1]); }
                resolve(gnUrl);
            });
        });
        req.on('error', function() { resolve(gnUrl); });
        req.on('timeout', function() { req.destroy(); resolve(gnUrl); });
    });
}

// Test with a few Google News links
var testUrls = [
    'https://news.google.com/rss/articles/CBMiogFBVV95cUxQNURtR0lOc0ZDMzlhNklPWlBfZ2Z?oc=5',
    'https://news.google.com/rss/articles/CBMixAFBVV95cUxQUjZSQWJNNHRPbC1OaVVlQSXNaM21?oc=5'
];

var start = Date.now();
Promise.all(testUrls.map(resolveGoogleLink)).then(function(results) {
    console.log('Time: ' + (Date.now() - start) + 'ms');
    for (var i = 0; i < results.length; i++) {
        console.log('#' + (i+1) + ': ' + results[i].substring(0, 100));
    }
});
