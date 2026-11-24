import { DEFAULT_PAGE_PROPS } from "./config";
import type { AgreementDocument, TemplatePage, TextInputProps, TextProps } from "./types";

/**
 * Vietnamese boarding-house lease (Hợp đồng thuê nhà trọ).
 * Fixed legal wording is Text; every blank of the paper form is a TextInput that is filled in on each lease.
 */

type Node = { type: string; props: Record<string, unknown> };
type Item = Node & { cost: number; zones?: Record<string, Node[]> };

const FONT = 13;
const LINE = 1.4;
const LINE_PX = FONT * LINE;
const CHARS_PER_LINE = 88; // conservative: Vietnamese diacritics are wide
const PAGE_BUDGET_PX = 930; // 273mm of usable height, minus a safety margin so nothing is clipped
const FIELD_PX = 30;

let seq = 0;
const nextId = (p: string) => `${p}${++seq}`;

const text = (t: string, o: Partial<TextProps> = {}): Item => {
  const size = o.fontSize ?? FONT;
  const lines = t.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil((l.length * size) / FONT / CHARS_PER_LINE)), 0);
  return {
    type: "Text",
    props: { id: nextId("t"), text: t, weight: "normal", align: "start", fontSize: FONT, lineHeight: LINE, ...o },
    cost: lines * size * (o.lineHeight ?? LINE),
  };
};
const article = (t: string): Item[] => [spacer(8), text(t, { weight: "bold" })];
const spacer = (height: number): Item => ({ type: "Spacer", props: { id: nextId("s"), height }, cost: height });

const field = (name: string, label: string, o: Partial<TextInputProps> = {}): Item => {
  const area = o.inputType === "textarea";
  const rows = o.rows ?? 3;
  return {
    type: "TextInput",
    props: { id: nextId("f"), name, label, unit: "", inputType: "text", labelPosition: area ? "top" : "left", defaultValue: "", fontSize: FONT, lineHeight: LINE, placeholder: "", rows, ...o },
    cost: area ? LINE_PX + rows * 20 + 8 : FIELD_PX,
  };
};
const date = (name: string, label: string): Item => ({
  type: "DateInput",
  props: { id: nextId("d"), name, label, labelPosition: "left", defaultValue: "", fontSize: FONT, lineHeight: LINE },
  cost: FIELD_PX,
});

const upload = (name: string, label: string, height = 90): Node => ({
  type: "ImageUpload",
  props: { id: nextId("i"), name, label, labelPosition: "top", height, fontSize: FONT, lineHeight: LINE },
});

/** One column of the signature block: role, signing date, signature image and printed name. */
const signatureColumn = (role: string, key: string): Node[] => [
  text(`${role}\n(Ký, ghi rõ họ tên)`, { weight: "bold", align: "center" }),
  date(`${key}SignedDate`, "Ngày ký:"),
  upload(`${key}Signature`, "Chữ ký (tải ảnh lên):"),
  field(`${key}SignerName`, "Họ tên:"),
].map(({ type, props }) => ({ type, props }));

const signatureBlock = (): Item => {
  const gridId = nextId("g");
  const cols = [signatureColumn("BÊN THUÊ", "tenant"), signatureColumn("BÊN CHO THUÊ", "landlord")].map((content) => ({ id: nextId("c"), content }));
  return {
    type: "Grid",
    props: { id: gridId },
    cost: 260,
    zones: {
      [`${gridId}:grid`]: cols.map((c) => ({ type: "GridItem", props: { id: c.id, columns: 6, rows: 1 } })),
      ...Object.fromEntries(cols.map((c) => [`${c.id}:content`, c.content])),
    },
  };
};

const area = (name: string, label: string, rows = 2) => field(name, label, { inputType: "textarea", rows });

