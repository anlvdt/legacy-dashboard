var https = require('https');
function fetch(url) {
    return new Promise(function(resolve) {
        var req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }, function(res) {
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() { resolve(body); });
        });
        req.on('error', function() { resolve(''); });
        req.on('timeout', function() { req.destroy(); resolve(''); });
    });
}

fetch('https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi').then(function(xml) {
    var re = /<item>([\s\S]*?)<\/item>/gi;
    var m, n = 0;
    while ((m = re.exec(xml)) !== null && n < 5) {
        var block = m[1];
        var titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        var linkM = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        var descM = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
        var title = titleM ? titleM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '';
        var rawLink = linkM ? linkM[1].trim() : '';
        var rawDesc = descM ? descM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '';
        
        // Try to extract real link
        var realLinkM = rawDesc.match(/href="(https?:\/\/(?!news\.google\.com)[^"]+)"/);
        var realLink = realLinkM ? realLinkM[1] : 'NO MATCH';
        
        console.log('#' + (n+1) + ' ' + title.substring(0, 60));
        console.log('  rawLink: ' + rawLink.substring(0, 60));
        console.log('  realLink: ' + realLink.substring(0, 80));
        console.log('  desc first 200: ' + rawDesc.substring(0, 200));
        console.log('');
        n++;
    }
});
