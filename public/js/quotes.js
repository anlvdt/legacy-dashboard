/**
 * quotes.js — Module ca dao, tục ngữ cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 1.2, 5.7
 */

var LF = LF || {};

LF.quotes = {};

/** Interval ID cho rotate */
LF.quotes._rotateInterval = null;

/** Index câu hiện tại */
LF.quotes._currentIndex = -1;

/** Sự kiện lịch sử "ngày này" */
LF.quotes._historyEvents = [];

/** Đếm lượt rotate để xen kẽ lịch sử */
LF.quotes._rotateCount = 0;

/**
 * Bộ sưu tập ca dao, tục ngữ, danh ngôn tiếng Việt
 * Phân loại theo chủ đề: gia-dinh, hoc-tap, dao-duc, mua-vu, cuoc-song, tinh-yeu
 * Inline để test có thể truy cập trực tiếp + không cần HTTP request
 */
LF.quotes.collection = [
    /* ===== GIA ĐÌNH (20 câu) ===== */
    { text: 'Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Một giọt máu đào hơn ao nước lã.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Chị ngã em nâng.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Con có cha như nhà có nóc.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Cá không ăn muối cá ươn, con cãi cha mẹ trăm đường con hư.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Anh em như thể tay chân, rách lành đùm bọc dở hay đỡ đần.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Thuận vợ thuận chồng tát Biển Đông cũng cạn.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Đi khắp thế gian không ai tốt bằng mẹ, gánh nặng cuộc đời không ai khổ bằng cha.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Giàu vì bạn, sang vì vợ.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Con hơn cha là nhà có phúc.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Phúc đức tại mẫu.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Mẹ già như chuối ba hương, như xôi nếp một như đường mía lau.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Tre già măng mọc.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Con dại cái mang.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Của chồng công vợ.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Nhà khó cũng đỡ nhau cùng, kẻo mà đói nó lùng cả hai.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Cha mẹ nuôi con bằng trời bằng bể, con nuôi cha mẹ con kể từng ngày.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Anh em trong nhà đóng cửa bảo nhau.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Con khôn nở mặt mẹ cha.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Bầu ơi thương lấy bí cùng, tuy rằng khác giống nhưng chung một giàn.', author: 'Ca dao', category: 'gia-dinh' },

    /* ===== HỌC TẬP (20 câu) ===== */
    { text: 'Học ăn, học nói, học gói, học mở.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Không thầy đố mày làm nên.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Học thầy không tày học bạn.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Dốt đến đâu học lâu cũng biết.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Đi một ngày đàng, học một sàng khôn.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Người không học như ngọc không mài.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Muốn biết phải hỏi, muốn giỏi phải học.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Học hành vất vả kết quả ngọt bùi.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Ăn vóc học hay.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Bảy mươi còn học bảy mươi mốt.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Dao có mài mới sắc, người có học mới khôn.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Hay học thì sang, hay làm thì giàu.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Một kho vàng không bằng một nang chữ.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Có học có hơn.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Ông bảy mươi học ông bảy mươi mốt.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Học khôn đến chết, học nết đến già.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Ít chữ khó nói, ít vốn khó làm.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Biết thì thưa thốt, không biết thì dựa cột mà nghe.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Học chẳng hay, cày chẳng biết, chi hay nói chuyện tầm phào.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Học là học để mà hành, vừa hành vừa học mới thành người khôn.', author: 'Ca dao', category: 'hoc-tap' },

    /* ===== ĐẠO ĐỨC (25 câu) ===== */
    { text: 'Ở hiền gặp lành.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Thương người như thể thương thân.', author: 'Ca dao', category: 'dao-duc' },
    { text: 'Lá lành đùm lá rách.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao.', author: 'Ca dao', category: 'dao-duc' },
    { text: 'Ăn quả nhớ kẻ trồng cây.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Uống nước nhớ nguồn.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Tốt gỗ hơn tốt nước sơn.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Đói cho sạch, rách cho thơm.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Cái nết đánh chết cái đẹp.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Giấy rách phải giữ lấy lề.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Người ta là hoa đất.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Đất có lề, quê có thói.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Chết vinh còn hơn sống nhục.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Tiên học lễ, hậu học văn.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Lời nói chẳng mất tiền mua, lựa lời mà nói cho vừa lòng nhau.', author: 'Ca dao', category: 'dao-duc' },
    { text: 'Chim khôn kêu tiếng rảnh rang, người khôn nói tiếng dịu dàng dễ nghe.', author: 'Ca dao', category: 'dao-duc' },
    { text: 'Đất lành chim đậu.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Ở bầu thì tròn, ở ống thì dài.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Khôn ngoan đến cửa quan mới biết, giàu có ba mươi tết mới hay.', author: 'Ca dao', category: 'dao-duc' },
    { text: 'Một con ngựa đau cả tàu bỏ cỏ.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Yêu trẻ trẻ đến nhà, kính già già để tuổi cho.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Nhiễu điều phủ lấy giá gương, người trong một nước phải thương nhau cùng.', author: 'Ca dao', category: 'dao-duc' },
    { text: 'Chết trong còn hơn sống đục.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Của người phúc ta.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Ăn ngay nói thẳng.', author: 'Tục ngữ', category: 'dao-duc' },

    /* ===== MÙA VỤ / THIÊN NHIÊN (18 câu) ===== */
    { text: 'Trời nắng tốt dưa, trời mưa tốt lúa.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Nhất nước, nhì phân, tam cần, tứ giống.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Tháng giêng là tháng ăn chơi, tháng hai trồng đậu, tháng ba trồng cà.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Lúa chiêm lấp ló đầu bờ, hễ nghe tiếng sấm phất cờ mà lên.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Người ta đi cấy lấy công, tôi nay đi cấy còn trông nhiều bề.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Chuồn chuồn bay thấp thì mưa, bay cao thì nắng, bay vừa thì râm.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Mồng chín tháng chín có mưa, thì con sắm sửa cày bừa làm ăn.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Ráng mỡ gà thì gió, ráng mỡ chó thì mưa.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Tấc đất tấc vàng.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Mau sao thì nắng, vắng sao thì mưa.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Gió heo may, chuồn chuồn bay thì bão.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Đêm tháng năm chưa nằm đã sáng, ngày tháng mười chưa cười đã tối.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Trăng quầng trời hạn, trăng tán trời mưa.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Tháng bảy nước nhảy lên bờ.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Kiến đen tha trứng lên cao, sắp có mưa rào chẳng chạy thì ướt.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Nắng tốt dưa, mưa tốt lúa.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Trồng trầu trồng lộn giàn tiêu, ai ơi nhờ gió đưa diều lên mây.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Tháng chạp là tháng trồng khoai, tháng giêng trồng đậu tháng hai trồng cà.', author: 'Ca dao', category: 'mua-vu' },

    /* ===== CUỘC SỐNG / KINH NGHIỆM (30 câu) ===== */
    { text: 'Có công mài sắt có ngày nên kim.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Kiến tha lâu cũng đầy tổ.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Thất bại là mẹ thành công.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Có chí thì nên.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Năng nhặt chặt bị.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Gần mực thì đen, gần đèn thì sáng.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Ăn cây nào rào cây nấy.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Đường đi khó không khó vì ngăn sông cách núi mà khó vì lòng người ngại núi e sông.', author: 'Nguyễn Bá Học', category: 'cuoc-song' },
    { text: 'Ai ơi bưng bát cơm đầy, dẻo thơm một hạt đắng cay muôn phần.', author: 'Ca dao', category: 'cuoc-song' },
    { text: 'Ăn trông nồi, ngồi trông hướng.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Một nghề cho chín còn hơn chín nghề.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Sông có khúc, người có lúc.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Khéo ăn thì no, khéo co thì ấm.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Đi hỏi già, về nhà hỏi trẻ.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Trâu chậm uống nước đục.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Chớ thấy sóng cả mà ngã tay chèo.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Có thực mới vực được đạo.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Cây ngay không sợ chết đứng.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Phèn mau đâm trong, người mau đâm khôn.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Thua keo này bày keo khác.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Ở đời muôn sự của chung, hơn nhau một tiếng anh hùng mà thôi.', author: 'Ca dao', category: 'cuoc-song' },
    { text: 'Già néo đứt dây.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Nhất nghệ tinh nhất thân vinh.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Cái khó bó cái khôn.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Phi thương bất phú.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Nước lã mà vã nên hồ, tay không mà nổi cơ đồ mới ngoan.', author: 'Ca dao', category: 'cuoc-song' },
    { text: 'Liệu cơm gắp mắm.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Đồng tiền liền khúc ruột.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Mưa dầm thấm lâu.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Cha truyền con nối.', author: 'Tục ngữ', category: 'cuoc-song' },

    /* ===== TÌNH YÊU (18 câu) ===== */
    { text: 'Yêu nhau mấy núi cũng trèo, mấy sông cũng lội, mấy đèo cũng qua.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Thuyền về có nhớ bến chăng, bến thì một dạ khăng khăng đợi thuyền.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Đôi ta như lửa mới nhen, như trăng mới mọc, như đèn mới khêu.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Qua đình ngả nón trông đình, đình bao nhiêu ngói thương mình bấy nhiêu.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Râu tôm nấu với ruột bầu, chồng chan vợ húp gật đầu khen ngon.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Muối ba năm muối đang còn mặn, gừng chín tháng gừng hãy còn cay.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Trầu này trầu tính trầu tình, ăn vào cho đỏ môi mình môi ta.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Gió đưa cành trúc la đà, tiếng chuông Trấn Vũ canh gà Thọ Xương.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Trúc xinh trúc mọc đầu đình, em xinh em đứng một mình cũng xinh.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Chiều chiều ra đứng ngõ sau, trông về quê mẹ ruột đau chín chiều.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Ước gì sông rộng một gang, bắc cầu dải yếm cho chàng sang chơi.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Đêm qua tát nước đầu đình, bỏ quên chiếc áo trên cành hoa sen.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Nhớ ai bổi hổi bồi hồi, như đứng đống lửa như ngồi đống than.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Thương nhau cởi áo cho nhau, về nhà mẹ hỏi qua cầu gió bay.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Tình yêu là ngọn lửa sáng, ai cũng cần hơi ấm của nó.', author: 'Danh ngôn', category: 'tinh-yeu' },
    { text: 'Thiếp nhớ chàng như đông nhớ nắng, như hạ nhớ mưa, mong đợi lượm thưa như kẻ đợi mùa.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Cây đa cũ, bến đò xưa, bộ hành có nghĩa nắng mưa cũng chờ.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Sông dài cá lội biệt tăm, phải duyên phải kiếp ngàn năm cũng chờ.', author: 'Ca dao', category: 'tinh-yeu' },

    /* ===== TRUYỀN CẢM HỨNG — Danh ngôn Việt Nam (45 câu) ===== */
    { text: 'Không có gì quý hơn độc lập, tự do.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Một năm bắt đầu từ mùa xuân, một đời bắt đầu từ tuổi trẻ.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Vì lợi ích mười năm trồng cây, vì lợi ích trăm năm trồng người.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Non sông Việt Nam có trở nên vẻ vang hay không, dân tộc Việt Nam có được sánh vai các cường quốc năm châu hay không, chính nhờ một phần lớn ở công học tập của các em.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Dễ trăm lần không dân cũng chịu, khó vạn lần dân liệu cũng xong.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Đoàn kết, đoàn kết, đại đoàn kết. Thành công, thành công, đại thành công.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Tôi chỉ có một sự ham muốn, ham muốn tột bậc, là làm sao cho nước ta được hoàn toàn độc lập, dân ta được hoàn toàn tự do.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Gươm mài đá, đá cũng mòn. Voi uống nước, nước sông cũng cạn.', author: 'Lê Lợi', category: 'truyen-cam-hung' },
    { text: 'Non sông gấm vóc của ta, do phần lớn đắp xây tự tay chúng ta.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Nếu bạn sinh ra trong nghèo khó, đó không phải lỗi của bạn. Nhưng nếu bạn chết trong nghèo khó đó là lỗi của bạn.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Đại trượng phu không phải thuật bo bo tay áo, anh hùng không phải gồng gánh bước ra.', author: 'Nguyễn Công Trứ', category: 'truyen-cam-hung' },
    { text: 'Làm trai cho đáng nên trai, xuống Đông Đông tĩnh, lên Đoài Đoài yên.', author: 'Ca dao', category: 'truyen-cam-hung' },
    { text: 'Sống ở trên đời người cũng vậy, gian nan rèn luyện mới thành công.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Không có việc gì khó, chỉ sợ lòng không bền, đào núi và lấp biển, quyết chí ắt làm nên.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Lấy dân làm gốc.', author: 'Trần Hưng Đạo', category: 'truyen-cam-hung' },
    { text: 'Bước tới đèo Ngang bóng xế tà, cỏ cây chen đá lá chen hoa.', author: 'Bà Huyện Thanh Quan', category: 'truyen-cam-hung' },
    { text: 'Việt Nam muôn năm! Độc lập muôn năm!', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Hãy tự tin vào bản thân mình, rồi thế giới sẽ tin bạn.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Thà một phút huy hoàng rồi chợt tắt, còn hơn buồn le lói suốt trăm năm.', author: 'Xuân Diệu', category: 'truyen-cam-hung' },
    { text: 'Qua muôn sóng gió đến bến bờ bình yên.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Ai chiến thắng mà không hề chiến bại, ai nên khôn mà chẳng dại đôi lần.', author: 'Tố Hữu', category: 'truyen-cam-hung' },
    { text: 'Nếu phải đi xuyên qua địa ngục, hãy cứ đi, đừng dừng lại.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Mỗi ngày là một cơ hội mới để thay đổi cuộc sống.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Hành trình vạn dặm bắt đầu từ một bước chân.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Hãy gieo một hành động, bạn sẽ gặt được một thói quen. Hãy gieo một thói quen, bạn sẽ gặt được một tính cách.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Sự kiên nhẫn là chìa khóa của mọi thành công.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Người mạnh không phải người không bao giờ ngã, mà là người ngã rồi đứng dậy.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Đừng sợ bước đi chậm, chỉ sợ đứng im.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Cuộc sống là một hành trình, không phải đích đến.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Khó khăn chỉ là thử thách, không phải trở ngại.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Người chăm chỉ như cây xanh mùa hạ, gốc có sâu thì thân mới vững.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Gieo suy nghĩ gặt hành động, gieo hành động gặt thói quen, gieo thói quen gặt số phận.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Tri thức là sức mạnh.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Cơ hội không tự đến, bạn phải tạo ra nó.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Thành công là đi từ thất bại này đến thất bại khác mà không mất đi nhiệt huyết.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Niềm tin là sức mạnh lớn nhất của con người.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Sống là để cống hiến, không chỉ để tồn tại.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Ai cũng có thể nổi giận, điều đó thật dễ dàng. Nhưng biết bình tĩnh trong cơn giận mới là điều đáng quý.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Đừng đợi cơ hội, hãy tạo ra nó.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Người bi quan nhìn khó khăn trong cơ hội, người lạc quan nhìn cơ hội trong khó khăn.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Hãy sống mỗi ngày như thể đó là ngày cuối cùng.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Thay đổi bắt đầu từ chính bạn.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Hạnh phúc không phải đích đến mà là cách bạn đi.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Điều duy nhất đứng giữa bạn và giấc mơ là nỗi sợ thất bại.', author: 'Danh ngôn', category: 'truyen-cam-hung' },
    { text: 'Lấy nhân nghĩa thắng hung tàn, lấy trí nhân thay cường bạo.', author: 'Nguyễn Trãi', category: 'truyen-cam-hung' },

    /* ===== LỊCH SỬ — Danh ngôn lịch sử Việt Nam (15 câu) ===== */
    { text: 'Như nước Đại Việt ta từ trước, vốn xưng nền văn hiến đã lâu.', author: 'Nguyễn Trãi', category: 'lich-su' },
    { text: 'Nam quốc sơn hà nam đế cư, tiệt nhiên định phận tại thiên thư.', author: 'Lý Thường Kiệt', category: 'lich-su' },
    { text: 'Đánh cho để dài tóc, đánh cho để đen răng.', author: 'Quang Trung', category: 'lich-su' },
    { text: 'Ta thà làm quỷ nước Nam còn hơn làm vương đất Bắc.', author: 'Trần Bình Trọng', category: 'lich-su' },
    { text: 'Nếu bệ hạ muốn hàng giặc thì trước hết hãy chém đầu thần rồi hãy hàng.', author: 'Trần Quốc Tuấn', category: 'lich-su' },
    { text: 'Khoan thư sức dân để làm kế sâu rễ bền gốc, đó là thượng sách giữ nước.', author: 'Trần Hưng Đạo', category: 'lich-su' },
    { text: 'Giang sơn dễ có mà tay ai giữ vững, sự nghiệp khó thành mà ai phụ tấm lòng.', author: 'Nguyễn Huệ', category: 'lich-su' },
    { text: 'Người trong một nước phải thương nhau cùng.', author: 'Ca dao', category: 'lich-su' },
    { text: 'Nước mất thì nhà tan.', author: 'Tục ngữ', category: 'lich-su' },
    { text: 'Dân vi quý, xã tắc thứ chi, quân vi khinh.', author: 'Mạnh Tử', category: 'lich-su' },
    { text: 'Phải biết cách đánh bằng mưu trí, lấy ít đánh nhiều.', author: 'Trần Hưng Đạo', category: 'lich-su' },
    { text: 'Trong đầm gì đẹp bằng sen, lá xanh bông trắng lại chen nhị vàng.', author: 'Ca dao', category: 'lich-su' },
    { text: 'Dù ai đi ngược về xuôi, nhớ ngày giỗ tổ mùng mười tháng ba.', author: 'Ca dao', category: 'lich-su' },
    { text: 'Muốn sang thì bắc cầu kiều, muốn con hay chữ thì yêu lấy thầy.', author: 'Ca dao', category: 'lich-su' },
    { text: 'Đem đại nghĩa thắng hung tàn, lấy chí nhân thay cường bạo.', author: 'Nguyễn Trãi', category: 'lich-su' }
];

/**
 * Tải thêm ca dao, tục ngữ từ API (bổ sung vào collection inline)
 * Collection inline đã có sẵn 55 câu, API chỉ bổ sung thêm nếu có
 * @param {function} callback
 */
LF.quotes.loadData = function (callback) {
    // Collection inline đã có sẵn — gọi callback ngay
    if (callback) { callback(); }

    // Tải sự kiện "ngày này trong lịch sử" (không block)
    LF.quotes._loadHistory();
};

/**
 * Tải sự kiện "ngày này trong lịch sử" từ byabbe.se
 */
LF.quotes._loadHistory = function () {
    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var url = 'https://byabbe.se/on-this-day/' + month + '/' + day + '/events.json';

    if (typeof LF.utils === 'undefined' || !LF.utils.makeRequest) { return; }

    LF.utils.makeRequest(url, function (err, data) {
        if (err || !data || !data.events || !data.events.length) { return; }

        var events = data.events;
        var picked = [];
        var i, ev;

        // Lọc sự kiện có năm >= 1800 và mô tả ngắn gọn
        for (i = 0; i < events.length; i++) {
            ev = events[i];
            if (ev.year && parseInt(ev.year, 10) >= 1800 && ev.description && ev.description.length < 200) {
                picked.push({
                    year: ev.year,
                    text: ev.description
                });
            }
        }

        // Giữ tối đa 15 sự kiện ngẫu nhiên
        if (picked.length > 15) {
            picked.sort(function () { return Math.random() - 0.5; });
            picked = picked.slice(0, 15);
        }

        LF.quotes._historyEvents = picked;
    }, 8000);
};

/**
 * Hiển thị câu ca dao ngẫu nhiên hoặc sự kiện lịch sử (xen kẽ) lên DOM
 * Mỗi 3 lượt ca dao sẽ xen 1 sự kiện lịch sử
 */
LF.quotes.showRandom = function () {
    LF.quotes._rotateCount++;

    // Xen kẽ: mỗi 3 lượt hiện 1 sự kiện lịch sử
    if (LF.quotes._historyEvents.length > 0 && LF.quotes._rotateCount % 3 === 0) {
        LF.quotes._showHistoryEvent();
        return;
    }

    var collection = LF.quotes.collection;
    if (!collection || !collection.length) { return; }

    var index = Math.floor(Math.random() * collection.length);
    // Tránh lặp lại câu vừa hiển thị
    if (collection.length > 1 && index === LF.quotes._currentIndex) {
        index = (index + 1) % collection.length;
    }
    LF.quotes._currentIndex = index;

    var quote = collection[index];
    var textEl = document.getElementById('quote-text');
    var authorEl = document.getElementById('quote-author');
    var wrapperEl = document.getElementById('quote-widget');

    if (textEl) {
        textEl.textContent = quote.text;
    }
    if (authorEl) {
        authorEl.textContent = '\u2014 ' + quote.author;
    }
    if (wrapperEl) {
        if (wrapperEl.className.indexOf('loaded') === -1) {
            wrapperEl.className += ' loaded';
        }
    }
};

/**
 * Hiển thị 1 sự kiện lịch sử "ngày này"
 */
LF.quotes._showHistoryEvent = function () {
    var events = LF.quotes._historyEvents;
    if (!events.length) { return; }

    var idx = Math.floor(Math.random() * events.length);
    var ev = events[idx];

    var textEl = document.getElementById('quote-text');
    var authorEl = document.getElementById('quote-author');

    if (textEl) {
        textEl.textContent = ev.text;
    }
    if (authorEl) {
        authorEl.textContent = '\u2014 Ng\u00E0y n\u00E0y n\u0103m ' + ev.year;
    }
};

/**
 * Đổi câu mới định kỳ (mỗi 60 giây)
 * @param {number} intervalMs - khoảng thời gian giữa các lần đổi (mặc định 60000ms)
 */
LF.quotes.rotate = function (intervalMs) {
    var interval = intervalMs || 60000;

    LF.quotes.loadData(function () {
        // Dừng rotate cũ nếu có
        if (LF.quotes._rotateInterval) {
            clearInterval(LF.quotes._rotateInterval);
            LF.quotes._rotateInterval = null;
        }

        // Hiển thị câu đầu tiên ngay
        LF.quotes.showRandom();

        // Đặt interval đổi câu
        LF.quotes._rotateInterval = setInterval(function () {
            LF.quotes.showRandom();
        }, interval);
    });
};
