var https = require('https');

/**
 * tech-news.js — Tin công nghệ tóm tắt từ bài viết gốc
 *
 * Flow: RSS (song song) → parse → fetch top N articles → extractive summary
 * Tối ưu cho Netlify free tier 10s timeout
 */

var SOURCES = [
    { name: 'VnExpress',    url: 'https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss' },
    { name: 'Tuổi Trẻ',    url: 'https://tuoitre.vn/rss/nhip-song-so.rss' },
    { name: 'Thanh Niên',   url: 'https://thanhnien.vn/rss/cong-nghe.rss' },
    { name: 'Dân Trí',      url: 'https://dantri.com.vn/rss/cong-nghe.rss' },
    { name: 'VietnamNet',   url: 'https://vietnamnet.vn/rss/cong-nghe.rss' },
    { name: 'Tinhte',       url: 'https://tinhte.vn/rss' },
    { name: 'GenK',         url: 'https://genk.vn/rss/home.rss' },
    { name: 'Techz',        url: 'https://www.techz.vn/rss/cong-nghe.rss' },
    { name: 'VTV',          url: 'https://vtv.vn/rss/cong-nghe.rss' },
    { name: 'Soha',         url: 'https://soha.vn/rss/cong-nghe.rss' },
    { name: '24h',          url: 'https://cdn.24h.com.vn/upload/rss/congnghethongtin.rss' },
    { name: 'ZNews',        url: 'https://znews.vn/rss/cong-nghe.rss' },
    { name: 'Kenh14',       url: 'https://kenh14.vn/rss/tek-life.rss' },
    { name: 'CafeBiz',      url: 'https://cafebiz.vn/rss/cong-nghe.rss' }
];

var ITEMS_PER_SOURCE = 2;
var MAX_ARTICLES     = 15;   // chỉ fetch article cho top N bài
var RSS_TIMEOUT      = 3000;
var ARTICLE_TIMEOUT  = 3000;


// ─── Fetch ────────────────────────────────────────────────────────────────────

function fetchURL(url, timeout) {
    timeout = timeout || RSS_TIMEOUT;
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
    s = decodeEntities(s);
    s = s.replace(/<[^>]+>/g, ' ');
    s = decodeEntities(s);
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/^\([^)]{1,30}\)\s*[-–]\s*/, '');
    return s;
}


// ─── Extract article text từ HTML ─────────────────────────────────────────────

function extractArticleText(html) {
    if (!html) { return ''; }
    html = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<figure[\s\S]*?<\/figure>/gi, '')
        .replace(/<aside[\s\S]*?<\/aside>/gi, '');

    var containerNames = [
        'fck_detail', 'article-body', 'detail-content', 'content-detail',
        'singular-content', 'entry-content', 'post-content', 'article__body',
        'article-content', 'detail__content', 'detail-text-body',
        'content-news-detail', 'maincontent', 'main-content'
    ];

    var text = '';
    for (var i = 0; i < containerNames.length; i++) {
        var startRe = new RegExp('class="[^"]*\\b' + containerNames[i] + '\\b[^"]*"', 'i');
        var startIdx = html.search(startRe);
        if (startIdx === -1) { continue; }
        var chunk = html.substring(startIdx, Math.min(startIdx + 20000, html.length));
        var endMarkers = [
            'class="box-tinlienquan', 'class="related', 'class="tags',
            'class="box_comment', 'class="comment', 'class="social',
            'class="footer', 'class="breadcrumb', 'class="box-author',
            'id="box_comment', 'id="comment', 'Điều khoản sử dụng',
            'class="sidebar', 'class="widget', 'class="banner'
        ];
        for (var j = 0; j < endMarkers.length; j++) {
            var endIdx = chunk.indexOf(endMarkers[j]);
            if (endIdx > 200) { chunk = chunk.substring(0, endIdx); }
        }
        text = chunk;
        break;
    }

    if (!text) {
        var artMatch = html.match(/<article[^>]*>([\s\S]{200,20000}?)<\/article>/i);
        if (artMatch) { text = artMatch[1]; }
    }
    if (!text) { text = html.substring(0, 20000); }

    var paragraphs = [];
    var pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    var pm;
    while ((pm = pRe.exec(text)) !== null) {
        var p = pm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        p = decodeEntities(p);
        if (p.length > 30) { paragraphs.push(p); }
    }

    var result = paragraphs.join(' ');
    result = result.replace(/\b(Thích|Không thích|Bình luận|Chia sẻ|Đăng nhập|Đăng ký|Xem thêm)\s*\d*/gi, ' ');
    result = result.replace(/\s{2,}/g, ' ').trim();
    if (result.length > 5000) { result = result.substring(0, 5000); }
    return result;
}

