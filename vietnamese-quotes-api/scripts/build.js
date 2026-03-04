#!/usr/bin/env node
/**
 * build.js — Gộp tất cả category JSON thành api/v1/quotes.json
 * Chạy: node scripts/build.js
 */
const fs = require('fs');
const path = require('path');

const categoriesDir = path.join(__dirname, '..', 'api', 'v1', 'categories');
const outputFile = path.join(__dirname, '..', 'api', 'v1', 'quotes.json');
const indexFile = path.join(__dirname, '..', 'api', 'v1', 'categories.json');

// Đọc tất cả file .json trong thư mục categories
const files = fs.readdirSync(categoriesDir).filter(f => f.endsWith('.json'));
let allQuotes = [];
const categories = [];

files.forEach(file => {
    const filePath = path.join(categoriesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const categoryName = file.replace('.json', '');

    allQuotes = allQuotes.concat(data);
    categories.push({
        id: categoryName,
        count: data.length,
        endpoint: '/api/v1/categories/' + categoryName + '.json'
    });
});

// Sắp xếp theo id
allQuotes.sort((a, b) => a.id - b.id);

// Ghi file quotes.json (tất cả)
fs.writeFileSync(outputFile, JSON.stringify(allQuotes, null, 2), 'utf-8');
console.log('✅ quotes.json: ' + allQuotes.length + ' quotes');

// Ghi file categories.json (danh mục)
fs.writeFileSync(indexFile, JSON.stringify({
    total: allQuotes.length,
    categories: categories
}, null, 2), 'utf-8');
console.log('✅ categories.json: ' + categories.length + ' categories');

// Validate — kiểm tra schema
let errors = 0;
allQuotes.forEach((q, i) => {
    if (!q.id || !q.text || !q.author || !q.category || !q.source) {
        console.error('❌ Quote #' + q.id + ' thiếu field:', JSON.stringify(q).substring(0, 100));
        errors++;
    }
    if (typeof q.text !== 'string' || q.text.trim().length === 0) {
        console.error('❌ Quote #' + q.id + ' text rỗng');
        errors++;
    }
});

if (errors === 0) {
    console.log('✅ Schema validation passed');
} else {
    console.error('❌ ' + errors + ' lỗi schema');
    process.exit(1);
}
