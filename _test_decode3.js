// Google News 2024+ format: protobuf { field4: base64url(protobuf { field1: url }) }
// Outer: 08 13 22 <len> <inner_base64url>
// Inner base64url decodes to protobuf with the actual URL

var https = require('https');

function decodeGNewsUrl(gnewsUrl) {
    var m = gnewsUrl.match(/\/articles\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    
    // Decode outer base64url
    var b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    var buf = Buffer.from(b64, 'base64');
    
    // Find field 4 (tag 0x22) — contains inner base64url string
    var pos = 0;
    while (pos < buf.length) {
        if (buf[pos] === 0x22) {
            pos++;
            // Read varint length
            var len = 0, shift = 0;
            while (pos < buf.length) {
                var b = buf[pos]; pos++;
                len |= (b & 0x7f) << shift;
                if ((b & 0x80) === 0) break;
                shift += 7;
            }
            // Extract inner base64url string
            var innerB64 = buf.slice(pos, pos + len).toString('ascii');
            
            // Decode inner base64url
            var ib64 = innerB64.replace(/-/g, '+').replace(/_/g, '/');
            while (ib64.length % 4 !== 0) ib64 += '=';
            try {
                var innerBuf = Buffer.from(ib64, 'base64');
                var innerStr = innerBuf.toString('utf-8');
                
                // Find URL in inner protobuf
                var um = innerStr.match(/https?:\/\/[^\x00-\x1f\s"'<>]+/);
                if (um) return um[0];
                
                // Try scanning inner protobuf fields
                var ip = 0;
                while (ip < innerBuf.length) {
                    var tag = innerBuf[ip]; ip++;
                    if ((tag & 0x07) === 2) { // length-delimited
                        var flen = 0, fshift = 0;
                        while (ip < innerBuf.length) {
                            var fb = innerBuf[ip]; ip++;
                            flen |= (fb & 0x7f) << fshift;
                            if ((fb & 0x80) === 0) break;
                            fshift += 7;
                        }
                        var field = innerBuf.slice(ip, ip + flen).toString('utf-8');
                        if (field.indexOf('http') === 0) return field;
                        ip += flen;
                    } else if ((tag & 0x07) === 0) { // varint
                        while (ip < innerBuf.length && (innerBuf[ip] & 0x80)) ip++;
                        ip++;
                    } else {
                        break;
                    }
                }
            } catch(e) {}
            break;
        }
        // Skip other fields
        var wireType = buf[pos] & 0x07;
        pos++;
        if (wireType === 0) { while (pos < buf.length && (buf[pos] & 0x80)) pos++; pos++; }
        else if (wireType === 2) {
            var sl = 0, ss = 0;
            while (pos < buf.length) { var sb = buf[pos]; pos++; sl |= (sb & 0x7f) << ss; if ((sb & 0x80) === 0) break; ss += 7; }
            pos += sl;
        } else break;
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
        console.log('  ' + (decoded ? decoded.substring(0, 120) : 'FAILED'));
        console.log('  OK: ' + !!decoded);
        console.log('');
        if (decoded) ok++;
        n++;
    }
    console.log('Success: ' + ok + '/' + n);
});
