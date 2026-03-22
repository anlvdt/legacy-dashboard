/**
 * video-gen/config.js — Cấu hình tạo video tin tức TikTok
 */
// Thêm FFmpeg vào PATH nếu chưa có
var FFMPEG_DIR = process.env.LOCALAPPDATA
    + '\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin';
if (process.env.Path && process.env.Path.indexOf('ffmpeg') === -1) {
    process.env.Path = FFMPEG_DIR + ';' + process.env.Path;
}

module.exports = {
    // API endpoints
    NEWS_API: 'https://legacy-dashboard.netlify.app/api/news-summary',
    TECH_API: 'https://legacy-dashboard.netlify.app/api/tech-news',
    TTS_API:  'https://legacy-dashboard.netlify.app/api/tts-proxy',

    // Video settings (TikTok portrait 9:16)
    WIDTH:  1080,
    HEIGHT: 1920,
    FPS:    30,

    // TTS voices (luân phiên nam/nữ)
    VOICES: ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'],
    TTS_RATE: '+0%',

    // Số tin tối đa mỗi loại
    MAX_TECH_NEWS: 4,
    MAX_GEN_NEWS:  4,

    // Output
    OUTPUT_DIR: './video-gen/output',
    TEMP_DIR:   './video-gen/temp',

    // Picsum ảnh nền
    PICSUM_IDS: [
        10, 11, 15, 17, 18, 19, 20, 24, 25, 26, 27, 28, 29, 36, 37, 39,
        40, 42, 43, 44, 47, 48, 49, 50, 54, 56, 57, 58, 59, 60, 65, 66,
        67, 68, 69, 70, 73, 74, 75, 76, 77, 78, 79, 82, 83, 84, 85, 87,
        88, 89, 90, 91, 92, 94, 95, 96, 98, 99, 100, 101, 102, 103, 104
    ],

    // Font cho subtitle (Windows)
    FONT_FILE: 'C:/Windows/Fonts/arial.ttf',
    FONT_BOLD: 'C:/Windows/Fonts/arialbd.ttf'
};
