const https = require('https');

/**
 * tech-news.js — Tin công nghệ tóm tắt AI
 *
 * Nguồn RSS: VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, VietnamNet, Zing, Tinhte
 * Tóm tắt: Cloudflare Workers AI (llama-3.1-8b-instruct) nếu có CF_ACCOUNT_ID + CF_AI_TOKEN
 * Fallback: extractive (câu đầu tiên có nghĩa từ description RSS)
 *
 * CF Workers AI free tier: 10,000 neurons/ngày — hard cap, không charge thêm.
 * Mỗi lần tóm tắt ~50-80 neurons → ~120-200 bài/ngày trong free tier.
 * Cache 10 phút → thực tế chỉ gọi AI ~144 lần/ngày nếu refresh liên tục.
 */

const SOURCES = [
    { name: 'VnExpress',   url: 'https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss' },
    { name: 'Tuổi Trẻ',   url: 'https://tuoitre.vn/rss/nhip-song-so.rss' },
    { name: 'Thanh Niên',  url: 'https://thanhnien.vn/rss/cong-nghe.rss' },
    { name: 'Dân Trí',     url: 'https://dantri.com.vn/rss/suc-manh-so.rss' },
    { name: 'VietnamNet',  url: 'https://vietnamnet.vn/rss/cong-nghe.rss' },
    { name: 'Zing Tech',   url: 'https://znews.vn/rss/cong-nghe.rss' },
    { name: 'Tinhte',      url: 'https://tinhte.vn/rss' }
];

const ITEMS_PER_SOURCE = 4;
const FETCH_TIMEOUT = 8000;
const AI_TIMEOUT = 10000;

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
                var next = res.headers.location;
                if (!next.startsWith('http')) {
                    try { next = new URL(next, url).href; } catch (e) { return resolve(''); }
                }
                return resolve(fetchURL(next));
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

function decodeEntities(str) {
    return str
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/&aacute;/g, 'á').replace(/&agrave;/g, 'à').replace(/&atilde;/g, 'ã')
        .replace(/&acirc;/g, 'â').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è')
        .replace(/&ecirc;/g, 'ê').replace(/&iacute;/g, 'í').replace(/&igrave;/g, 'ì')
        .replace(/&oacute;/g, 'ó').replace(/&ograve;/g, 'ò').replace(/&otilde;/g, 'õ')
        .replace(/&ocirc;/g, 'ô').replace(/&uacute;/g, 'ú').replace(/&ugrave;/g, 'ù')
        .replace(/&ucirc;/g, 'û').replace(/&#\d+;/g, '');
}

function cleanText(raw) {
    if (!raw) { return ''; }
    var s = raw.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
    s = s.replace(/<[^>]+>/g, ' ');
    s = decodeEntities(s);
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/^\([^)]{1,30}\)\s*[-–]\s*/, ''); // bỏ "(Dân trí) -"
    return s;
}

// ─── Extractive fallback ──────────────────────────────────────────────────────

function extractiveSummary(desc, maxLen) {
    if (!desc) { return ''; }
    maxLen = maxLen || 180;
    var sentences = desc.replace(/([.!?])\s+/g, '$1\n').split('\n');
    var result = '';
    for (var i = 0; i < sentences.length; i++) {
        var s = sentences[i].trim();
        if (s.length < 20) { continue; }
        if (!result) { result = s; }
        else if (result.length + s.length + 1 <= maxLen) { result += ' ' + s; }
        else { break; }
    }
    if (!result) {
        result = desc.length > maxLen ? desc.substring(0, maxLen).replace(/\s+\S*$/, '') + '...' : desc;
    }
    return result;
}

// ─── Cloudflare Workers AI summarization ─────────────────────────────────────

/**
 * Gọi CF Workers AI để tóm tắt 1 bài.
 * Model: @cf/meta/llama-3.1-8b-instruct (hỗ trợ tiếng Việt tốt)
 * @param {string} accountId
 * @param {string} apiToken
 * @param {string} title
 * @param {string} desc
 * @returns {Promise<string|null>}
 */
function cfAISummarize(accountId, apiToken, title, desc) {
    return new Promise(function (resolve) {
        var prompt = 'Tóm tắt bài báo công nghệ sau thành 1-2 câu tiếng Việt ngắn gọn, súc tích (tối đa 150 ký tự). Chỉ trả về câu tóm tắt, không giải thích thêm.\n\nTiêu đề: ' + title + '\nNội dung: ' + desc;

        var body = JSON.stringify({
            messages: [
                { role: 'system', content: 'Bạn là trợ lý tóm tắt tin tức công nghệ tiếng Việt. Trả lời ngắn gọn, chính xác.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 120,
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
                        // Trim về 180 ký tự
                        text = text.trim();
                        if (text.length > 180) {
                            text = text.substring(0, 180).replace(/\s+\S*$/, '') + '...';
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

        var title = titleM ? cleanText(titleM[1]) : '';
        var link  = linkM  ? linkM[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').trim() : '';
        var desc  = descM  ? cleanText(descM[1]) : '';
        var pubDate = dateM ? dateM[1].trim() : '';

        if (!title || title.length < 5) { continue; }
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
    const useAI = !!(CF_ACCOUNT_ID && CF_AI_TOKEN);

    try {
        // 1. Fetch tất cả RSS song song
        const xmlList = await Promise.all(SOURCES.map(s => fetchURL(s.url)));

        // 2. Parse
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

        // 3. Summarize — AI nếu có token, extractive nếu không
        var allItems = [];
        if (useAI) {
            // Gọi AI song song, giới hạn concurrency 5 để tránh rate limit
            var BATCH = 5;
            for (var b = 0; b < rawItems.length; b += BATCH) {
                var batch = rawItems.slice(b, b + BATCH);
                var summaries = await Promise.all(batch.map(function (it) {
                    return cfAISummarize(CF_ACCOUNT_ID, CF_AI_TOKEN, it.title, it.desc);
                }));
                for (var k = 0; k < batch.length; k++) {
                    allItems.push({
                        title:   batch[k].title,
                        summary: summaries[k] || extractiveSummary(batch[k].desc, 180),
                        link:    batch[k].link,
                        source:  batch[k].source,
                        pubDate: batch[k].pubDate,
                        aiSummarized: !!summaries[k]
                    });
                }
            }
        } else {
            // Extractive fallback
            for (var n = 0; n < rawItems.length; n++) {
                allItems.push({
                    title:   rawItems[n].title,
                    summary: extractiveSummary(rawItems[n].desc, 180),
                    link:    rawItems[n].link,
                    source:  rawItems[n].source,
                    pubDate: rawItems[n].pubDate,
                    aiSummarized: false
                });
            }
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
