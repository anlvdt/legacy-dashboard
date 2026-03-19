#!/usr/bin/env node
/**
 * parse-wikiquote.js — Parse scraped Wikiquote data into category JSON files
 */
const fs = require('fs');
const path = require('path');

const categoriesDir = path.join(__dirname, '..', 'api', 'v1', 'categories');

function categorize(text) {
    const t = text.toLowerCase();
    if (/cha|mẹ|con|anh em|chị em|vợ|chồng|gia đình|phụ|mẫu|cháu|ông bà|dâu|rể/.test(t)) return 'gia-dinh';
    if (/học|thầy|trò|sách|chữ|dốt|trường|thi|bút|mực/.test(t)) return 'hoc-tap';
    if (/yêu|thương|nhớ|duyên|tình|lòng|em ơi|anh ơi|hôn|cưới/.test(t)) return 'tinh-yeu';
    if (/mưa|nắng|lúa|trồng|cấy|gặt|ruộng|vụ|mùa|kiến|chuồn|phân|giống/.test(t)) return 'mua-vu';
    if (/đức|thiện|ác|nhân|nghĩa|sạch|thơm|hiền|lành|phúc|tội|lễ/.test(t)) return 'dao-duc';
    if (/nước|sử|vua|tướng|giặc|đánh|quân|độc lập|tổ quốc|trận/.test(t)) return 'lich-su';
    if (/trâu|bò|cá|chim|mèo|chó|voi|cọp|kiến|ong|rắn|chuột|gà|vịt|ngựa/.test(t)) return 'thien-nhien';
    if (/nghề|thợ|buôn|bán|làm|tiền|của|giàu|nghèo|ruộng|cày/.test(t)) return 'lao-dong';
    return 'cuoc-song';
}

