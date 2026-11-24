-- Restore the default verification criteria (seeded in 0014) that were deleted. Idempotent: a criterion that already exists (same name) is left alone.
INSERT INTO "verification_criteria" ("name", "name_en", "description", "description_en", "sort_order")
SELECT v."name", v."name_en", v."description", v."description_en", v."sort_order"
FROM (VALUES
  ('Đã đăng ký hộ kinh doanh', 'Registered business household', 'Có giấy đăng ký hộ kinh doanh cho hoạt động cho thuê.', 'Holds a business-household registration for the rental activity.', 1),
  ('Đảm bảo phòng cháy chữa cháy', 'Fire safety', 'Có thiết bị PCCC, lối thoát hiểm và đáp ứng quy định.', 'Fire equipment and escape routes are in place and meet regulations.', 2),
  ('Đảm bảo vệ sinh', 'Hygiene', 'Khu vực chung và phòng được giữ sạch sẽ, có xử lý rác.', 'Common areas and rooms are kept clean, with waste handled.', 3),
  ('Đảm bảo an ninh', 'Security', 'Có biện pháp an ninh: khóa, camera, kiểm soát ra vào.', 'Security measures in place: locks, cameras, access control.', 4),
  ('Niêm yết giá, dịch vụ đầy đủ', 'Prices and services fully listed', 'Giá thuê và toàn bộ dịch vụ được niêm yết công khai.', 'Rent and all services are publicly listed.', 5)
) AS v("name", "name_en", "description", "description_en", "sort_order")
WHERE NOT EXISTS (SELECT 1 FROM "verification_criteria" c WHERE c."name" = v."name");
