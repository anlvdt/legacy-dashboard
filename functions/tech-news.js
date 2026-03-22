const https = require('https');

/**
 * tech-news.js — Tin công nghệ tóm tắt AI từ bài viết gốc
 *
 * Flow: RSS → lấy link → fetch full article → extract text → AI summarize
 * Netlify free tier timeout: 10s → 8 sources × 1 bài = 8 bài/lần
 */

const SOURCES = [
    { name: 'VnExpress',  url: 'https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss' },
    { name: 'Tuổi Trẻ',  url: 'https://tuoitre.vn/rss/nhip-song-so.rss' },
    { name: 'Thanh Niên', url: 'https://thanhnien.vn/rss/cong-nghe.rss' },
    { name: 'Dân Trí',    url: 'https://dantri.com.vn/rss/suc-manh-so.rss' },
    { name: 'VietnamNet', url: 'https://vietnamnet.vn/rss/cong-nghe.rss' },
    { name: 'Tinhte',     url: 'https://tinhte.vn/rss' },
    { name: 'GenK',       url: 'https://genk.vn/rss/home.rss' },
    { name: 'Techz',      url: 'https://www.techz.vn/rss/cong-nghe.rss' }
];

const ITEMS_PER_SOURCE = 1; // 8 sources × 1 = 8 bài, đủ nhanh trong 10s Netlify free tier
const RSS_TIMEOUT      = 8000;
const ARTICLE_TIMEOUT  = 8000;
const AI_TIMEOUT       = 6000;

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
                if (!next.startsWith('http')) {
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

// ─── Extract article text từ HTML ─────────────────────────────────────────────

/**
 * Lấy nội dung chính từ HTML bài báo.
 * Ưu tiên các selector phổ biến của báo VN, fallback về <p> tags.
 * Giới hạn 2000 ký tự để không vượt context AI.
 */
function extractArticleText(html) {
    if (!html) { return ''; }

    // Xóa script, style, nav, header, footer, ads
    html = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');

    // Thử extract từ các container bài viết phổ biến
    var containers = [
        /class="[^"]*(?:article-body|fck_detail|detail-content|content-detail|singular-content|entry-content|post-content|article__body|article-content)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article|section)>/i,
        /class="[^"]*(?:maincontent|main-content|content-main)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    ];

    var text = '';
    for (var i = 0; i < containers.length; i++) {
        var m = html.match(containers[i]);
        if (m) { text = m[1]; break; }
    }

    // Fallback: lấy tất cả <p>
    if (!text) { text = html; }

    // Extract text từ <p> tags
    var paragraphs = [];
    var pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    var pm;
    while ((pm = pRe.exec(text)) !== null) {
        var p = pm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        p = decodeEntities(p);
        if (p.length > 30) { paragraphs.push(p); }
    }

    var result = paragraphs.join(' ');
    if (result.length > 6000) { result = result.substring(0, 6000); }
    return result;
}

// ─── HTML entity decode ───────────────────────────────────────────────────────

// Map named HTML entities → ký tự (bao gồm Vietnamese diacritics)
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
    'szlig':'ß','eth':'ð','thorn':'þ',
    'laquo':'«','raquo':'»','mdash':'—','ndash':'–',
    'lsquo':'\u2018','rsquo':'\u2019','ldquo':'\u201C','rdquo':'\u201D',
    'bull':'\u2022','hellip':'\u2026','trade':'\u2122',
    'copy':'\u00A9','reg':'\u00AE','deg':'\u00B0',
    'frac12':'\u00BD','frac14':'\u00BC','frac34':'\u00BE',
    'times':'\u00D7','divide':'\u00F7','plusmn':'\u00B1',
    'micro':'\u00B5','para':'\u00B6','sect':'\u00A7','euro':'\u20AC',
    'pound':'\u00A3','yen':'\u00A5','cent':'\u00A2'
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
    s = s.replace(/<[^>]+>/g, ' ');
    s = decodeEntities(s);
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/^\([^)]{1,30}\)\s*[-–]\s*/, '');
    return s;
}

// ─── Extractive fallback ──────────────────────────────────────────────────────

function extractiveSummary(text, maxLen) {
    if (!text) { return ''; }
    maxLen = maxLen || 400;
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
    return result;
}

// ─── Gemini Flash Summarize ───────────────────────────────────────────────────

function geminiSummarize(apiKey, title, fullText) {
    return new Promise(function (resolve) {
        var content = fullText.length > 6000 ? fullText.substring(0, 6000) : fullText;
        var prompt = 'Tóm tắt bài báo công nghệ sau thành đoạn văn tiếng Việt hoàn chỉnh, tự nhiên, đầy đủ thông tin chính. Yêu cầu:\n- 4-6 câu, khoảng 400-600 ký tự\n- Nêu đủ: sản phẩm gì, thông số/tính năng nổi bật, giá bán, ngày ra mắt (nếu có)\n- Câu cuối phải kết thúc hoàn chỉnh, không bị ngắt giữa chừng\n- Giữ nguyên tên thương hiệu, model bằng tiếng Anh\n- Chỉ trả về đoạn tóm tắt, không thêm tiêu đề hay gạch đầu dòng\n\nTiêu đề: ' + title + '\nNội dung bài viết:\n' + content;

        var body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.15 }
        });

        var options = {
            hostname: 'generativelanguage.googleapis.com',
            path: '/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: AI_TIMEOUT
        };

        var req = https.request(options, function (res) {
            var data = '';
            res.on('data', function (c) { data += c; });
            res.on('end', function () {
                try {
                    var json = JSON.parse(data);
                    var text = json.candidates &&
                               json.candidates[0] &&
                               json.candidates[0].content &&
                               json.candidates[0].content.parts &&
                               json.candidates[0].content.parts[0] &&
                               json.candidates[0].content.parts[0].text;
                    if (text && text.trim().length > 10) {
                        text = text.trim();
                        if (text.length > 700) {
                            text = text.substring(0, text.lastIndexOf('.') + 1) || text.substring(0, 700);
                        }
                        return resolve(text);
                    }
                } catch (e) { /* fall through */ }
                resolve(null);
            });
        });
        req.on('error', function () { resolve(null); });
        req.on('timeout', function () { req.destroy(); resolve(null); });
        req.write(body);
        req.end();
    });
}

