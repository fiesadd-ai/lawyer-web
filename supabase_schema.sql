-- ==============================================================================
-- คำสั่ง SQL สำหรับสร้างตารางบน Supabase (Run this script in Supabase SQL Editor)
-- สำนักงานทนายความชั้น 1 (รับว่าความทั่วราชอาณาจักร)
-- ==============================================================================

-- 1. สร้างตาราง "appointments" สำหรับเก็บข้อมูลการจองคิวปรึกษากฎหมาย
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    fullname TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT '-',
    case_type TEXT NOT NULL,
    consult_type TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TEXT NOT NULL,
    details TEXT DEFAULT '-',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. สร้างตาราง "site_settings" สำหรับเก็บข้อมูลสายด่วน เวลาทำการ แผนที่ และเนื้อหา CMS
CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY,
    hotline TEXT NOT NULL,
    business_hours TEXT NOT NULL,
    settings_json TEXT DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ปรับปรุงคอลัมน์ settings_json กรณีสร้างตารางไว้ก่อนหน้าแล้ว
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS settings_json TEXT DEFAULT '{}';

-- 3. เพิ่มข้อมูลเริ่มต้นสำหรับ site_settings
INSERT INTO site_settings (id, hotline, business_hours, settings_json)
VALUES (
    'main',
    '073-xxx-xxx, 081-234-5678 (เบอร์กลางสำนักงาน)',
    'เปิดทุกวัน 06:00 - 18:00 น. (หมายเหตุ: นอกจากไม่ว่างหรือติดธุระส่วนตัวข้างนอก สำนักงานจะปิด)',
    '{"maps_url":"https://maps.app.goo.gl/2ukUyWUSAMQPn3DYA","maps_embed":"https://maps.google.com/maps?q=6.8506101,101.2548708&hl=th&z=17&output=embed","office_phone":"073-xxx-xxx","line_id":"@lawyer1th","office_address":"ทนายความ รอสนั่น อีซอ อำเภอเมืองปัตตานี จังหวัดปัตตานี"}'
)
ON CONFLICT (id) DO NOTHING;

-- 4. เปิดใช้งาน Row Level Security (RLS) และอนุญาตให้เข้าถึงผ่าน Anon / Publishable Key
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- ลบนโยบายเดิมหากมีอยู่ เพื่อสร้างใหม่ให้สมบูรณ์
DROP POLICY IF EXISTS "Allow public select appointments" ON appointments;
DROP POLICY IF EXISTS "Allow public insert appointments" ON appointments;
DROP POLICY IF EXISTS "Allow public update appointments" ON appointments;
DROP POLICY IF EXISTS "Allow public delete appointments" ON appointments;
DROP POLICY IF EXISTS "Allow public select site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow public insert/update site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow public all site_settings" ON site_settings;

-- นโยบาย (Policies) สำหรับ appointments: อนุญาตให้ select, insert, update, delete ได้อย่างอิสระ
CREATE POLICY "Allow public select appointments" ON appointments FOR SELECT USING (true);
CREATE POLICY "Allow public insert appointments" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update appointments" ON appointments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete appointments" ON appointments FOR DELETE USING (true);

-- นโยบาย (Policies) สำหรับ site_settings: อนุญาตให้อ่านและบันทึก/upsert ได้ 100%
CREATE POLICY "Allow public select site_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert site_settings" ON site_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update site_settings" ON site_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all site_settings" ON site_settings FOR ALL USING (true) WITH CHECK (true);

