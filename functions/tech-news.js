var https = require('https');

/**
 * tech-news.js — Tin công nghệ từ Google News RSS
 *
 * Dùng Google News RSS topic "Technology" cho Việt Nam.
 * 1 request duy nhất, đã sort theo thời gian, nhiều nguồn tự động.
 * Không cần fetch article — dùng description snippet từ Google News.
 */

var GNEWS_URL = 'https://news.google.com/rss/search?q=c%C3%B4ng+ngh%E1%BB%87+OR+smartphone+OR+AI+OR+laptop+OR+chip&hl=vi&gl=VN&ceid=VN:vi';
var GNEWS_TIMEOUT = 6000;
var MAX_ITEMS = 40;

// ─── Fetch ────────────────────────────────────────────────────────────────────

function fetchURL(url, timeout) {
    timeout = timeout || GNEWS_TIMEOUT;
    return new Promise(function (resolve) {
        var req = https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegacyFrame/1.0)', 'Accept': '*/*' },
            timeout: timeout
        }, function (res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                var next = res.headers.location;
                if (next.indexOf('http') !== 0) {
                    try { next = new URL(next, url).href; } catch (e) { return resolve(''); }
                }
                return resolve(fetchURL(next, timeout));
            }
            if (res.statusCode !== 200) { return resolve(''); }
            var body = '';
            res.on('data', function (c) { body += c; });
            res.on('end', function () { resolve(body); });
        });
        req.on('error', function () { resolve(''); });
        req.on('timeout', function () { req.destroy(); resolve(''); });
    });
}

// ─── HTML entity decode ───────────────────────────────────────────────────────

var HTML_ENTITIES = {
    'aacute':'á','agrave':'à','atilde':'ã','acirc':'â','aring':'å',
    'eacute':'é','egrave':'è','ecirc':'ê','euml':'ë',
    'iacute':'í','igrave':'ì','icirc':'î','iuml':'ï',
    'oacute':'ó','ograve':'ò','otilde':'õ','ocirc':'ô','ouml':'ö',
    'uacute':'ú','ugrave':'ù','ucirc':'û','uuml':'ü',
    'yacute':'ý','Aacute':'Á','Agrave':'À','Atilde':'Ã','Acirc':'Â',
    'Eacute':'É','Egrave':'È','Ecirc':'Ê','Iacute':'Í','Igrave':'Ì',
    'Oacute':'Ó','Ograve':'Ò','Otilde':'Õ','Ocirc':'Ô',
    'Uacute':'Ú','Ugrave':'Ù','Ucirc':'Û','Yacute':'Ý',
    'ntilde':'ñ','Ntilde':'Ñ','ccedil':'ç','Ccedil':'Ç',
    'mdash':'—','ndash':'–','lsquo':'\u2018','rsquo':'\u2019',
    'ldquo':'\u201C','rdquo':'\u201D','hellip':'\u2026',
    'bull':'\u2022','trade':'\u2122','copy':'\u00A9','reg':'\u00AE',
    'deg':'\u00B0','times':'\u00D7','divide':'\u00F7','euro':'\u20AC'
};

function decodeEntities(str) {
    return str
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/&#x([0-9a-fA-F]+);/g, function (_, hex) {
            return String.fromCharCode(parseInt(hex, 16));
        })
        .replace(/&#(\d+);/g, function (_, dec) {
            return String.fromCharCode(parseInt(dec, 10));
        })
        .replace(/&([a-zA-Z]+);/g, function (full, name) {
            return HTML_ENTITIES[name] || ' ';
        });
}

function cleanText(raw) {
    if (!raw) { return ''; }
    var s = raw.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
    // Decode entities TRƯỚC để &lt;a href&gt; thành <a href> rồi strip
    s = decodeEntities(s);
    s = s.replace(/<[^>]+>/g, ' ');
    s = decodeEntities(s); // decode lần 2 cho double-encoded
    s = s.replace(/\s+/g, ' ').trim();
    return s;
}

// ─── Parse Google News RSS ────────────────────────────────────────────────────

function parseGoogleNewsRSS(xml, limit) {
    var items = [];
    if (!xml) { return items; }
    var re = /<item>([\s\S]*?)<\/item>/gi;
    var m;
    while ((m = re.exec(xml)) !== null && items.length < limit) {
        var block = m[1];
        var titleM  = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        var descM   = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
        var dateM   = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
        var sourceM = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

        var rawTitle = titleM ? cleanText(titleM[1]) : '';
        var desc     = descM  ? cleanText(descM[1])  : '';
        var pubDate  = dateM  ? dateM[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
        var source   = sourceM ? cleanText(sourceM[1]) : '';

        if (!rawTitle || rawTitle.length < 5) { continue; }

        // Google News title format: "Tiêu đề - Nguồn". Tách nguồn ra.
        var title = rawTitle;
        if (source) {
            var suffix = ' - ' + source;
            if (title.length > suffix.length && title.substring(title.length - suffix.length) === suffix) {
                title = title.substring(0, title.length - suffix.length).trim();
            }
        }

        // Google News description chứa links bài liên quan — extract text bổ sung
        var summary = desc;
        summary = summary.replace(/Xem toàn bộ.*$/i, '').trim();
        // Loại bỏ phần trùng title và tên nguồn lặp lại
        if (summary) {
            // Desc thường bắt đầu bằng title + source, lấy phần sau đó
            var titleIdx = summary.indexOf(title);
            if (titleIdx >= 0) {
                var after = summary.substring(titleIdx + title.length).trim();
                // Bỏ tên nguồn ở đầu phần còn lại
                if (source && after.indexOf(source) === 0) {
                    after = after.substring(source.length).trim();
                }
                if (after.length > 20) { summary = after; }
            }
        }
        if (!summary || summary.length < 10) { summary = ''; }

        items.push({
            title:   title,
            summary: summary,
            source:  source,
            pubDate: pubDate
        });
    }
    return items;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
            body: ''
        };
    }

    try {
        var xml = await fetchURL(GNEWS_URL, GNEWS_TIMEOUT);
        var items = parseGoogleNewsRSS(xml, MAX_ITEMS);

        if (items.length === 0) {
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Không thể tải tin công nghệ' })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'public, max-age=600'
            },
            body: JSON.stringify({
                items: items,
                total: items.length,
                timestamp: new Date().toISOString()
            })
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: e.message })
        };
    }
};
