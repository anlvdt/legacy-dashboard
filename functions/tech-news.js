const https = require('https');

/**
 * tech-news.js — Tin công nghệ tóm tắt extractive
 *
 * Fetch RSS từ 4 nguồn công nghệ VN, parse, clean description,
 * trả về mảng bài với tóm tắt 1-2 câu (không dùng AI, zero cost).
 *
 * Extractive summary: lấy câu đầu tiên có nghĩa từ description RSS.
 * RSS của VnExpress/Tuổi Trẻ đã là tóm tắt biên tập sẵn — chất lượng tốt.
 */

const SOURCES = [
    { name: 'VnExpress', url: 'https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss' },
    { name: 'Tuổi Trẻ',  url: 'https://tuoitre.vn/rss/nhip-song-so.rss' },
    { name: 'Thanh Niên', url: 'https://thanhnien.vn/rss/cong-nghe.rss' },
    { name: 'Dân Trí',   url: 'https://dantri.com.vn/rss/suc-manh-so.rss' }
];

const ITEMS_PER_SOURCE = 5;
const FETCH_TIMEOUT = 8000;

// ─── Fetch ────────────────────────────────────────────────────────────────────

function fetchURL(url) {
    return new Promise(function (resolve) {
        var req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LegacyFrame/1.0)',
                'Accept': 'application/rss+xml, text/xml, */*'
            },
            timeout: FETCH_TIMEOUT
        }, function (res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchURL(res.headers.location));
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

// ─── HTML entity decode (server-side, không có DOM) ──────────────────────────

function decodeEntities(str) {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&aacute;/g, 'á').replace(/&agrave;/g, 'à').replace(/&atilde;/g, 'ã')
        .replace(/&acirc;/g, 'â').replace(/&auml;/g, 'ä')
        .replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&ecirc;/g, 'ê')
        .replace(/&iacute;/g, 'í').replace(/&igrave;/g, 'ì').replace(/&icirc;/g, 'î')
        .replace(/&oacute;/g, 'ó').replace(/&ograve;/g, 'ò').replace(/&otilde;/g, 'õ')
        .replace(/&ocirc;/g, 'ô').replace(/&ouml;/g, 'ö')
        .replace(/&uacute;/g, 'ú').replace(/&ugrave;/g, 'ù').replace(/&ucirc;/g, 'û')
        .replace(/&#\d+;/g, '');
}

// ─── Clean description ────────────────────────────────────────────────────────

function cleanDesc(raw) {
    if (!raw) { return ''; }
    // Strip CDATA
    var s = raw.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
    // Strip HTML tags
    s = s.replace(/<[^>]+>/g, ' ');
    // Decode entities
    s = decodeEntities(s);
    // Normalize whitespace
    s = s.replace(/\s+/g, ' ').trim();
    // Bỏ prefix "(Dân trí) -" hoặc "(Nguồn) -"
    s = s.replace(/^\([^)]{1,30}\)\s*[-–]\s*/, '');
    return s;
}

// ─── Extractive summary: lấy 1-2 câu đầu có nghĩa ───────────────────────────

function extractSummary(desc, maxLen) {
    if (!desc) { return ''; }
    maxLen = maxLen || 180;

    // Tách câu tại dấu chấm/chấm than/hỏi chấm
    var sentences = desc.split(/(?<=[.!?])\s+/);
    // Fallback cho môi trường không hỗ trợ lookbehind
    if (sentences.length === 1) {
        sentences = desc.replace(/([.!?])\s+/g, '$1\n').split('\n');
    }

    var result = '';
    for (var i = 0; i < sentences.length; i++) {
        var s = sentences[i].trim();
        if (s.length < 20) { continue; } // bỏ câu quá ngắn
        if (result.length === 0) {
            result = s;
        } else if (result.length + s.length + 1 <= maxLen) {
            result = result + ' ' + s;
        } else {
            break;
        }
    }

    // Nếu không tách được câu, truncate tại từ gần nhất
    if (!result) {
        result = desc.length > maxLen
            ? desc.substring(0, maxLen).replace(/\s+\S*$/, '') + '...'
            : desc;
    }

    return result;
}

// ─── Parse RSS XML ────────────────────────────────────────────────────────────

function parseRSS(xml, sourceName, limit) {
    var items = [];
    if (!xml) { return items; }

    var re = /<item>([\s\S]*?)<\/item>/gi;
    var m;
    while ((m = re.exec(xml)) !== null && items.length < limit) {
        var block = m[1];

        var titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        var linkM  = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        var descM  = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
        var dateM  = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

        var title = titleM ? cleanDesc(titleM[1]) : '';
        var link  = linkM  ? linkM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '';
        var desc  = descM  ? cleanDesc(descM[1]) : '';
        var pubDate = dateM ? dateM[1].trim() : '';

        if (!title || title.length < 5) { continue; }

        var summary = extractSummary(desc, 180);

        items.push({
            title: title,
            summary: summary,
            link: link,
            source: sourceName,
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
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
    }

    try {
        // Fetch tất cả RSS song song
        var xmlList = await Promise.all(
            SOURCES.map(function (s) { return fetchURL(s.url); })
        );

        var allItems = [];
        for (var i = 0; i < SOURCES.length; i++) {
            var parsed = parseRSS(xmlList[i], SOURCES[i].name, ITEMS_PER_SOURCE);
            for (var j = 0; j < parsed.length; j++) {
                allItems.push(parsed[j]);
            }
        }

        if (allItems.length === 0) {
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
                items: allItems,
                total: allItems.length,
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
