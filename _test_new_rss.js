var https = require('https');
var http = require('http');
function fetch(url) {
    var mod = url.indexOf('https') === 0 ? https : http;
    return new Promise(function(resolve) {
        mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, function(res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetch(res.headers.location));
            }
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() { resolve(body); });
        }).on('error', function(e) { resolve('ERR:' + e.message); });
    });
}

var feeds = [
    { name: 'Kenh14 Tek',   url: 'https://kenh14.vn/rss/tek-life.rss' },
    { name: 'Kenh14 Tek2',  url: 'https://kenh14.vn/rss/tek.rss' },
    { name: 'Lao Động',     url: 'https://laodong.vn/rss/cong-nghe.rss' },
    { name: 'CafeBiz',      url: 'https://cafebiz.vn/rss/cong-nghe.rss' },
    { name: 'CafeBiz2',     url: 'https://cafebiz.vn/rss/cong-nghe-vi-tinh.rss' },
    { name: 'TechLade',     url: 'https://techlade.vn/rss' },
    { name: 'TechLade2',    url: 'https://techlade.vn/feed' },
    { name: '24h HiTech',   url: 'https://cdn.24h.com.vn/upload/rss/thoitranghitech.rss' }
];

Promise.all(feeds.map(function(f) { return fetch(f.url); })).then(function(results) {
    for (var i = 0; i < feeds.length; i++) {
        var xml = results[i];
        var isErr = xml.indexOf('ERR:') === 0;
        var items = isErr ? null : xml.match(/<item>/gi);
        var count = items ? items.length : 0;
        console.log(feeds[i].name + ' (' + feeds[i].url + ')');
        console.log('  ' + (isErr ? xml : count + ' items, ' + xml.length + ' bytes'));
        if (count > 0) {
            var re = /<title[^>]*>([\s\S]*?)<\/title>/gi;
            var m, n = 0;
            while ((m = re.exec(xml)) !== null && n < 3) {
                var t = m[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim();
                if (t.length > 10 && t.indexOf('RSS') === -1 && t.indexOf('tin tuc') === -1) {
                    console.log('  → ' + t.substring(0, 90));
                    n++;
                }
            }
        }
        console.log('');
    }
});
