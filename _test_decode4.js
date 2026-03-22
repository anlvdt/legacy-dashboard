// Approach: Follow Google News redirect via HTTP to get real URL
var https = require('https');

function followRedirect(url, maxRedirects) {
    maxRedirects = maxRedirects || 5;
    return new Promise(function(resolve) {
        var req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 4000
        }, function(res) {
            // HTTP redirect
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                var loc = res.headers.location;
                res.resume();
                if (loc.indexOf('news.google.com') === -1) {
                    resolve(loc); // Found real URL
                } else if (maxRedirects > 0) {
                    resolve(followRedirect(loc, maxRedirects - 1));
                } else {
                    resolve(null);
                }
                return;
            }
            // 200 — check for meta refresh or JS redirect in body
            var body = '';
            res.on('data', function(c) { body += c; if (body.length > 5000) res.destroy(); });
            res.on('end', function() {
                // Check meta refresh
                var meta = body.match(/<meta[^>]*url=["']?(https?:\/\/[^"'\s>]+)/i);
                if (meta && meta[1].indexOf('news.google.com') === -1) {
                    resolve(meta[1]);
                    return;
                }
                // Check window.location or location.href
                var jsRedir = body.match(/(?:window\.location|location\.href)\s*=\s*["'](https?:\/\/[^"']+)/i);
                if (jsRedir && jsRedir[1].indexOf('news.google.com') === -1) {
                    resolve(jsRedir[1]);
                    return;
                }
                // Check any external URL in body
                var anyUrl = body.match(/href="(https?:\/\/(?!news\.google\.com)[^"]+)"/i);
                if (anyUrl) {
                    resolve(anyUrl[1]);
                    return;
                }
                resolve(null);
            });
        });
        req.on('error', function() { resolve(null); });
        req.on('timeout', function() { req.destroy(); resolve(null); });
    });
}

function fetchRSS(url) {
    return new Promise(function(resolve) {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }, function(res) {
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() { resolve(body); });
        }).on('error', function() { resolve(''); });
    });
}

fetchRSS('https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGRqTVhZU0JYWnBMVlpPR2dKV1RpZ0FQAQ?hl=vi&gl=VN&ceid=VN:vi').then(function(xml) {
    var re = /<item>([\s\S]*?)<\/item>/gi;
    var items = [];
    var m;
    while ((m = re.exec(xml)) !== null && items.length < 5) {
        var block = m[1];
        var titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        var linkM = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        var sourceM = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
        items.push({
            title: titleM ? titleM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '',
            link: linkM ? linkM[1].trim() : '',
            source: sourceM ? sourceM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '?'
        });
    }
    
    // Resolve links sequentially
    var idx = 0;
    function next() {
        if (idx >= items.length) return;
        var it = items[idx];
        console.log('#' + (idx+1) + ' [' + it.source + '] ' + it.title.substring(0, 70));
        console.log('  GNews: ' + it.link.substring(0, 70) + '...');
        followRedirect(it.link, 5).then(function(real) {
            console.log('  Real:  ' + (real || 'FAILED'));
            console.log('');
            idx++;
            next();
        });
    }
    next();
});
