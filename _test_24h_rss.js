var https = require('https');
function fetch(url) {
    return new Promise(function(resolve) {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, function(res) {
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() { resolve(body); });
        }).on('error', function() { resolve(''); });
    });
}

Promise.all([
    fetch('https://cdn.24h.com.vn/upload/rss/congnghethongtin.rss'),
    fetch('https://cdn.24h.com.vn/upload/rss/thoitranghitech.rss')
]).then(function(results) {
    var names = ['congnghethongtin', 'thoitranghitech'];
    for (var i = 0; i < results.length; i++) {
        var xml = results[i];
        var items = xml.match(/<item>/gi);
        var count = items ? items.length : 0;
        console.log(names[i] + ': ' + count + ' items, ' + xml.length + ' bytes');
        // Show first 3 titles
        var re = /<title[^>]*>([\s\S]*?)<\/title>/gi;
        var m, n = 0;
        while ((m = re.exec(xml)) !== null && n < 4) {
            var t = m[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim();
            if (t.length > 10) { console.log('  ' + t.substring(0, 80)); n++; }
        }
        console.log('');
    }
});
