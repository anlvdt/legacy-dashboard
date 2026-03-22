var https = require('https');
function fetch(url) {
    return new Promise(function(resolve) {
        var req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 6000 }, function(res) {
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() { resolve(body); });
        });
        req.on('error', function() { resolve(''); });
    });
}
fetch('https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi').then(function(xml) {
    // Get first 2 raw <description> blocks
    var re = /<item>([\s\S]*?)<\/item>/gi;
    var m, n = 0;
    while ((m = re.exec(xml)) !== null && n < 2) {
        var block = m[1];
        var descM = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
        if (descM) {
            console.log('=== RAW DESC #' + (n+1) + ' ===');
            console.log(descM[1].substring(0, 500));
            console.log('');
        }
        n++;
    }
});
