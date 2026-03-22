// Google News uses protobuf encoding for article URLs
// Format: CBMi<base64url> where the payload is a protobuf message
// Field 1 (tag 0x08) = ?, Field 2 (tag 0x12) = original URL as string

var https = require('https');

function decodeGNewsUrl(gnewsUrl) {
    var m = gnewsUrl.match(/\/articles\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    
    var encoded = m[1];
    var b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) { b64 += '='; }
    
    try {
        var buf = Buffer.from(b64, 'base64');
        
        // Debug: show hex bytes
        var hex = '';
        for (var i = 0; i < Math.min(buf.length, 30); i++) {
            hex += buf[i].toString(16).padStart(2, '0') + ' ';
        }
        console.log('  Hex: ' + hex);
        
        // Protobuf: tag byte 0x08 = field 1 varint, 0x12 = field 2 length-delimited
        // CBMi prefix decodes to: 08 01 12 (field1=1, field2=string)
        // After 0x12, next byte(s) = varint length, then the URL string
        
        // Find 0x12 byte (field 2, length-delimited)
        var pos = -1;
        for (var j = 0; j < buf.length - 2; j++) {
            if (buf[j] === 0x12) {
                pos = j + 1;
                break;
            }
        }
        
        if (pos === -1) {
            // Try: the whole thing after first few bytes might be the URL
            // Some newer format: starts with 0x08 0x13 0x22 ...
            for (var k = 0; k < buf.length - 2; k++) {
                if (buf[k] === 0x22) { // field 4, length-delimited
                    pos = k + 1;
                    break;
                }
            }
        }
        
        if (pos >= 0) {
            // Read varint length
            var len = 0;
            var shift = 0;
            while (pos < buf.length) {
                var b = buf[pos];
                len |= (b & 0x7f) << shift;
                pos++;
                if ((b & 0x80) === 0) break;
                shift += 7;
            }
            
            if (len > 0 && pos + len <= buf.length) {
                var url = buf.slice(pos, pos + len).toString('utf-8');
                if (url.indexOf('http') === 0) return url;
                
                // Maybe nested protobuf — search for http in remaining
                var rest = buf.slice(pos).toString('utf-8');
                var um = rest.match(/https?:\/\/[^\x00-\x1f\s]+/);
                if (um) return um[0];
            }
        }
        
        // Brute force: scan all bytes for http
        var full = buf.toString('utf-8');
        var um2 = full.match(/https?:\/\/[^\x00-\x1f\s]+/);
        if (um2) return um2[0];
        
        // Try latin1 encoding
        var latin = buf.toString('latin1');
        var um3 = latin.match(/https?:\/\/[^\x00-\x1f\s]+/);
        if (um3) return um3[0];
        
    } catch(e) {
        console.log('  Error:', e.message);
    }
    return null;
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
    var m, n = 0, ok = 0;
    while ((m = re.exec(xml)) !== null && n < 15) {
        var block = m[1];
        var titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        var linkM = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        var sourceM = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
        
        var title = titleM ? titleM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '';
        var link = linkM ? linkM[1].trim() : '';
        var source = sourceM ? sourceM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '?';
        
        console.log('#' + (n+1) + ' [' + source + '] ' + title.substring(0, 70));
        var decoded = decodeGNewsUrl(link);
        if (decoded) {
            console.log('  → ' + decoded.substring(0, 120));
            ok++;
        } else {
            console.log('  → FAILED');
        }
        console.log('');
        n++;
    }
    console.log('Decoded: ' + ok + '/' + n);
});
