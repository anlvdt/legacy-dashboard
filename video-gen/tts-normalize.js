/**
 * video-gen/tts-normalize.js — Chuẩn hóa text trước khi gửi TTS
 * Đồng bộ logic với public/js/tts.js
 */
var dict = [
    ['TP.HCM','Thành phố Hồ Chí Minh'],['TPHCM','Thành phố Hồ Chí Minh'],
    ['TP HCM','Thành phố Hồ Chí Minh'],['UBND','Ủy ban nhân dân'],
    ['HĐND','Hội đồng nhân dân'],['TTXVN','Thông tấn xã Việt Nam'],
    ['TANDTC','Tòa án nhân dân tối cao'],['TAND','Tòa án nhân dân'],
    ['VKSND','Viện kiểm sát nhân dân'],['CSĐT','Cảnh sát điều tra'],
    ['CSGT','Cảnh sát giao thông'],['GD&ĐT','Giáo dục và Đào tạo'],
    ['GTVT','Giao thông vận tải'],['BHXH','Bảo hiểm xã hội'],
    ['BHYT','Bảo hiểm y tế'],['BTC','bê tê xê'],
    ['BĐS','Bất động sản'],['ĐBSCL','Đồng bằng sông Cửu Long'],
    ['EVN','Tập đoàn Điện lực'],['TW','Trung ương'],
    ['ASEAN','a xê an'],['NATO','na tô'],['UNESCO','u nét cô'],
    ['WHO','vê kép hát ô'],['WTO','vê kép tê ô'],['EU','ê u'],['UN','u en'],
    ['BRICS','bríc'],['OPEC','ô péc'],['G7','gờ bảy'],['G20','gờ hai mươi'],
    ['iPhone','ai phôn'],['iPad','ai pét'],['MacBook','mác buk'],
    ['Apple','áp pồ'],['Google','gú gồ'],['YouTube','diu túp'],
    ['Android','an đờ roi'],['Microsoft','mai cờ rô sốp'],
    ['Samsung','sam sung'],['Xiaomi','si ao mi'],
    ['Tesla','tét la'],['SpaceX','xờ pây éc'],
    ['CPU','xê pê u'],['GPU','giê pê u'],['USB','u ét bê'],
    ['SSD','ét ét đê'],['RAM','ram'],['LED','lét'],['OLED','ô lét'],
    ['WiFi','uai fai'],['Bluetooth','blú tút'],['5G','năm gờ'],['4G','bốn gờ'],
    ['VPN','vê pê en'],['AI','a i'],['ML','em eo'],['LLM','eo eo em'],
    ['ChatGPT','chát gờ pê tê'],['GPT','gờ pê tê'],['OpenAI','ô pần ai'],
    ['DeepSeek','đíp xíc'],['Facebook','phây búc'],['TikTok','tíc tóc'],
    ['Instagram','in xờ ta gram'],['Zalo','da lô'],
    ['Bitcoin','bít coin'],['Blockchain','blóc chen'],
    ['CEO','xê i ô'],['GDP','gờ đê pê'],['FDI','ép đê i'],
    ['USD','đô la Mỹ'],['EUR','ơ rô'],['VND','đồng'],
    ['BMW','bê em vê kép'],['COVID','cô vít'],
    ['vaccine','vắc xin'],['virus','vi rút'],
    ['GHz','ghi ga hét'],['GB','ghi ga bai'],['TB','tê ra bai'],['MB','mê ga bai'],
    ['mAh','mi li am pe giờ'],['kWh','ki lô oát giờ'],
    ['FPT','ép pê tê'],['VNPT','vê en pê tê'],['Viettel','viết teo'],
    ['VnExpress','vê en éc pờ rét'],
    ['%',' phần trăm'],['&',' và ']
];

function normalize(text) {
    if (!text) return '';
    var str = text;
    str = str.replace(/https?:\/\/\S+/g, '');
    for (var i = 0; i < dict.length; i++) {
        var key = dict[i][0], val = dict[i][1];
        if (key.length <= 3 && /^[A-Za-z0-9]+$/.test(key)) {
            str = str.replace(new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), val);
        } else {
            str = str.split(key).join(val);
        }
    }
    str = str.replace(/[_\[\]{}|\\^~`<>]/g, ' ');
    // Ngày tháng
    str = str.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, function(_, d, m, y) {
        return 'ngày ' + parseInt(d) + ' tháng ' + parseInt(m) + ' năm ' + y;
    });
    str = str.replace(/(\d{1,2})\/(\d{1,2})/g, function(_, d, m) {
        return 'ngày ' + parseInt(d) + ' tháng ' + parseInt(m);
    });
    // Giờ
    str = str.replace(/(\d{1,2})[hH:](\d{2})/g, function(_, h, m) {
        return parseInt(h) + ' giờ ' + (parseInt(m) > 0 ? parseInt(m) + ' phút' : '');
    });
    // Số thập phân
    str = str.replace(/(\d+),(\d{1,2})(?!\d)/g, '$1 phẩy $2');
    // Số hàng nghìn
    str = str.replace(/(\d{1,3})\.(\d{3})\.(\d{3})/g, '$1$2$3');
    str = str.replace(/(\d{1,3})\.(\d{3})/g, '$1$2');
    // Ký hiệu
    str = str.replace(/°C/g, ' độ xê');
    str = str.replace(/°/g, ' độ ');
    str = str.replace(/≥/g, ' lớn hơn hoặc bằng ');
    str = str.replace(/≤/g, ' nhỏ hơn hoặc bằng ');
    str = str.replace(/(\d)\s*[-–]\s*(\d)/g, '$1 đến $2');
    str = str.replace(/\s{2,}/g, ' ').trim();
    return str;
}

module.exports = normalize;
