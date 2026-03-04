#!/usr/bin/env node
/**
 * curate.js — Chọn lọc câu hay nhất từ API data cho Legacy Dashboard
 * 
 * Tiêu chí chọn lọc:
 * 1. Chiều dài phù hợp (15-120 ký tự) — vừa màn hình nhỏ
 * 2. Không chứa ký tự lạ, wiki markup, hoặc văn bản bị lỗi
 * 3. Câu có ý nghĩa rõ ràng, dễ hiểu
 * 4. Phân bổ đều các category
 * 5. Ưu tiên ca dao, tục ngữ phổ biến
 * 
 * Output: public/js/quotes-data.js (ES5 compatible)
 */
var fs = require('fs');
var path = require('path');

var API_DIR = path.join(__dirname, '..', 'api', 'v1', 'categories');
var OUTPUT = path.join(__dirname, '..', '..', 'public', 'js', 'quotes-data.js');

// Đọc tất cả categories
var files = fs.readdirSync(API_DIR).filter(function (f) { return f.endsWith('.json'); });
var allQuotes = [];
files.forEach(function (file) {
    var data = JSON.parse(fs.readFileSync(path.join(API_DIR, file), 'utf-8'));
    allQuotes = allQuotes.concat(data);
});

console.log('Total quotes in API: ' + allQuotes.length);

// ============================================================
// CURATION FILTERS
// ============================================================

function isGoodQuote(q) {
    var text = q.text;

    // 1. Chiều dài phù hợp cho dashboard (15-150 chars)
    if (text.length < 15 || text.length > 150) return false;

    // 2. Phải có dấu tiếng Việt (loại bỏ entries không phải tiếng Việt)
    if (!/[àáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ]/i.test(text)) return false;

    // 3. Không chứa wiki markup, HTML hoặc ký tự lạ
    if (/[\[\]{}|<>\\]/.test(text)) return false;
    if (/http|www\.|\.com|\.org/.test(text)) return false;

    // 4. Không quá ngắn (thành ngữ 2-3 từ khó hiểu ngoài bối cảnh)
    var words = text.split(/\s+/);
    if (words.length < 3) return false;

    // 5. Không chứa nội dung thô tục
    if (/ỉa|đái|đéo|địt|cứt|phân|ỉ|ngu/.test(text.toLowerCase())) return false;

    // 6. Bỏ các biến thể trùng (ví dụ: "Ăn cây nào rào cây ấy/nấy")
    if (/\//.test(text) && text.split('/').length > 2) return false;

    return true;
}

// Apply filters
var filtered = allQuotes.filter(isGoodQuote);
console.log('After quality filter: ' + filtered.length);

// ============================================================
// DEDUP — loại trùng lặp  
// ============================================================

var seen = {};
var deduped = [];
filtered.forEach(function (q) {
    var key = q.text.toLowerCase()
        .replace(/[^a-zàáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ\s]/g, '')
        .substring(0, 40);
    if (!seen[key]) {
        seen[key] = true;
        deduped.push(q);
    }
});
console.log('After dedup: ' + deduped.length);

// ============================================================
// BALANCED SELECTION — phân bổ đều category
// ============================================================

// Group by category
var byCategory = {};
deduped.forEach(function (q) {
    var cat = q.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(q);
});

// Target distribution — đảm bảo mỗi category có đủ quote
var TARGET_TOTAL = 500;
var categories = Object.keys(byCategory);
var targetPerCat = Math.floor(TARGET_TOTAL / categories.length);

var selected = [];
categories.forEach(function (cat) {
    var quotes = byCategory[cat];
    // Shuffle
    quotes.sort(function () { return Math.random() - 0.5; });
    // Take up to target, or all if less
    var take = Math.min(quotes.length, targetPerCat);
    selected = selected.concat(quotes.slice(0, take));
    console.log('  ' + cat + ': ' + take + '/' + quotes.length);
});

// Nếu chưa đủ target, lấy thêm từ categories lớn
if (selected.length < TARGET_TOTAL) {
    var remaining = TARGET_TOTAL - selected.length;
    var selectedTexts = {};
    selected.forEach(function (q) { selectedTexts[q.text] = true; });

    var extras = deduped.filter(function (q) { return !selectedTexts[q.text]; });
    extras.sort(function () { return Math.random() - 0.5; });
    selected = selected.concat(extras.slice(0, remaining));
}

console.log('\nFinal selected: ' + selected.length);

// ============================================================
// GENERATE ES5 OUTPUT
// ============================================================

var lines = [];
lines.push('/**');
lines.push(' * quotes-data.js — Bộ sưu tập ca dao, tục ngữ, thành ngữ, danh ngôn Việt Nam');
lines.push(' * Generated from Vietnamese Quotes API (' + allQuotes.length + ' quotes)');
lines.push(' * Curated: ' + selected.length + ' quotes across ' + categories.length + ' categories');
lines.push(' * Generated: ' + new Date().toISOString().split('T')[0]);
lines.push(' *');
lines.push(' * Sources: vi.wikiquote.org, en.wikiquote.org, vi.wiktionary.org, en.wiktionary.org');
lines.push(' * All quotes from Vietnamese oral tradition or documented historical sources');
lines.push(' * ES5 compatible — no let/const/arrow/template literals');
lines.push(' */');
lines.push('');
lines.push('var LF = LF || {};');
lines.push('LF.quotesData = [');

selected.forEach(function (q, i) {
    var text = q.text.replace(/'/g, "\\'");
    var author = (q.author || 'Tục ngữ').replace(/'/g, "\\'");
    var cat = q.category;
    var comma = (i < selected.length - 1) ? ',' : '';
    lines.push("    { text: '" + text + "', author: '" + author + "', category: '" + cat + "' }" + comma);
});

lines.push('];');
lines.push('');

var output = lines.join('\n');
fs.writeFileSync(OUTPUT, output, 'utf-8');
console.log('✅ Saved to: ' + OUTPUT);
console.log('   Size: ' + Math.round(output.length / 1024) + ' KB');
