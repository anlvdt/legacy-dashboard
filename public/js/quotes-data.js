/**
 * quotes-data.js — Bộ sưu tập ca dao, tục ngữ, thành ngữ, danh ngôn Việt Nam
 * Curated & proofread: 2026-03-06
 * - Loại bỏ câu cụt (thiếu vế đầu), câu không rõ nguồn gốc
 * - Sửa lỗi chính tả, dấu tiếng Việt, dấu câu
 * - Phân loại đúng: Ca dao / Tục ngữ / Thành ngữ / Danh ngôn
 * - Gán đúng category theo nội dung
 * ES5 compatible
 */

var LF = LF || {};

LF.quotesData = [
    /* ════════════════════════════════════════════
     * CUỘC SỐNG
     * ════════════════════════════════════════════ */
    { text: 'Đất có lề, quê có thói.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Sóng trước đổ đâu, sóng sau đổ đó.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Thuyền to sóng cả.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Gần lửa rát mặt.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Gió chiều nào, che chiều ấy.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Kính trên nhường dưới.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Kính lão đắc thọ.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Kiêu ngạo đi trước, bại hoại theo sau.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Đoàn kết thì sống, chia rẽ thì chết.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Mất lòng trước, được lòng sau.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Một lần cho tởn đến già.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Nói người phải nghĩ đến thân, sờ vào sau gáy xem gần hay xa.', author: 'Ca dao', category: 'cuoc-song' },
    { text: 'Việc nhà thì ngán, việc làng thì siêng.', author: 'Tục ngữ', category: 'cuoc-song' },
    { text: 'Ở đời muôn sự của chung, hơn nhau một tiếng anh hùng mà thôi.', author: 'Ca dao', category: 'cuoc-song' },
    { text: 'Ăn mày là ai, ăn mày là ta, đói cơm rách áo hóa ra ăn mày.', author: 'Ca dao', category: 'cuoc-song' },
    { text: 'Trống làng nào làng ấy đánh.', author: 'Tục ngữ', category: 'cuoc-song' },

    /* ════════════════════════════════════════════
     * ĐẠO ĐỨC
     * ════════════════════════════════════════════ */
    { text: 'Một điều nhịn chín điều lành.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Có đức mặc sức mà ăn.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Giấy rách phải giữ lấy lề.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Thương người như thể thương thân.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Lá lành đùm lá rách.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Nhân nào, quả nấy.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Xa mặt, cách lòng.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Đói cho sạch, rách cho thơm.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Ăn quả nhớ kẻ trồng cây.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Nhà sạch thì mát, bát sạch ngon cơm.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Công thì thưởng, tội thì trừng.', author: 'Tục ngữ', category: 'dao-duc' },
    { text: 'Dẻo thơm một hạt, đắng cay muôn phần.', author: 'Ca dao', category: 'dao-duc' },
    { text: 'Nghèo nhân nghèo nghĩa thì lo, nghèo tiền nghèo bạc chẳng lo là nghèo.', author: 'Ca dao', category: 'dao-duc' },
    { text: 'Rừng có mạch, vách có tai. Người trong chưa tỏ, người ngoài đã hay.', author: 'Ca dao', category: 'dao-duc' },
    { text: 'Đánh chết nết không chừa.', author: 'Tục ngữ', category: 'dao-duc' },

    /* ════════════════════════════════════════════
     * GIA ĐÌNH
     * ════════════════════════════════════════════ */
    { text: 'Chị ngã em nâng.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Phúc đức tại mẫu.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Của chồng công vợ.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Con có cha như nhà có nóc.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Cha mẹ sinh con, trời sinh tính.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Giàu vì bạn, sang vì vợ.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Ơn cha nghĩa mẹ.', author: 'Thành ngữ', category: 'gia-dinh' },
    { text: 'Thuyền theo lái, gái theo chồng.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Con không chê cha mẹ khó, chó không chê chủ nhà nghèo.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Anh em trong nhà đóng cửa bảo nhau.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Cá không ăn muối cá ươn, con cãi cha mẹ trăm đường con hư.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Mẹ già như chuối ba hương, như xôi nếp một, như đường mía lau.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Đi khắp thế gian không ai tốt bằng mẹ, gánh nặng cuộc đời không ai khổ bằng cha.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Tốt gỗ hơn tốt nước sơn, xấu người đẹp nết còn hơn đẹp người.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Ngó lên nuộc lạt mái nhà, bao nhiêu nuộc lạt nhớ ông bà bấy nhiêu.', author: 'Ca dao', category: 'gia-dinh' },
    { text: 'Chết cha còn chú, sẩy mẹ bú dì.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Dâu dữ mất họ, chó dữ mất láng giềng.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Công sinh thành không bằng công dưỡng dục.', author: 'Tục ngữ', category: 'gia-dinh' },
    { text: 'Cha mẹ đặt đâu, con nằm đấy.', author: 'Tục ngữ', category: 'gia-dinh' },

    /* ════════════════════════════════════════════
     * HỌC TẬP
     * ════════════════════════════════════════════ */
    { text: 'Người không học như ngọc không mài.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Đi một ngày đàng, học một sàng khôn.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Muốn biết phải hỏi, muốn giỏi phải học.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Học tài thi phận.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Một chữ cũng là thầy, nửa chữ cũng là thầy.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Có học mới hay, có cày mới biết.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Muốn lành nghề, chớ nề học hỏi.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Học, học nữa, học mãi.', author: 'V. I. Lenin', category: 'hoc-tap' },
    { text: 'Không thầy đố mày làm nên.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Thầy bói xem voi.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Xấu hay làm tốt, dốt hay nói chữ.', author: 'Tục ngữ', category: 'hoc-tap' },
    { text: 'Nhân chi sơ, tính bổn thiện.', author: 'Tam Tự Kinh', category: 'hoc-tap' },

    /* ════════════════════════════════════════════
     * LAO ĐỘNG — KINH TẾ
     * ════════════════════════════════════════════ */
    { text: 'Con trâu là đầu cơ nghiệp.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Nhất nghệ tinh, nhất thân vinh.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Mạnh vì gạo, bạo vì tiền.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Có làm thì mới có ăn, không dưng ai dễ đem phần đến cho.', author: 'Ca dao', category: 'lao-dong' },
    { text: 'Tay làm hàm nhai, tay quai miệng trễ.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Có tiền mua tiên cũng được.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Của bền tại người.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Có chí làm quan, có gan làm giàu.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Tiền vào nhà khó như gió vào nhà trống.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Bụng làm dạ chịu.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Một đêm ăn trộm bằng ba năm làm.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Của bụt mất một đền mười.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Ghét của nào, trời trao của ấy.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Sinh nghề, tử nghiệp.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Ruộng bề bề chẳng bằng nghề trong tay.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Giàu là họ, khó người dưng.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Buôn thúng bán bưng.', author: 'Thành ngữ', category: 'lao-dong' },
    { text: 'Bán trời không văn tự.', author: 'Thành ngữ', category: 'lao-dong' },
    { text: 'Mua danh ba vạn, bán danh ba đồng.', author: 'Tục ngữ', category: 'lao-dong' },
    { text: 'Được mùa buôn vải buôn vóc, mất mùa buôn thóc buôn gạo.', author: 'Tục ngữ', category: 'lao-dong' },

    /* ════════════════════════════════════════════
     * LỊCH SỬ — YÊU NƯỚC
     * ════════════════════════════════════════════ */
    { text: 'Ta thà làm quỷ nước Nam, còn hơn làm vương đất Bắc.', author: 'Trần Bình Trọng', category: 'lich-su' },
    { text: 'Các vua Hùng đã có công dựng nước, Bác cháu ta phải cùng nhau giữ lấy nước.', author: 'Hồ Chí Minh', category: 'lich-su' },
    { text: 'Tướng sĩ một lòng phụ tử, hòa nước sông chén rượu ngọt ngào.', author: 'Trần Hưng Đạo', category: 'lich-su' },
    { text: 'Được làm vua, thua làm giặc.', author: 'Tục ngữ', category: 'lich-su' },
    { text: 'Trăm trận trăm thắng.', author: 'Tục ngữ', category: 'lich-su' },
    { text: 'Nhà Bè nước chảy chia hai, ai về Gia Định, Đồng Nai thì về.', author: 'Ca dao', category: 'lich-su' },
    { text: 'Đồng Tháp Mười cò bay thẳng cánh, nước Tháp Mười lóng lánh cá tôm.', author: 'Ca dao', category: 'lich-su' },
    { text: 'Dân ta phải biết sử ta, cho tường gốc tích nước nhà Việt Nam.', author: 'Hồ Chí Minh', category: 'lich-su' },
    { text: 'Đống Đa ghi để lại đây, bên kia Thanh Miếu, bên này Bộc Am.', author: 'Ca dao', category: 'lich-su' },
    { text: 'Giọt máu đào hơn ao nước lã.', author: 'Tục ngữ', category: 'lich-su' },
    { text: 'Máu loãng còn hơn nước lã.', author: 'Tục ngữ', category: 'lich-su' },

    /* ════════════════════════════════════════════
     * MÙA VỤ — THỜI TIẾT
     * ════════════════════════════════════════════ */
    { text: 'Ráng mỡ gà, ai có nhà thì chống.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Ráng mỡ gà thì gió, ráng mỡ chó thì mưa.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Chuồn chuồn bay thấp thì mưa, bay cao thì nắng, bay vừa thì râm.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Kiến đen tha trứng lên cao, thế nào cũng có mưa rào rất to.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Tháng hai trồng cà, tháng ba trồng đỗ.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Trời nắng tốt dưa, trời mưa tốt lúa.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Cày sâu cuốc bẫm.', author: 'Thành ngữ', category: 'mua-vu' },
    { text: 'Tế nước theo mưa.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Gió heo may, chuồn chuồn bay thì bão.', author: 'Tục ngữ', category: 'mua-vu' },
    { text: 'Đom đóm bay ra, trồng cà tra đỗ.', author: 'Ca dao', category: 'mua-vu' },
    { text: 'Phượng hoàng ở chốn cheo leo, sa cơ lỡ vận phải theo đàn gà.', author: 'Ca dao', category: 'mua-vu' },

    /* ════════════════════════════════════════════
     * THÀNH NGỮ
     * ════════════════════════════════════════════ */
    { text: 'Ngàn cân treo sợi tóc.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Khổ tận cam lai.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Một sớm một chiều.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Gắp lửa bỏ tay người.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Lạy ông tôi ở bụi này.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Tứ hải giai huynh đệ.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Mèo già hóa cáo.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Nước đổ lá khoai.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Nước đổ đầu vịt.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Đục nước béo cò.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Quả báo nhãn tiền.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Siêng ăn nhác làm.', author: 'Thành ngữ', category: 'thanh-ngu' },
    { text: 'Khôn cũng chết, dại cũng chết, biết thì sống.', author: 'Tục ngữ', category: 'thanh-ngu' },

    /* ════════════════════════════════════════════
     * THIÊN NHIÊN — ĐỘNG VẬT
     * ════════════════════════════════════════════ */
    { text: 'Ta về ta tắm ao ta, dù trong dù đục ao nhà vẫn hơn.', author: 'Ca dao', category: 'thien-nhien' },
    { text: 'Trâu cột ghét trâu ăn.', author: 'Tục ngữ', category: 'thien-nhien' },
    { text: 'Rừng nào cọp nấy.', author: 'Tục ngữ', category: 'thien-nhien' },
    { text: 'Chó cắn người lành.', author: 'Tục ngữ', category: 'thien-nhien' },
    { text: 'Lên non mới biết non cao, lội sông mới biết sông sâu cạn nào.', author: 'Ca dao', category: 'thien-nhien' },
    { text: 'Trâu già thích gặm cỏ non.', author: 'Tục ngữ', category: 'thien-nhien' },
    { text: 'Mèo già thua gan chuột nhắt.', author: 'Thành ngữ', category: 'thien-nhien' },
    { text: 'Ăn như rồng cuốn, nói như rồng leo, làm như mèo mửa.', author: 'Tục ngữ', category: 'thien-nhien' },
    { text: 'Đời cua cua máy, đời cáy cáy đào.', author: 'Tục ngữ', category: 'thien-nhien' },
    { text: 'Chó treo mèo đậy.', author: 'Tục ngữ', category: 'thien-nhien' },
    { text: 'Đánh chó phải ngó mặt chủ.', author: 'Tục ngữ', category: 'thien-nhien' },
    { text: 'Con giun xéo lắm cũng quằn.', author: 'Tục ngữ', category: 'thien-nhien' },
    { text: 'Thân em như cá giữa rào, kẻ chài người lưới biết vào tay ai.', author: 'Ca dao', category: 'thien-nhien' },

    /* ════════════════════════════════════════════
     * TÌNH YÊU
     * ════════════════════════════════════════════ */
    { text: 'Yêu nhau tam tứ núi cũng trèo, ngũ lục sông cũng lội, thất bát đèo cũng qua.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Yêu ai yêu cả đường đi, ghét ai ghét cả tông ti họ hàng.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Qua đình ngả nón trông đình, đình bao nhiêu ngói thương mình bấy nhiêu.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Ép dầu ép mỡ, ai nỡ ép duyên.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Tóc mai sợi vắn sợi dài, lấy nhau chẳng đặng thương hoài ngàn năm.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Trăm năm đành lỗi hẹn hò, cây đa bến cũ, con đò khác đưa.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Hôm qua tát nước đầu đình, bỏ quên cái áo trên cành hoa sen.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Hỡi cô tát nước bên đàng, sao cô tát ánh trăng vàng đổ đi.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Thân em như hạt mưa sa, hạt xuống giếng ngọc, hạt ra ruộng cày.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Thân em như thể cánh bèo, ngược xuôi xuôi ngược theo chiều nước trôi.', author: 'Ca dao', category: 'tinh-yeu' },
    { text: 'Anh về học lấy chữ Nhu, chín trăng em đợi, mười thu em chờ.', author: 'Ca dao', category: 'tinh-yeu' },

    /* ════════════════════════════════════════════
     * TRUYỀN CẢM HỨNG — DANH NGÔN
     * ════════════════════════════════════════════ */
    { text: 'Không có gì quý hơn độc lập, tự do.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Một tấm gương sáng còn hơn một trăm bài diễn văn tuyên truyền.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Vì lợi ích mười năm trồng cây, vì lợi ích trăm năm trồng người.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Đoàn kết, đoàn kết, đại đoàn kết. Thành công, thành công, đại thành công.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Tuổi trẻ là mùa xuân của xã hội.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Dễ trăm lần không dân cũng chịu, khó vạn lần dân liệu cũng xong.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Non sông Việt Nam có trở nên tươi đẹp hay không, dân tộc Việt Nam có bước tới đài vinh quang hay không, chính nhờ phần lớn ở công học tập của các em.', author: 'Hồ Chí Minh', category: 'truyen-cam-hung' },
    { text: 'Việc nhân nghĩa cốt ở yên dân.', author: 'Nguyễn Trãi', category: 'truyen-cam-hung' },
    { text: 'Đem đại nghĩa để thắng hung tàn, lấy chí nhân để thay cường bạo.', author: 'Nguyễn Trãi', category: 'truyen-cam-hung' },
    { text: 'Nên thợ nên thầy vì có học, no cơm ấm áo bởi hay làm.', author: 'Nguyễn Trãi', category: 'truyen-cam-hung' },
    { text: 'Người trồng cây hạnh người chơi, ta trồng cây đức để đời mai sau.', author: 'Nguyễn Trãi', category: 'truyen-cam-hung' },
    { text: 'Lật thuyền mới biết sức dân mạnh như nước.', author: 'Nguyễn Trãi', category: 'truyen-cam-hung' },
    { text: 'Sống trong đời sống cần có một tấm lòng.', author: 'Trịnh Công Sơn', category: 'truyen-cam-hung' },
    { text: 'Trời sinh ra ta hẳn phải có chỗ dùng.', author: 'Lý Bạch', category: 'truyen-cam-hung' },
    { text: 'Nếu bắn vào quá khứ bằng súng lục, thì tương lai sẽ bắn lại bạn bằng đại bác.', author: 'Rasul Gamzatov', category: 'truyen-cam-hung' }
];
