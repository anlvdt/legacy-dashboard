// Test decode Google News article URLs
// Google News RSS links look like: https://news.google.com/rss/articles/CBMi...
// The part after CBMi is base64url-encoded original URL

var https = require('https');

function fetchRSS() {
    return new Promise(function(resolve) {
        https.get('https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGRqTVhZU0JYWnBMVlpPR2dKV1RpZ0FQAQ?hl=vi&gl=VN&ceid=VN:vi', {
            headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000
        }, function(res) {
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() { resolve(body); });
        }).on('error', function(e) { resolve(''); });
    });
}

function decodeGNewsUrl(gnewsUrl) {
    // Extract the encoded part after /articles/
    var m = gnewsUrl.match(/\/articles\/([A-Za-z0-9_-]+)/);
    if (!m) return gnewsUrl;
    
    var encoded = m[1];
    
    // Try different decode approaches
    // Google uses a protobuf-like encoding. The URL is typically after "CBMi" prefix
    // CBMi = field 1, wire type 2 (length-delimited), then varint length, then UTF-8 string
    
    try {
        // Convert base64url to base64
        var b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding
        while (b64.length % 4 !== 0) { b64 += '='; }
        
        var buf = Buffer.from(b64, 'base64');
        var str = buf.toString('utf-8');
        
        // Find URL pattern in decoded bytes
        var urlMatch = str.match(/https?:\/\/[^\s\x00-\x1f]+/);
        if (urlMatch) return urlMatch[0];
        
        // Try skipping protobuf header bytes (usually 4-6 bytes)
        for (var skip = 2; skip < 10; skip++) {
            var sub = buf.slice(skip).toString('utf-8');
            var um = sub.match(/https?:\/\/[^\s\x00-\x1f]+/);
            if (um) return um[0];
        }
    } catch(e) {
        console.log('Decode error:', e.message);
    }
    
    return gnewsUrl;
}

fetchRSS().then(function(xml) {
    var re = /<item>([\s\S]*?)<\/item>/gi;
    var m, n = 0;
    while ((m = re.exec(xml)) !== null && n < 10) {
        var block = m[1];
        var titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        var linkM = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        var sourceM = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
        
        var title = titleM ? titleM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '';
        var link = linkM ? linkM[1].trim() : '';
        var source = sourceM ? sourceM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '?';
        
        var decoded = decodeGNewsUrl(link);
        
        console.log('#' + (n+1) + ' [' + source + '] ' + title.substring(0, 70));
        console.log('  Google: ' + link.substring(0, 70) + '...');
        console.log('  Decoded: ' + decoded.substring(0, 100));
        console.log('  OK: ' + (decoded.indexOf('news.google') === -1));
        console.log('');
        n++;
    }
});