function extractiveSummary(text, maxLen) {
    if (!text) { return ''; }
    maxLen = maxLen || 600;
    var sentences = text.replace(/([.!?])\s+/g, '$1\n').split('\n');
    var result = '';
    for (var i = 0; i < sentences.length; i++) {
        var s = sentences[i].trim();
        if (s.length < 20) { continue; }
        if (!result) { result = s; }
        else if (result.length + s.length + 1 <= maxLen) { result += ' ' + s; }
        else { break; }
    }
    if (!result) {
        result = text.length > maxLen ? text.substring(0, maxLen).replace(/\s+\S*$/, '') + '...' : text;
    }
    var lastPunct = Math.max(result.lastIndexOf('.'), result.lastIndexOf('!'), result.lastIndexOf('?'));
    if (lastPunct > result.length * 0.4) {
        result = result.substring(0, lastPunct + 1);
    } else if (result.slice(-1) !== '.' && result.slice(-1) !== '!' && result.slice(-1) !== '?') {
        result = result + '.';
    }
    return result;
}


// ─── Parse pubDate linh hoạt ──────────────────────────────────────────────────

function parsePubDate(str) {
    if (!str) { return NaN; }
    str = str.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
    var t = new Date(str).getTime();
    if (!isNaN(t)) { return t; }
    var m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
        t = new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10),
            parseInt(m[4],10), parseInt(m[5],10), m[6] ? parseInt(m[6],10) : 0).getTime();
        if (!isNaN(t)) { return t; }
    }
    var m2 = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m2) {
        t = new Date(parseInt(m2[1],10), parseInt(m2[2],10)-1, parseInt(m2[3],10),
            parseInt(m2[4],10), parseInt(m2[5],10), m2[6] ? parseInt(m2[6],10) : 0).getTime();
        if (!isNaN(t)) { return t; }
    }
    return NaN;
}

// ─── Parse RSS ────────────────────────────────────────────────────────────────

function parseRSS(xml, sourceName, limit) {
    var items = [];
    if (!xml) { return items; }
    var re = /<item>([\s\S]*?)<\/item>/gi;
    var m;
    var now = Date.now();
    var MAX_AGE_MS = 48 * 3600 * 1000;
    while ((m = re.exec(xml)) !== null && items.length < limit) {
        var block = m[1];
        var titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        var linkM  = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        var descM  = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
        var dateM  = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

        var title   = titleM ? cleanText(titleM[1]) : '';
        var link    = linkM  ? linkM[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
        var desc    = descM  ? cleanText(descM[1]) : '';
        var pubDate = dateM  ? dateM[1].trim() : '';

        if (!title || title.length < 5 || !link) { continue; }
        if (pubDate) {
            var pubTime = parsePubDate(pubDate);
            if (!isNaN(pubTime) && (now - pubTime) > MAX_AGE_MS) { continue; }
        }
        items.push({ title: title, desc: desc, link: link, source: sourceName, pubDate: pubDate });
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
        // 1. Fetch tất cả RSS song song (nhanh, 3s timeout)
        var xmlList = await Promise.all(SOURCES.map(function (s) { return fetchURL(s.url, RSS_TIMEOUT); }));

        // 2. Parse RSS
        var rawItems = [];
        for (var i = 0; i < SOURCES.length; i++) {
            var parsed = parseRSS(xmlList[i], SOURCES[i].name, ITEMS_PER_SOURCE);
            for (var j = 0; j < parsed.length; j++) { rawItems.push(parsed[j]); }
        }

        if (rawItems.length === 0) {
            return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Không thể tải tin công nghệ' }) };
        }

        // 3. Sort theo thời gian — tin mới nhất lên đầu
        rawItems.sort(function (a, b) {
            var ta = parsePubDate(a.pubDate); var tb = parsePubDate(b.pubDate);
            return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
        });

        // 4. Fetch article cho top N bài (song song, 3s timeout)
        var articleTexts = await Promise.all(rawItems.map(function (it, idx) {
            if (idx < MAX_ARTICLES) {
                return fetchURL(it.link, ARTICLE_TIMEOUT).then(function (html) {
                    var text = extractArticleText(html);
                    return text.length > 100 ? text : it.desc;
                });
            }
            return Promise.resolve(it.desc || '');
        }));

        // 5. Build items với extractive summary
        var allItems = rawItems.map(function (it, idx) {
            var summary = extractiveSummary(articleTexts[idx], 600);
            if (!summary || summary.length < 20) { summary = it.desc || ''; }
            return {
                title:   it.title,
                summary: summary,
                link:    it.link,
                source:  it.source,
                pubDate: it.pubDate
            };
        });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'public, max-age=600'
            },
            body: JSON.stringify({
                items: allItems,
                total: allItems.length,
                timestamp: new Date().toISOString()
            })
        };
    } catch (e) {
        return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: e.message }) };
    }
};