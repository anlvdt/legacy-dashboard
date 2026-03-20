const https = require('https');

/**
 * Netlify Function: YouTube Search Proxy
 * Tìm video IDs từ YouTube search results
 * Trả về JSON array các video IDs
 */
exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }
    var q = (event.queryStringParameters || {}).q || 'cải lương xưa hay nhất';
    var maxResults = parseInt((event.queryStringParameters || {}).n) || 20;

    try {
        var html = await fetchPage('https://www.youtube.com/results?search_query=' + encodeURIComponent(q));

        // Extract video IDs từ HTML response
        var ids = [];
        var seen = {};

        // Pattern 1: "videoId":"XXXXXXXXXXX"
        var regex = /"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/g;
        var match;
        while ((match = regex.exec(html)) !== null) {
            var vid = match[1];
            if (!seen[vid] && ids.length < maxResults) {
                seen[vid] = true;
                ids.push(vid);
            }
        }

        // Extract titles nếu có
        var items = [];
        for (var i = 0; i < ids.length; i++) {
            items.push({ id: ids[i] });
        }

        // Thử extract titles từ JSON data trong HTML
        try {
            var jsonMatch = html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
            if (jsonMatch) {
                var data = JSON.parse(jsonMatch[1]);
                var contents = data.contents
                    && data.contents.twoColumnSearchResultsRenderer
                    && data.contents.twoColumnSearchResultsRenderer.primaryContents
                    && data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer
                    && data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;

                if (contents) {
                    var videoItems = [];
                    for (var s = 0; s < contents.length; s++) {
                        var section = contents[s];
                        var itemSection = section.itemSectionRenderer;
                        if (!itemSection || !itemSection.contents) continue;
                        for (var c = 0; c < itemSection.contents.length; c++) {
                            var renderer = itemSection.contents[c].videoRenderer;
                            if (renderer && renderer.videoId) {
                                videoItems.push({
                                    id: renderer.videoId,
                                    title: renderer.title && renderer.title.runs && renderer.title.runs[0]
                                        ? renderer.title.runs[0].text : ''
                                });
                            }
                        }
                    }
                    if (videoItems.length > 0) {
                        items = videoItems.slice(0, maxResults);
                    }
                }
            }
        } catch (e) {
            // JSON parse lỗi — dùng danh sách IDs đã extract
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items: items, query: q })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: error.message, items: [] })
        };
    }
};

function fetchPage(url) {
    return new Promise(function(resolve, reject) {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
                'Accept': 'text/html,application/xhtml+xml'
            }
        }, function(res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchPage(res.headers.location).then(resolve).catch(reject);
                return;
            }
            var body = '';
            res.on('data', function(chunk) { body += chunk; });
            res.on('end', function() { resolve(body); });
        }).on('error', reject);
    });
}
