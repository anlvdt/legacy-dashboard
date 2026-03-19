const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
(async () => {
    const tts = new MsEdgeTTS();
    await tts.setMetadata("vi-VN-HoaiMyNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const stream = tts.toStream("Thử nghiệm giọng đọc Edge TTS");
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => console.log('Success, length:', Buffer.concat(chunks).length));
    stream.on('error', err => console.error('Error:', err));
})();