const items: Item[] = [
  text("CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", { weight: "bold", align: "center", fontSize: 15 }),
  text("Độc lập - Tự do - Hạnh phúc", { weight: "bold", align: "center", fontSize: 14 }),
  spacer(14),
  text("HỢP ĐỒNG THUÊ NHÀ TRỌ", { weight: "bold", align: "center", fontSize: 16 }),
  field("contractNo", "(Số: …………/HĐTNO) Số:"),
  spacer(8),
  date("signedDate", "Hôm nay, ngày:"),
  field("signedAt", "Tại:"),
  text("Chúng tôi gồm có:"),

  ...article("BÊN CHO THUÊ (BÊN A):"),
  field("landlordName", "Ông/bà:"),
  field("landlordBirthYear", "Năm sinh:"),
  field("landlordIdNumber", "CMND/CCCD số:"),
  date("landlordIdIssuedDate", "Ngày cấp:"),
  field("landlordIdIssuedPlace", "Nơi cấp:"),
  field("landlordResidence", "Hộ khẩu:"),
  field("landlordAddress", "Địa chỉ:"),
  field("landlordPhone", "Điện thoại:"),
  field("landlordOwnedHouse", "Là chủ sở hữu nhà ở:"),
  text("Các chứng từ sở hữu và tham khảo về nhà ở đã được cơ quan có thẩm quyền cấp cho Bên A gồm có:"),
  area("landlordOwnershipDocs", "", 2),

  ...article("BÊN THUÊ (BÊN B):"),
  field("tenantName", "Ông/bà:"),
  field("tenantBirthYear", "Năm sinh:"),
  field("tenantIdNumber", "CMND/CCCD số:"),
  date("tenantIdIssuedDate", "Ngày cấp:"),
  field("tenantIdIssuedPlace", "Nơi cấp:"),
  field("tenantResidence", "Hộ khẩu:"),
  field("tenantAddress", "Địa chỉ:"),
  field("tenantPhone", "Điện thoại:"),
  field("tenantFax", "Fax:"),
  field("tenantTaxCode", "Mã số thuế:"),
  field("tenantBankAccount", "Tài khoản số:"),
  field("tenantBank", "Mở tại ngân hàng:"),
  spacer(6),
  text("Hai bên cùng thỏa thuận ký hợp đồng với những nội dung sau:", { weight: "bold" }),

  ...article("ĐIỀU 1. ĐỐI TƯỢNG CỦA HỢP ĐỒNG"),
  field("houseAddress", "Bên A đồng ý cho Bên B thuê căn hộ (căn nhà) tại địa chỉ (thuộc sở hữu hợp pháp của Bên A):"),
  text("Chi tiết căn hộ như sau:"),
  area("houseDetails", "Bao gồm (ban công, hệ thống điện nước, các bóng đèn trong các phòng và hệ thống công tắc, các bồn rửa mặt, bồn vệ sinh, …):", 3),

  ...article("ĐIỀU 2. GIÁ CHO THUÊ NHÀ Ở VÀ PHƯƠNG THỨC THANH TOÁN"),
  field("rentPrice", "2.1. Giá cho thuê nhà ở là (đồng/tháng):", { unit: "đồng/tháng" }),
  field("rentPriceInWords", "Bằng chữ:"),
  text("Giá cho thuê này đã bao gồm các chi phí về quản lý, bảo trì và vận hành nhà ở."),
  text("2.2. Các chi phí sử dụng điện, nước, điện thoại và các dịch vụ khác do bên B thanh toán cho bên cung cấp điện, nước, điện thoại và các cơ quan quản lý dịch vụ."),
  field("paymentMethod", "2.3. Phương thức thanh toán: bằng"),
  field("paymentDay", "Trả vào ngày … hàng tháng (ngày trong tháng):"),

  ...article("ĐIỀU 3. THỜI HẠN THUÊ VÀ THỜI ĐIỂM GIAO NHẬN NHÀ Ở"),
  field("leaseTerm", "3.1. Thời hạn thuê ngôi nhà nêu trên là:", { unit: "năm" }),
  date("leaseStartDate", "Kể từ ngày:"),
  date("handoverDate", "3.2. Thời điểm giao nhận nhà ở là ngày:"),

  ...article("ĐIỀU 4. NGHĨA VỤ VÀ QUYỀN CỦA BÊN A"),
  text("4.1. Nghĩa vụ của bên A:", { weight: "bold" }),
  text("a) Giao nhà ở và trang thiết bị gắn liền với nhà ở (nếu có) cho bên B theo đúng hợp đồng;"),
  text("b) Phổ biến cho bên B quy định về quản lý sử dụng nhà ở;"),
  text("c) Bảo đảm cho bên B sử dụng ổn định nhà trong thời hạn thuê;"),
  text("d) Bảo dưỡng, sửa chữa nhà theo định kỳ hoặc theo thỏa thuận; nếu bên A không bảo dưỡng, sửa chữa nhà mà gây thiệt hại cho bên B, thì phải bồi thường;"),
  text("e) Tạo điều kiện cho bên B sử dụng thuận tiện diện tích thuê;"),
  text("f) Nộp các khoản thuế về nhà và đất (nếu có);"),
  text("g) Hướng dẫn, đôn đốc bên B thực hiện đúng các quy định về đăng ký tạm trú."),
  text("4.2. Quyền của bên A:", { weight: "bold" }),
  text("a) Yêu cầu bên B trả đủ tiền thuê nhà đúng kỳ hạn như đã thỏa thuận;"),
  text("b) Trường hợp chưa hết hạn hợp đồng mà bên A cải tạo nhà ở và được bên B đồng ý thì bên A được quyền điều chỉnh giá cho thuê nhà ở. Giá cho thuê nhà ở mới do các bên thoả thuận; trong trường hợp không thoả thuận được thì bên A có quyền đơn phương chấm dứt hợp đồng thuê nhà ở và phải bồi thường cho bên B theo quy định của pháp luật;"),
  text("c) Yêu cầu bên B có trách nhiệm trong việc sửa chữa phần hư hỏng, bồi thường thiệt hại do lỗi của bên B gây ra;"),
  text("d) Cải tạo, nâng cấp nhà cho thuê khi được bên B đồng ý, nhưng không được gây phiền hà cho bên B sử dụng chỗ ở;"),
  field("landlordReclaimNoticeDays", "e) Được lấy lại nhà cho thuê khi hết hạn hợp đồng thuê, nếu hợp đồng không quy định thời hạn thì bên cho thuê muốn lấy lại nhà phải báo cho bên thuê biết trước … ngày:", { unit: "ngày" }),
  field("landlordTerminationNoticeDays", "f) Đơn phương chấm dứt thực hiện hợp đồng thuê nhà nhưng phải báo cho bên B biết trước ít nhất … ngày nếu không có thỏa thuận khác và yêu cầu bồi thường thiệt hại nếu bên B có một trong các hành vi sau đây:", { unit: "ngày" }),
  field("tenantUnpaidMonths", "- Không trả tiền thuê nhà liên tiếp trong … trở lên mà không có lý do chính đáng:"),
  text("- Sử dụng nhà không đúng mục đích thuê như đã thỏa thuận trong hợp đồng;"),
  text("- Tự ý đục phá, cơi nới, cải tạo, phá dỡ nhà ở đang thuê;"),
  text("- Bên B chuyển đổi, cho mượn, cho thuê lại nhà ở đang thuê mà không có sự đồng ý của bên A;"),
  text("- Làm mất trật tự, vệ sinh môi trường, ảnh hưởng nghiêm trọng đến sinh hoạt của những người xung quanh đã được bên A hoặc tổ trưởng tổ dân phố nhắc nhở mà vẫn không khắc phục;"),
  text("- Thuộc trường hợp khác theo quy định của pháp luật."),

  ...article("ĐIỀU 5. NGHĨA VỤ VÀ QUYỀN CỦA BÊN B"),
  text("5.1. Nghĩa vụ của bên B:", { weight: "bold" }),
  text("a) Sử dụng nhà đúng mục đích đã thỏa thuận, giữ gìn nhà ở và có trách nhiệm trong việc sửa chữa những hư hỏng do mình gây ra;"),
  text("b) Trả đủ tiền thuê nhà đúng kỳ hạn đã thỏa thuận;"),
  text("c) Trả tiền điện, nước, điện thoại, vệ sinh và các chi phí phát sinh khác trong thời gian thuê nhà;"),
  text("d) Trả nhà cho bên A theo đúng thỏa thuận."),
  text("e) Chấp hành đầy đủ những quy định về quản lý sử dụng nhà ở;"),
  text("f) Không được chuyển nhượng hợp đồng thuê nhà hoặc cho người khác thuê lại trừ trường hợp được bên A đồng ý bằng văn bản;"),
  text("g) Chấp hành các quy định về giữ gìn vệ sinh môi trường và an ninh trật tự trong khu vực cư trú;"),
  text("h) Giao lại nhà cho bên A trong các trường hợp chấm dứt hợp đồng."),
  text("5.2. Quyền của bên B:", { weight: "bold" }),
  text("a) Nhận nhà ở và trang thiết bị gắn liền (nếu có) theo đúng thoả thuận;"),
  text("b) Được đổi nhà đang thuê với bên thuê khác, nếu được bên A đồng ý bằng văn bản;"),
  text("c) Được cho thuê lại nhà đang thuê, nếu được bên cho thuê đồng ý bằng văn bản;"),
  text("d) Được thay đổi cấu trúc ngôi nhà nếu được bên A đồng ý bằng văn bản;"),
  text("e) Yêu cầu bên A sửa chữa nhà đang cho thuê trong trường hợp nhà bị hư hỏng nặng;"),
  text("g) Được ưu tiên ký hợp đồng thuê tiếp, nếu đã hết hạn thuê mà nhà vẫn dùng để cho thuê;"),
  text("h) Được ưu tiên mua nhà đang thuê, khi bên A thông báo về việc bán ngôi nhà;"),
  text("i) Đơn phương chấm dứt thực hiện hợp đồng thuê nhà nhưng phải báo cho bên A biết trước ít nhất 30 ngày nếu không có thỏa thuận khác và yêu cầu bồi thường thiệt hại nếu bên A có một trong các hành vi sau đây:"),
  text("- Không sửa chữa nhà ở khi có hư hỏng nặng;"),
  text("- Tăng giá thuê nhà ở bất hợp lý hoặc tăng giá thuê mà không thông báo cho bên thuê nhà ở biết trước theo thỏa thuận;"),
  text("- Quyền sử dụng nhà ở bị hạn chế do lợi ích của người thứ ba."),

  ...article("ĐIỀU 6. QUYỀN TIẾP TỤC THUÊ NHÀ Ở"),
  text("6.1. Trường hợp chủ sở hữu nhà ở chết mà thời hạn thuê nhà ở vẫn còn thì bên B được tiếp tục thuê đến hết hạn hợp đồng. Người thừa kế có trách nhiệm tiếp tục thực hiện hợp đồng thuê nhà ở đã ký kết trước đó, trừ trường hợp các bên có thỏa thuận khác. Trường hợp chủ sở hữu không có người thừa kế hợp pháp theo quy định của pháp luật thì nhà ở đó thuộc quyền sở hữu của Nhà nước và người đang thuê nhà ở được tiếp tục thuê theo quy định về quản lý, sử dụng nhà ở thuộc sở hữu nhà nước."),
  text("6.2. Trường hợp chủ sở hữu nhà ở chuyển quyền sở hữu nhà ở đang cho thuê cho người khác mà thời hạn thuê nhà ở vẫn còn thì bên B được tiếp tục thuê đến hết hạn hợp đồng; chủ sở hữu nhà ở mới có trách nhiệm tiếp tục thực hiện hợp đồng thuê nhà ở đã ký kết trước đó, trừ trường hợp các bên có thỏa thuận khác."),
  text("6.3. Khi bên B chết mà thời hạn thuê nhà ở vẫn còn thì người đang cùng sinh sống với bên B được tiếp tục thuê đến hết hạn hợp đồng thuê nhà ở, trừ trường hợp thuê nhà ở công vụ hoặc các bên có thỏa thuận khác hoặc pháp luật có quy định khác."),

  ...article("ĐIỀU 7. TRÁCH NHIỆM DO VI PHẠM HỢP ĐỒNG"),
  text("Trong quá trình thực hiện hợp đồng mà phát sinh tranh chấp, các bên cùng nhau thương lượng giải quyết; trong trường hợp không tự giải quyết được, cần phải thực hiện bằng cách hòa giải; nếu hòa giải không thành thì đưa ra Tòa án có thẩm quyền theo quy định của pháp luật."),

  ...article("ĐIỀU 8. CÁC THỎA THUẬN KHÁC"),
  text("8.1. Việc sửa đổi, bổ sung hoặc hủy bỏ hợp đồng này phải lập thành văn bản mới có giá trị để thực hiện."),
  text("8.2. Việc chấm dứt hợp đồng thuê nhà ở được thực hiện khi có một trong các trường hợp sau đây:"),
  text("a) Hợp đồng thuê nhà ở hết hạn; trường hợp trong hợp đồng không xác định thời hạn thì hợp đồng chấm dứt sau 90 ngày, kể từ ngày bên A thông báo cho bên B biết việc chấm dứt hợp đồng;"),
  text("b) Nhà ở cho thuê không còn;"),
  text("c) Nhà ở cho thuê bị hư hỏng nặng, có nguy cơ sập đổ hoặc thuộc khu vực đã có quyết định thu hồi đất, giải tỏa nhà ở hoặc có quyết định phá dỡ của cơ quan nhà nước có thẩm quyền; nhà ở cho thuê thuộc diện bị Nhà nước trưng mua, trưng dụng để sử dụng vào các mục đích khác. Bên A phải thông báo bằng văn bản cho bên B biết trước 30 ngày về việc chấm dứt hợp đồng thuê nhà ở quy định tại điểm này, trừ trường hợp các bên có thỏa thuận khác;"),
  text("d) Hai bên thoả thuận chấm dứt hợp đồng trước thời hạn;"),
  text("e) Bên B chết hoặc có tuyên bố mất tích của Tòa án mà khi chết, mất tích không có ai đang cùng chung sống;"),
  text("f) Chấm dứt khi một trong các bên đơn phương chấm dứt thực hiện hợp đồng thuê nhà ở."),
  area("otherAgreements", "8.3. Các thỏa thuận khác (nếu có):"),

  ...article("ĐIỀU 9. CAM KẾT CỦA CÁC BÊN"),
  text("Bên A và bên B chịu trách nhiệm trước pháp luật về những lời cùng cam kết sau đây:"),
  text("9.1. Đã khai đúng sự thật và tự chịu trách nhiệm về tính chính xác của những thông tin về nhân thân đã ghi trong hợp đồng này."),
  text("9.2. Thực hiện đúng và đầy đủ tất cả những thỏa thuận đã ghi trong hợp đồng này; nếu bên nào vi phạm mà gây thiệt hại, thì phải bồi thường cho bên kia hoặc cho người thứ ba (nếu có)."),
  text("Trong quá trình thực hiện nếu phát hiện thấy những vấn đề cần thoả thuận thì hai bên có thể lập thêm Phụ lục hợp đồng. Nội dung Phụ lục hợp đồng có giá trị pháp lý như hợp đồng chính."),
  text("9.3. Hợp đồng này có giá trị kể từ ngày hai bên ký kết."),
  field("copiesInfo", "Hợp đồng được lập thành … (…) bản, mỗi bên giữ một bản và có giá trị như nhau. Số bản:"),
  spacer(16),
  signatureBlock(),
];

/** Fills A4 sheets top to bottom; a block that no longer fits moves to the next sheet. */
export function leaseContractVi(): AgreementDocument {
  const groups: Item[][] = [[]];
  let used = 0;
  for (const it of items) {
    if (used + it.cost > PAGE_BUDGET_PX && groups[groups.length - 1].length > 0) {
      groups.push([]);
      used = 0;
    }
    // a spacer at the top of a sheet only wastes room
    if (it.type === "Spacer" && used === 0) continue;
    groups[groups.length - 1].push(it);
    used += it.cost;
  }
  const pages = groups.map((g, i) => {
    const id = `page-${i + 1}`;
    return {
      content: [{ type: "Content", props: { id, ...DEFAULT_PAGE_PROPS } }],
      root: { props: {} },
      zones: { [`${id}:content`]: g.map(({ type, props }) => ({ type, props })), ...Object.assign({}, ...g.map((it) => it.zones ?? {})) },
    } as TemplatePage;
  });
  return { pages };
}
