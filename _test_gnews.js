var https = require('https');
function fetch(url) {
    return new Promise(function(resolve) {
        var req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }, function(res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetch(res.headers.location));
            }
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() { resolve(body); });
        });
        req.on('error', function(e) { resolve('ERR:' + e.message); });
        req.on('timeout', function() { req.destroy(); resolve('ERR:TIMEOUT'); });
    });
}

// Google News RSS cho "công nghệ" tiếng Việt
var urls = [
    'https://news.google.com/rss/search?q=c%C3%B4ng+ngh%E1%BB%87&hl=vi&gl=VN&ceid=VN:vi',
    'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGRqTVhZU0JYWnBMVlpPR2dKV1RpZ0FQAQ?hl=vi&gl=VN&ceid=VN:vi'
];
var names = ['search "công nghệ"', 'topic Technology VN'];

Promise.all(urls.map(fetch)).then(function(results) {
    for (var k = 0; k < results.length; k++) {
        var xml = results[k];
        console.log('=== ' + names[k] + ' ===');
        if (xml.indexOf('ERR:') === 0) { console.log(xml); continue; }
        var items = xml.match(/<item>/gi);
        console.log('Items: ' + (items ? items.length : 0) + ', bytes: ' + xml.length);
        // Parse first 8 items
        var re = /<item>([\s\S]*?)<\/item>/gi;
        var m, n = 0;
        while ((m = re.exec(xml)) !== null && n < 8) {
            var block = m[1];
            var titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            var sourceM = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
            var linkM = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
            var dateM = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
            var title = titleM ? titleM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '';
            var source = sourceM ? sourceM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '?';
            var link = linkM ? linkM[1].trim() : '';
            var pubDate = dateM ? dateM[1].trim() : '';
            console.log('#' + (n+1) + ' [' + source + '] ' + title.substring(0, 80));
            console.log('   date: ' + pubDate);
            console.log('   link: ' + link.substring(0, 80));
            n++;
        }
        console.log('');
    }
});
