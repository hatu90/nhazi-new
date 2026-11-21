import { DEFAULT_PAGE_PROPS } from "./config";
import type { AgreementDocument, TemplatePage, TextInputProps, TextProps } from "./types";

/**
 * Vietnamese residential lease (Phụ lục II – Hợp đồng thuê nhà ở).
 * Fixed legal wording is Text; every blank of the paper form is a TextInput that is filled in on each lease.
 */

type Item = { type: "Text" | "TextInput" | "Spacer"; props: Record<string, unknown>; cost: number };

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
const area = (name: string, label: string, rows = 2) => field(name, label, { inputType: "textarea", rows });

const items: Item[] = [
  text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { weight: "bold", align: "center", fontSize: 15 }),
  text("Độc lập - Tự do - Hạnh phúc", { weight: "bold", align: "center", fontSize: 14 }),
  text("________________________", { align: "center" }),
  field("signedAt", "Địa điểm, ngày … tháng … năm …:"),
  spacer(10),
  text("HỢP ĐỒNG THUÊ NHÀ Ở", { weight: "bold", align: "center", fontSize: 16 }),
  field("contractNo", "Số:"),
  spacer(8),
  text("Căn cứ Bộ luật Dân sự ngày 24 tháng 11 năm 2015;"),
  text("Căn cứ Luật Kinh doanh bất động sản ngày 28 tháng 11 năm 2023;"),
  field("decreeNo", "Căn cứ Nghị định số … /… /NĐ-CP ngày … tháng … năm … của Chính phủ quy định chi tiết một số điều của Luật Kinh doanh bất động sản:"),
  field("otherBasis", "Căn cứ khác¹:"),
  field("projectDocs", "Căn cứ các văn bản, hồ sơ pháp lý dự án:"),
  text("Hai bên chúng tôi gồm:"),

  ...article("I. BÊN CHO THUÊ NHÀ Ở (sau đây gọi tắt là Bên cho thuê):"),
  field("landlordName", "- Tên tổ chức, cá nhân²:"),
  field("landlordBusinessReg", "- Giấy chứng nhận đăng ký doanh nghiệp/Giấy chứng nhận đăng ký đầu tư số:"),
  field("landlordRepresentative", "- Người đại diện theo pháp luật:"),
  field("landlordPosition", "  Chức vụ:"),
  text("(Trường hợp là người đại diện theo ủy quyền thì ghi) theo giấy ủy quyền (văn bản ủy quyền) số … (nếu có). Thẻ căn cước công dân (hộ chiếu) số: … cấp ngày: …/…/…, tại …"),
  field("landlordAuthorization", "  Giấy ủy quyền / CCCD (hộ chiếu) số, ngày cấp, nơi cấp:"),
  field("landlordAddress", "- Địa chỉ:"),
  field("landlordPhone", "- Điện thoại liên hệ:"),
  field("landlordFax", "  Fax:"),
  field("landlordBankAccount", "- Số tài khoản:"),
  field("landlordBank", "  Tại Ngân hàng:"),
  field("landlordTaxCode", "- Mã số thuế:"),

  ...article("II. BÊN THUÊ NHÀ Ở (sau đây gọi tắt là Bên thuê):"),
  field("tenantName", "- Tên tổ chức, cá nhân³:"),
  field("tenantIdNumber", "- Thẻ căn cước công dân/hộ chiếu⁴ số:"),
  field("tenantIdIssued", "  Cấp ngày …/…/…, tại:"),
  field("tenantResidence", "- Nơi đăng ký cư trú:"),
  field("tenantAddress", "- Địa chỉ liên hệ:"),
  field("tenantPhone", "- Điện thoại liên hệ:"),
  field("tenantFax", "  Fax (nếu có):"),
  field("tenantBankAccount", "- Số tài khoản (nếu có):"),
  field("tenantBank", "  Tại Ngân hàng:"),
  field("tenantTaxCode", "- Mã số thuế (nếu có):"),
  spacer(6),
  text("Hai bên chúng tôi thống nhất ký kết hợp đồng cho thuê nhà ở với các nội dung sau đây:"),

  ...article("Điều 1. Các thông tin về nhà ở cho thuê"),
  field("houseType", "1. Loại nhà ở (biệt thự, căn hộ chung cư, nhà ở riêng lẻ):"),
  area("houseLocation", "2. Vị trí, địa điểm nhà ở (đối với căn hộ chung cư ghi rõ: căn hộ số, tầng, nhà chung cư, đường/phố, phường/xã, quận/huyện/thị xã, tỉnh/thành phố):"),
  field("houseCondition", "3. Hiện trạng về chất lượng nhà ở:"),
  text("4. Diện tích của nhà ở:"),
  field("floorArea", "- Tổng diện tích sàn xây dựng nhà ở:", { unit: "m²" }),
  field("landArea", "- Tổng diện tích sử dụng đất:", { unit: "m²" }),
  field("landAreaPrivate", "  Sử dụng riêng:", { unit: "m²" }),
  field("landAreaShared", "  Sử dụng chung (nếu có):", { unit: "m²" }),
  field("landPurpose", "  Mục đích sử dụng đất:"),
  field("houseFunction", "5. Công năng sử dụng:"),
  area("houseEquipment", "6. Trang thiết bị kèm theo:"),

  ...article("Điều 2. Giá thuê nhà ở"),
  field("rentPrice", "1. Giá thuê nhà ở là (Việt Nam đồng/tháng hoặc Việt Nam đồng/năm):"),
  field("rentPriceInWords", "   Bằng chữ:"),
  text("Giá thuê này đã bao gồm: chi phí bảo trì, quản lý vận hành nhà ở và các khoản thuế mà Bên cho thuê phải nộp cho Nhà nước theo quy định (do các bên thỏa thuận):"),
  field("rentIncludes", ""),
  text("2. Các chi phí sử dụng điện, nước, điện thoại và các dịch vụ khác do Bên thuê thanh toán cho bên cung cấp điện, nước, điện thoại và các cơ quan cung cấp dịch vụ khác."),
  field("rentOtherTerms", "3. Các thỏa thuận khác (nếu có):"),

  ...article("Điều 3. Phương thức và thời hạn thanh toán"),
  text("1. Phương thức thanh toán: Thanh toán bằng tiền Việt Nam thông qua hình thức chuyển khoản qua ngân hàng hoặc hình thức khác theo quy định của pháp luật:"),
  field("paymentMethod", ""),
  field("paymentDeadline", "2. Thời hạn thực hiện thanh toán:"),
  field("paymentOtherTerms", "3. Các thỏa thuận khác (nếu có):"),

  ...article("Điều 4. Thời hạn cho thuê, thời điểm giao, nhận nhà ở cho thuê và hồ sơ kèm theo"),
  field("leaseTerm", "1. Thời hạn cho thuê nhà ở:"),
  field("handoverDate", "2. Thời điểm giao nhận nhà ở: Ngày … tháng … năm …:"),
  field("attachedDocs", "3. Hồ sơ kèm theo:"),

  ...article("Điều 5. Sử dụng nhà ở thuê"),
  field("usePurpose", "1. Mục đích sử dụng nhà ở của bên thuê:"),
  field("useRestrictions", "2. Các hạn chế sử dụng nhà ở:"),
  field("serviceFees", "3. Đóng phí dịch vụ, phí quản lý vận hành:"),
  field("houseRules", "4. Ban hành và tuân thủ nội quy, quy chế quản lý vận hành của khu nhà ở, dự án:"),
  area("useOtherTerms", "5. Các thỏa thuận khác (nếu có) (các thỏa thuận này phải không trái luật và không trái đạo đức xã hội):"),

  ...article("Điều 6. Quyền và nghĩa vụ của bên cho thuê"),
  text("1. Quyền của bên cho thuê (theo Điều 18 của Luật Kinh doanh bất động sản):"),
  text("a) Yêu cầu bên thuê nhận nhà ở theo thời hạn đã thỏa thuận tại Điều 4 của Hợp đồng này;"),
  text("b) Yêu cầu bên thuê thanh toán đủ tiền theo thời hạn và phương thức thỏa thuận tại Điều 3 của Hợp đồng này;"),
  text("c) Yêu cầu bên thuê bảo quản, sử dụng nhà ở theo đúng hiện trạng đã liệt kê tại Điều 1 của Hợp đồng này;"),
  text("d) Yêu cầu bên thuê bồi thường thiệt hại hoặc sửa chữa phần hư hỏng do lỗi của bên thuê gây ra;"),
  text("đ) Cải tạo, nâng cấp nhà ở cho thuê khi được bên thuê đồng ý nhưng không được gây ảnh hưởng cho bên thuê;"),
  text("e) Đơn phương chấm dứt thực hiện hợp đồng theo quy định tại điểm g khoản 2 Điều 18 của Luật Kinh doanh bất động sản;"),
  text("g) Yêu cầu bên thuê giao lại nhà ở khi hết thời hạn thuê;"),
  area("landlordOtherRights", "h) Các quyền khác do các bên thỏa thuận (nếu có) (các thỏa thuận này phải không trái luật và không trái đạo đức xã hội):"),
  text("2. Nghĩa vụ của Bên cho thuê (theo Điều 19 của Luật Kinh doanh bất động sản):"),
  text("a) Giao nhà ở cho bên thuê theo thỏa thuận trong hợp đồng và hướng dẫn bên thuê sử dụng nhà ở theo đúng công năng, thiết kế tại Điều 1 của Hợp đồng này;"),
  text("b) Bảo đảm cho bên thuê sử dụng ổn định nhà ở trong thời hạn thuê;"),
  text("c) Bảo trì, sửa chữa nhà ở theo định kỳ hoặc theo thỏa thuận; nếu bên cho thuê không bảo trì, sửa chữa nhà ở mà gây thiệt hại cho bên thuê thì phải bồi thường;"),
  text("d) Không được đơn phương chấm dứt hợp đồng khi bên thuê thực hiện đúng nghĩa vụ theo hợp đồng, trừ trường hợp được bên thuê đồng ý chấm dứt hợp đồng;"),
  text("đ) Bồi thường thiệt hại do lỗi của mình gây ra;"),
  text("e) Thực hiện nghĩa vụ tài chính với Nhà nước theo quy định của pháp luật;"),
  area("landlordOtherDuties", "g) Các nghĩa vụ khác do hai bên thỏa thuận (nếu có) (các thỏa thuận này phải không trái luật và không trái đạo đức xã hội):"),

  ...article("Điều 7. Quyền và nghĩa vụ của bên thuê"),
  text("1. Quyền của bên thuê (theo Điều 20 của Luật Kinh doanh bất động sản):"),
  text("a) Yêu cầu bên cho thuê giao nhà ở theo đúng hiện trạng đã liệt kê tại Điều 1 của Hợp đồng này;"),
  text("b) Yêu cầu bên cho thuê cung cấp thông tin đầy đủ, trung thực về nhà ở;"),
  text("c) Được đổi nhà ở đang thuê với người thuê khác nếu được bên cho thuê đồng ý bằng văn bản;"),
  text("d) Được cho thuê lại một phần hoặc toàn bộ nhà ở nếu có thỏa thuận trong hợp đồng hoặc được bên cho thuê đồng ý bằng văn bản;"),
  text("đ) Được tiếp tục thuê theo các điều kiện đã thỏa thuận với bên cho thuê trong trường hợp thay đổi chủ sở hữu;"),
  text("e) Yêu cầu bên cho thuê sửa chữa nhà ở trong trường hợp nhà ở bị hư hỏng không phải do lỗi của mình gây ra;"),
  text("g) Yêu cầu bên cho thuê bồi thường thiệt hại do lỗi của bên cho thuê gây ra;"),
  text("h) Đơn phương chấm dứt thực hiện hợp đồng theo quy định tại điểm g khoản 2 Điều 20 của Luật Kinh doanh bất động sản;"),
  area("tenantOtherRights", "i) Các quyền khác do hai bên thỏa thuận (nếu có) (các thỏa thuận này phải không trái luật và không trái đạo đức xã hội):"),
  text("2. Nghĩa vụ của Bên thuê (theo Điều 21 của Luật Kinh doanh bất động sản):"),
  text("a) Bảo quản, sử dụng nhà ở đúng công năng, thiết kế đã liệt kê tại Điều 1 và các thỏa thuận trong hợp đồng;"),
  text("b) Thanh toán đủ tiền thuê nhà ở theo thời hạn và phương thức thỏa thuận tại Điều 3 và Điều 4 của Hợp đồng này;"),
  text("c) Sử dụng nhà ở đúng mục đích và sửa chữa hư hỏng của nhà ở do lỗi của mình gây ra;"),
  text("d) Trả nhà ở cho bên cho thuê theo đúng thỏa thuận trong hợp đồng;"),
  text("đ) Không được thay đổi, cải tạo, phá dỡ nhà ở nếu không có sự đồng ý bằng văn bản của bên cho thuê;"),
  text("e) Bồi thường thiệt hại do lỗi của mình gây ra;"),
  area("tenantOtherDuties", "g) Các nghĩa vụ khác do hai bên thỏa thuận (nếu có) (các thỏa thuận này phải không trái luật và không trái đạo đức xã hội):"),

  ...article("Điều 8. Trách nhiệm do vi phạm hợp đồng"),
  field("landlordBreach", "1. Trách nhiệm của bên cho thuê khi vi phạm hợp đồng:"),
  field("tenantBreach", "2. Trách nhiệm của bên thuê khi vi phạm hợp đồng:"),
  text("3. Các trường hợp bất khả kháng: Bên thuê hoặc Bên cho thuê không bị coi là vi phạm hợp đồng và không bị phạt hoặc không phải chịu trách nhiệm bồi thường thiệt hại nếu việc chậm thực hiện hoặc không thực hiện các nghĩa vụ được các bên thỏa thuận trong hợp đồng này do có sự kiện bất khả kháng như thiên tai, chiến tranh, sự thay đổi quy định pháp luật và các trường hợp khác mà không phải do lỗi của các Bên gây ra."),
  area("breachOtherTerms", "4. Các thỏa thuận khác (nếu có) (các thỏa thuận này phải không trái luật và không trái đạo đức xã hội):"),

  ...article("Điều 9. Phạt vi phạm hợp đồng"),
  field("penalty", "Do các bên thỏa thuận:"),

  ...article("Điều 10. Các trường hợp chấm dứt hợp đồng và các biện pháp xử lý"),
  text("1. Các trường hợp chấm dứt hợp đồng:"),
  text("a) Hai bên đồng ý chấm dứt hợp đồng. Trong trường hợp này, hai bên lập văn bản thỏa thuận cụ thể các điều kiện và thời hạn chấm dứt hợp đồng;"),
  text("b) Bên thuê chậm thanh toán tiền thuê theo thỏa thuận tại Điều 3 của hợp đồng này;"),
  text("c) Bên cho thuê chậm bàn giao nhà ở theo thỏa thuận tại Điều 4 của hợp đồng này;"),
  field("forceMajeureDays", "d) Trong trường hợp bên bị tác động bởi sự kiện bất khả kháng không thể khắc phục được để tiếp tục thực hiện nghĩa vụ của mình trong thời hạn (ngày) kể từ ngày xảy ra sự kiện bất khả kháng và hai bên cũng không có thỏa thuận khác thì một trong hai bên có quyền đơn phương chấm dứt hợp đồng này và việc chấm dứt hợp đồng này không được coi là vi phạm hợp đồng:", { unit: "ngày", inputType: "textarea", rows: 1, labelPosition: "top" }),
  field("terminationConsequences", "2. Việc xử lý hậu quả do chấm dứt hợp đồng theo quy định tại khoản 1 Điều này như: hoàn trả lại tiền thuê, tính lãi, các khoản phạt và bồi thường … do hai bên thỏa thuận cụ thể:", { inputType: "textarea", rows: 2, labelPosition: "top" }),
  area("terminationOtherTerms", "3. Các thỏa thuận khác (nếu có) (các thỏa thuận này phải không trái luật và không trái đạo đức xã hội):"),

  ...article("Điều 11. Giải quyết tranh chấp"),
  text("Các bên có trách nhiệm thỏa thuận cụ thể cách thức, hình thức giải quyết tranh chấp về các nội dung của hợp đồng khi có tranh chấp phát sinh và lựa chọn (cơ quan Tòa án) để giải quyết theo quy định pháp luật khi hai bên không tự thỏa thuận giải quyết được:"),
  field("disputeCourt", ""),

  ...article("Điều 12. Hiệu lực của hợp đồng"),
  field("effectiveFrom", "1. Hợp đồng này có hiệu lực kể từ ngày:"),
  text("2. Hợp đồng này có … điều, với … trang, được lập thành … bản và có giá trị pháp lý như nhau, Bên mua giữ … bản, Bên bán giữ … bản để lưu trữ, làm thủ tục nộp thuế, phí, lệ phí theo quy định của pháp luật."),
  field("copiesInfo", "   Số điều, số trang, số bản, số bản mỗi bên giữ:"),
  field("houseDocuments", "3. Kèm theo hợp đồng này các giấy tờ về nhà ở:"),
  text("Các phụ lục đính kèm hợp đồng này và các sửa đổi, bổ sung theo thỏa thuận của hai bên là nội dung không tách rời hợp đồng này và có hiệu lực thi hành đối với hai bên."),
  text("4. Trong trường hợp các bên thỏa thuận thay đổi nội dung của hợp đồng này thì phải lập bằng văn bản có chữ ký của cả hai bên."),
  spacer(16),
  text("BÊN THUÊ\n(Ký, ghi rõ họ tên; nếu là tổ chức thì ghi rõ chức vụ người ký và đóng dấu)", { align: "start", weight: "bold" }),
  spacer(60),
  text("BÊN CHO THUÊ\n(Ký, ghi rõ họ tên, chức vụ người ký và đóng dấu)", { align: "start", weight: "bold" }),
  spacer(60),
  text("________________________"),
  text("¹ Ghi các căn cứ liên quan đến việc cho thuê nhà ở. Trường hợp Nhà nước có sửa đổi, thay thế các văn bản pháp luật ghi tại phần căn cứ của hợp đồng này thì bên bán phải ghi lại theo số, tên văn bản mới đã thay đổi.", { fontSize: 11 }),
  text("² Ghi tên doanh nghiệp, cá nhân cho nhà ở; nếu là cá nhân thì không cần có các nội dung về Giấy chứng nhận đăng ký doanh nghiệp/Giấy chứng nhận đăng ký đầu tư, người đại diện pháp luật của doanh nghiệp.", { fontSize: 11 }),
  text("³ Nếu là tổ chức thì ghi các thông tin về tổ chức; nếu là cá nhân thì ghi các thông tin về cá nhân, nếu có nhiều người mua là cá nhân cùng đứng tên trong hợp đồng thì tại mục này phải ghi đầy đủ thông tin về những người cùng thuê nhà ở; không cần có các nội dung về Giấy chứng nhận đăng ký doanh nghiệp/Giấy chứng nhận đăng ký đầu tư, người đại diện pháp luật của doanh nghiệp.", { fontSize: 11 }),
  text("⁴ Nếu là tổ chức thì ghi số Giấy chứng nhận đăng ký doanh nghiệp hoặc Giấy chứng nhận đăng ký đầu tư.", { fontSize: 11 }),
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
      zones: { [`${id}:content`]: g.map(({ type, props }) => ({ type, props })) },
    } as TemplatePage;
  });
  return { pages };
}
