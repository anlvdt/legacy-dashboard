var https = require('https');
function fetch(url) {
    return new Promise(function(resolve) {
        var req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }, function(res) {
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() { resolve({ status: res.statusCode, body: body }); });
        });
        req.on('error', function(e) { resolve({ status: 0, body: 'ERR:' + e.message }); });
        req.on('timeout', function() { req.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
    });
}

var urls = [
    { name: 'Bing News VN',       url: 'https://www.bing.com/news/search?q=Vi%E1%BB%87t+Nam&format=rss&mkt=vi-VN' },
    { name: 'Bing Tech VN',       url: 'https://www.bing.com/news/search?q=c%C3%B4ng+ngh%E1%BB%87+Vi%E1%BB%87t+Nam&format=rss&mkt=vi-VN' },
    { name: 'Bing Tech global',   url: 'https://www.bing.com/news/search?q=technology&format=rss&cc=VN&setlang=vi' }
];

Promise.all(urls.map(function(u) { return fetch(u.url); })).then(function(results) {
    for (var i = 0; i < urls.length; i++) {
        var r = results[i];
        console.log('=== ' + urls[i].name + ' (status=' + r.status + ', ' + r.body.length + ' bytes) ===');
        var items = r.body.match(/<item>/gi);
        console.log('Items: ' + (items ? items.length : 0));
        var re = /<item>([\s\S]*?)<\/item>/gi;
        var m, n = 0;
        while ((m = re.exec(r.body)) !== null && n < 5) {
            var block = m[1];
            var titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            var linkM = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
            var sourceM = block.match(/<news:Source[^>]*>([\s\S]*?)<\/news:Source>/i);
            var title = titleM ? titleM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '';
            var link = linkM ? linkM[1].trim() : '';
            var source = sourceM ? sourceM[1].trim() : '?';
            console.log('#' + (n+1) + ' [' + source + '] ' + title.substring(0, 80));
            console.log('   ' + link.substring(0, 80));
            n++;
        }
        console.log('');
    }
});