function cleanText(raw) {
    return raw
        .replace(/^\*+:?\s*/, '')    // Remove wiki list markers
        .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')  // [[link|text]] -> text
        .replace(/'''?/g, '')         // Bold/italic markers
        .replace(/<[^>]+>/g, '')      // HTML tags
        .replace(/\s+/g, ' ')         // Multi-space
        .trim();
}

// ---- Parse tục ngữ ----
function parseTucNgu() {
    const file = '/tmp/wikiquote-Tục_ngữ_Việt_Nam.txt';
    if (!fs.existsSync(file)) { console.log('Skip tục ngữ (no file)'); return []; }

    const text = fs.readFileSync(file, 'utf-8');
    const lines = text.split('\n');
    const quotes = [];

    for (const line of lines) {
        if (!line.trim().startsWith('*')) continue;
        const clean = cleanText(line);
        if (clean.length < 5 || clean.length > 300) continue;
        if (/^==/.test(clean)) continue; // Section headers

        quotes.push({
            text: clean,
            author: 'Tục ngữ',
            source: 'vi.wikiquote.org — Tục ngữ Việt Nam, truyền khẩu dân gian'
        });
    }
    return quotes;
}

// ---- Parse ca dao ----
function parseCaDao() {
    const file = '/tmp/wikiquote-Ca_dao_Việt_Nam.txt';
    if (!fs.existsSync(file)) { console.log('Skip ca dao (no file)'); return []; }

    const text = fs.readFileSync(file, 'utf-8');
    const lines = text.split('\n');
    const quotes = [];
    let current = '';

    for (const line of lines) {
        const trimmed = line.trim();
        // Ca dao entries often span multiple lines (luc bat)
        if (trimmed.startsWith('*:') || trimmed.startsWith('* :')) {
            if (current.length > 0) {
                // Save previous
                const clean = cleanText(current);
                if (clean.length >= 10 && clean.length <= 400) {
                    quotes.push({
                        text: clean,
                        author: 'Ca dao',
                        source: 'vi.wikiquote.org — Ca dao Việt Nam, truyền khẩu dân gian'
                    });
                }
            }
            current = trimmed;
        } else if (trimmed.startsWith(':') && current.length > 0) {
            // Continuation line
            current += ' ' + trimmed.replace(/^:+\s*/, '');
        } else if (trimmed === '' && current.length > 0) {
            const clean = cleanText(current);
            if (clean.length >= 10 && clean.length <= 400) {
                quotes.push({
                    text: clean,
                    author: 'Ca dao',
                    source: 'vi.wikiquote.org — Ca dao Việt Nam, truyền khẩu dân gian'
                });
            }
            current = '';
        }
    }
    // Last entry
    if (current.length > 0) {
        const clean = cleanText(current);
        if (clean.length >= 10 && clean.length <= 400) {
            quotes.push({ text: clean, author: 'Ca dao', source: 'vi.wikiquote.org — Ca dao Việt Nam, truyền khẩu dân gian' });
        }
    }
    return quotes;
}

// ---- Parse combined page ----
function parseCombined() {
    const file = '/tmp/wikiquote-Ca_dao_tục_ngữ_Việt_Nam.txt';
    if (!fs.existsSync(file)) { console.log('Skip combined (no file)'); return []; }

    const text = fs.readFileSync(file, 'utf-8');
    const lines = text.split('\n');
    const quotes = [];

    for (const line of lines) {
        const trimmed = line.trim();
        // This page uses different format - look for standalone lines that are quotes
        if (trimmed.length < 10 || trimmed.length > 400) continue;
        if (/^[=\[{|<#!*]/.test(trimmed)) continue;  // Skip markup
        if (/^(Xem|Tham khảo|Nguồn|Liên kết|Chú thích)/.test(trimmed)) continue;

        const clean = cleanText(trimmed);
        if (clean.length < 10) continue;

        // Determine if ca dao or tuc ngu based on structure
        const isCaDao = clean.includes(',') && clean.split(',').length >= 2 && clean.length > 30;
        quotes.push({
            text: clean,
            author: isCaDao ? 'Ca dao' : 'Tục ngữ',
            source: 'vi.wikiquote.org — Ca dao tục ngữ Việt Nam, truyền khẩu dân gian'
        });
    }
    return quotes;
}

// ---- Deduplicate ----
function dedup(quotes) {
    const seen = new Set();
    return quotes.filter(q => {
        const key = q.text.toLowerCase().replace(/[^a-zàáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ\s]/g, '').substring(0, 60);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ---- Main ----
console.log('📖 Parsing Wikiquote data...\n');

const tucNgu = parseTucNgu();
console.log('Tục ngữ: ' + tucNgu.length);

const caDao = parseCaDao();
console.log('Ca dao: ' + caDao.length);

const combined = parseCombined();
console.log('Combined: ' + combined.length);

let all = dedup([...tucNgu, ...caDao, ...combined]);
console.log('After dedup: ' + all.length);

// Categorize and assign IDs starting from 400
all.forEach((q, i) => {
    q.id = 400 + i;
    q.category = categorize(q.text);
});

// Group by category and merge into existing files
const byCategory = {};
all.forEach(q => {
    if (!byCategory[q.category]) byCategory[q.category] = [];
    byCategory[q.category].push(q);
});

console.log('\n📊 By category:');
Object.entries(byCategory).forEach(([cat, quotes]) => {
    console.log('  ' + cat + ': ' + quotes.length);

    const catFile = path.join(categoriesDir, cat + '.json');
    let existing = [];
    if (fs.existsSync(catFile)) {
        existing = JSON.parse(fs.readFileSync(catFile, 'utf-8'));
    }

    // Dedup against existing
    const existingTexts = new Set(existing.map(e => e.text.toLowerCase().substring(0, 50)));
    const newQuotes = quotes.filter(q => !existingTexts.has(q.text.toLowerCase().substring(0, 50)));

    const merged = [...existing, ...newQuotes];
    // Re-assign IDs
    merged.forEach((q, i) => { q.id = i + 1; });

    fs.writeFileSync(catFile, JSON.stringify(merged, null, 2), 'utf-8');
    console.log('  → ' + catFile.split('/').pop() + ': ' + existing.length + ' + ' + newQuotes.length + ' = ' + merged.length);
});

console.log('\n✅ Done! Run "node scripts/build.js" to rebuild combined files.');