// ─── Cloudflare Workers AI (fallback) ────────────────────────────────────────

function cfAISummarize(accountId, apiToken, title, fullText) {
    return new Promise(function (resolve) {
        var content = fullText.length > 3000 ? fullText.substring(0, 3000) + '...' : fullText;
        var prompt = 'Tóm tắt bài báo công nghệ sau thành 3-4 câu tiếng Việt đầy đủ thông tin chính (khoảng 300-400 ký tự). Nêu rõ: sự kiện gì, sản phẩm/công nghệ nào, tác động/ý nghĩa. Chỉ trả về đoạn tóm tắt, không thêm tiêu đề hay giải thích.\n\nTiêu đề: ' + title + '\nNội dung bài viết: ' + content;

        var body = JSON.stringify({
            messages: [
                { role: 'system', content: 'Bạn là biên tập viên tin công nghệ tiếng Việt. Tóm tắt súc tích nhưng đầy đủ thông tin chính, viết liền mạch như bản tin phát thanh.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.3
        });

        var options = {
            hostname: 'api.cloudflare.com',
            path: '/client/v4/accounts/' + accountId + '/ai/run/@cf/meta/llama-3.1-8b-instruct',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiToken,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: AI_TIMEOUT
        };

        var req = https.request(options, function (res) {
            var data = '';
            res.on('data', function (c) { data += c; });
            res.on('end', function () {
                try {
                    var json = JSON.parse(data);
                    var text = json.result && json.result.response;
                    if (text && text.trim().length > 10) {
                        text = text.trim();
                        if (text.length > 450) {
                            text = text.substring(0, 450).replace(/\s+\S*$/, '') + '...';
                        }
                        return resolve(text);
                    }
                } catch (e) { /* fall through */ }
                resolve(null);
            });
        });
        req.on('error', function () { resolve(null); });
        req.on('timeout', function () { req.destroy(); resolve(null); });
        req.write(body);
        req.end();
    });
}

// ─── Parse RSS ────────────────────────────────────────────────────────────────

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

        var title   = titleM ? cleanText(titleM[1]) : '';
        var link    = linkM  ? linkM[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
        var desc    = descM  ? cleanText(descM[1]) : '';
        var pubDate = dateM  ? dateM[1].trim() : '';

        if (!title || title.length < 5 || !link) { continue; }
        items.push({ title, desc, link, source: sourceName, pubDate });
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

    const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
    const CF_AI_TOKEN   = process.env.CF_AI_TOKEN;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const useAI = !!(GEMINI_API_KEY || (CF_ACCOUNT_ID && CF_AI_TOKEN));

    try {
        // 1. Fetch tất cả RSS song song
        const xmlList = await Promise.all(SOURCES.map(function (s) { return fetchURL(s.url, RSS_TIMEOUT); }));

        // 2. Parse RSS → lấy link + title + desc (fallback)
        var rawItems = [];
        for (var i = 0; i < SOURCES.length; i++) {
            var parsed = parseRSS(xmlList[i], SOURCES[i].name, ITEMS_PER_SOURCE);
            for (var j = 0; j < parsed.length; j++) { rawItems.push(parsed[j]); }
        }

        if (rawItems.length === 0) {
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Không thể tải tin công nghệ' })
            };
        }

        // 3. Fetch full article song song, fallback về RSS desc nếu thất bại
        var articleTexts = await Promise.all(rawItems.map(function (it) {
            return fetchURL(it.link, ARTICLE_TIMEOUT).then(function (html) {
                var text = extractArticleText(html);
                return text.length > 100 ? text : it.desc; // fallback về RSS desc
            });
        }));

        // 4. Build items với extractive summary từ full article (luôn có)
        var allItems = rawItems.map(function (it, idx) {
            return {
                title:        it.title,
                summary:      extractiveSummary(articleTexts[idx], 400),
                link:         it.link,
                source:       it.source,
                pubDate:      it.pubDate,
                aiSummarized: false
            };
        });

        // 5. AI summarize từ full article text, race với timeout 8s
        if (useAI) {
            var aiTimeout = new Promise(function (resolve) { setTimeout(resolve, 8000); });
            var aiWork = Promise.all(rawItems.map(function (it, idx) {
                var summarize = GEMINI_API_KEY
                    ? geminiSummarize(GEMINI_API_KEY, it.title, articleTexts[idx])
                    : cfAISummarize(CF_ACCOUNT_ID, CF_AI_TOKEN, it.title, articleTexts[idx]);
                return summarize.then(function (s) {
                    if (s) { allItems[idx].summary = s; allItems[idx].aiSummarized = true; }
                });
            }));
            await Promise.race([aiWork, aiTimeout]);
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
                aiEnabled: useAI,
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
