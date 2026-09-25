/**
 * สคริปต์หลักและระบบจัดการข้อมูลจำลอง (Main Script & LocalStorage Store)
 * สำนักงานทนายความชั้น 1 (รับว่าความทั่วราชอาณาจักร)
 * รองรับการทำงานแบบ Static Site 100% บน GitHub Pages
 */

const STORAGE_KEY = 'lawyer_office_bookings';
const ACTIVITY_STORAGE_KEY = 'lawyer_activity_logs';

// ==========================================================================
// ระบบติดตามและบันทึกความเคลื่อนไหว (Real-time Activity Tracking & Logging)
// ==========================================================================

/**
 * บันทึกความเคลื่อนไหวลงใน Console อย่างสวยงาม และจัดเก็บใน LocalStorage
 * @param {string} action - ชื่อกิจกรรม เช่น "เข้าชมหน้าเว็บ", "กดโทรสายด่วน", "ยื่นจองคิวใหม่"
 * @param {string} details - รายละเอียดเพิ่มเติม
 * @param {string} type - หมวดหมู่: 'visit' | 'click' | 'booking' | 'status' | 'cms' | 'auth' | 'system'
 * @param {string} icon - ไอคอน emoji เช่น '🌐', '📞', '📝', '⚙️', '💾', '🔐'
 */
function logActivity(action, details = '', type = 'system', icon = '⚡') {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss
  const dateFormatted = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const id = 'ACT-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);

  // 1. แสดงผลลงใน Browser Console ด้วยป้าย Badge สวยงามสะดุดตา
  const colorMap = {
    visit: '#0284c7',    // สีฟ้าสดใส: การเข้าชมหน้า
    click: '#059669',    // สีเขียวมรกต: การกดโทร / ลิงก์
    booking: '#d97706',  // สีทองส้ม: ลูกค้ายื่นจองคิว
    status: '#7c3aed',   // สีม่วง: แอดมินเปลี่ยนสถานะ / จัดการคิว
    cms: '#0891b2',      // สีฟ้าอมเขียว: บันทึกการตั้งค่าเว็บ
    auth: '#4f46e5',     // สีคราม: เข้า/ออกจากระบบ
    system: '#475569'    // สีเทาเข้ม: ระบบทั่วไป
  };
  const badgeColor = colorMap[type] || '#0284c7';
  
  try {
    console.log(
      `%c[ความเคลื่อนไหว]%c ${timeStr} %c${icon ? icon + ' ' : ''}${action}%c ${details || ''}`,
      `background: ${badgeColor}; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;`,
      'color: #64748b; font-weight: 500; font-size: 11px;',
      'color: #0f172a; font-weight: 700; font-size: 12px;',
      'color: #334155; font-size: 12px;'
    );
  } catch(e) {}

  // 2. บันทึกลงใน localStorage
  const entry = {
    id: id,
    timestamp: now.toISOString(),
    timeFormatted: timeStr,
    dateFormatted: dateFormatted,
    action: action,
    details: details,
    type: type,
    icon: icon,
    page: (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '') || 'index.html'
  };

  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift(entry);
    if (logs.length > 50) logs.length = 50; // เก็บ 50 รายการล่าสุด
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(logs));
  } catch(e) {}

  // 3. ยิง CustomEvent เพื่อให้อัปเดตตาราง Feed ทันทีแบบเรียลไทม์
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lawyer_activity_logged', { detail: entry }));
    }
  } catch(e) {}

  return entry;
}

// ดึงรายการความเคลื่อนไหวทั้งหมด
function getActivityLogs() {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    return [];
  }
}

// ล้างประวัติความเคลื่อนไหว
function clearActivityLogs() {
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify([]));
  try {
    window.dispatchEvent(new CustomEvent('lawyer_activity_logged', { detail: null }));
  } catch(e) {}
  logActivity('ล้างประวัติความเคลื่อนไหว', 'ประวัติความเคลื่อนไหวในระบบถูกรีเซ็ตเรียบร้อยแล้ว', 'system', '🗑️');
  return true;
}

// ผูกเข้ากับ window สำหรับเรียกใช้ข้ามไฟล์
if (typeof window !== 'undefined') {
  window.logActivity = logActivity;
  window.getActivityLogs = getActivityLogs;
  window.clearActivityLogs = clearActivityLogs;
}

// รายการนัดหมายเริ่มต้น
const INITIAL_BOOKINGS = [];

// ดึงรายการทั้งหมดจาก Local Cache
function getBookings() {
  if (typeof localStorage === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse bookings from localStorage', e);
    return [];
  }
}

// แปลงชื่อสถานะเป็นภาษาไทย
function formatStatusText(status) {
  switch (status) {
    case 'pending': return 'รอดำเนินการ';
    case 'confirmed': return 'ยืนยันแล้ว';
    case 'completed': return 'เสร็จสิ้น';
    case 'cancelled': return 'ยกเลิก';
    default: return status || 'ไม่ระบุ';
  }
}

// เพิ่มหรืออัปเดตรายการจอง
function addBooking(newBooking) {
  const bookings = getBookings();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = newBooking.id || `BK-${dateStr}-${randomSuffix}`;
  const created_at = newBooking.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19);

  const fullBooking = {
    id: id,
    fullname: newBooking.fullname || '',
    phone: newBooking.phone || '',
    email: newBooking.email || '-',
    case_type: newBooking.case_type || 'คดีทั่วไป',
    consult_type: newBooking.consult_type || 'office',
    booking_date: newBooking.booking_date || '',
    booking_time: newBooking.booking_time || '',
    details: newBooking.details || '-',
    status: newBooking.status || 'pending',
    created_at: created_at
  };

  const existingIdx = bookings.findIndex(b => b.id === id);
  if (existingIdx !== -1) {
    bookings[existingIdx] = fullBooking;
  } else {
    bookings.unshift(fullBooking);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));

  logActivity(
    existingIdx !== -1 ? 'แก้ไขข้อมูลนัดหมาย' : 'ยื่นจองคิวใหม่',
    `รหัส ${fullBooking.id} • คุณ${fullBooking.fullname} (${fullBooking.case_type}) วันที่ ${fullBooking.booking_date}`,
    'booking',
    '📝'
  );

  return fullBooking;
}

// อัปเดตสถานะ
function updateBookingStatus(id, newStatus) {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index !== -1) {
    bookings[index].status = newStatus;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));

    logActivity(
      'เปลี่ยนสถานะการนัดหมาย',
      `รหัส ${id} ➔ ${formatStatusText(newStatus)}`,
      'status',
      '⚙️'
    );
    return true;
  }
  return false;
}

// ลบรายการ
function deleteBooking(id) {
  let bookings = getBookings();
  const initialLength = bookings.length;
  bookings = bookings.filter(b => b.id !== id);
  if (bookings.length !== initialLength) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));

    logActivity(
      'ลบรายการนัดหมาย',
      `รหัส ${id} ถูกลบออกจากระบบ`,
      'status',
      '🗑️'
    );
    return true;
  }
  return false;
}

// รีเซ็ตข้อมูลกลับสู่ค่าเริ่มต้น
function resetBookings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BOOKINGS));
  logActivity('รีเซ็ตข้อมูลนัดหมาย', 'รีเซ็ตข้อมูลคิวกลับสู่ค่าว่าง', 'status', '↺');
  return [...INITIAL_BOOKINGS];
}

// ตัวช่วยแปลงประเภทการปรึกษา
function formatConsultType(type) {
  switch (type) {
    case 'office':
      return '🏢 เข้าพบที่สำนักงาน';
    case 'online':
      return '💻 วิดีโอคอลออนไลน์';
    case 'phone':
      return '📞 โทรศัพท์สายตรง';
    default:
      return type || 'เข้าพบที่สำนักงาน';
  }
}

// ตัวช่วยแปลง Badge สถานะ
function formatStatusBadge(status) {
  switch (status) {
    case 'pending':
      return '<span class="status-badge pending">⏳ รอดำเนินการ</span>';
    case 'confirmed':
      return '<span class="status-badge confirmed">✓ ยืนยันแล้ว</span>';
    case 'completed':
      return '<span class="status-badge completed">★ เสร็จสิ้น</span>';
    case 'cancelled':
      return '<span class="status-badge cancelled">✕ ยกเลิก</span>';
    default:
      return `<span class="status-badge">${escapeHtml(status)}</span>`;
  }
}

// ฟังก์ชันแปลงข้อความป้องกัน XSS และ Escape ตัวอักษรพิเศษ
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ฟังก์ชัน Toast สวยงาม
function showToast(message, type = 'success') {
  if (typeof document === 'undefined') return;
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let iconSvg = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  `;

  if (type === 'error') {
    toast.style.borderLeftColor = '#ef4444';
    iconSvg = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `;
  }

  toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// ระบบจัดการการตั้งค่าหน้าเว็บไซต์แบบครบวงจร (Site Settings, Full CMS & Menu)
// ==========================================
const SETTINGS_STORAGE_KEY = 'lawyer_site_settings';
const DEFAULT_SITE_SETTINGS = {
  // 1. ระบบจัดการเบอร์โทรและช่องทางติดต่อ (ปลอดภัยสำหรับทนาย)
  hotline: '073-xxx-xxx, 081-234-5678 (เบอร์กลางสำนักงาน)',
  business_hours: 'เปิดทุกวัน 06:00 - 18:00 น. (หมายเหตุ: นอกจากไม่ว่างหรือติดธุระส่วนตัวข้างนอก สำนักงานจะปิด)',
  office_phone: '073-xxx-xxx',
  line_id: '@lawyer1th',
  line_title: 'ปรึกษาคดีด่วนทาง LINE',
  line_desc: 'แอดไลน์เพื่อส่งรูปเอกสาร สัญญา หรือหมายเรียก ให้ทนายตรวจดูเบื้องต้นได้ทันที',
  line_url: 'https://line.me',
  office_name: 'สำนักงานทนายความ รอสนั่น อีซอ (ทนายความชั้น 1 อาวุโส)',
  office_lawyer_name: 'ทนายความ รอสนั่น อีซอ',
  office_address: 'ทนายความ รอสนั่น อีซอ อำเภอเมืองปัตตานี จังหวัดปัตตานี (เน้นรับดูแลคดีในพื้นที่ ปัตตานี, นราธิวาส, สงขลา, หาดใหญ่ และยะลา)',
  visit_note: '🚗 พื้นที่รับงานและการเข้าพบ: ทนายความตั้งมั่นรับงานในเขตปัตตานีและ 4 จังหวัดข้างเคียง เพื่อดูแลคดีอย่างใกล้ชิดและทั่วถึง สำหรับท่านที่ต้องการเดินทางมาปรึกษาที่สำนักงาน กรุณานัดหมายคิวล่วงหน้าเพื่อเตรียมเอกสาร',
  maps_url: 'https://maps.app.goo.gl/2ukUyWUSAMQPn3DYA',
  maps_embed: 'https://maps.google.com/maps?q=6.8506101,101.2548708&hl=th&z=17&output=embed',
  maps_gps_text: 'พิกัด GPS: 6.8506101, 101.2548708 • ทนายความ รอสนั่น อีซอ',
  contact_quick_phone_title: 'โทรด่วนติดต่อทนายความ',
  contact_quick_phone_desc: 'พร้อมให้คำปรึกษาเบื้องต้นเพื่อประเมินแนวทางคดี และความคุ้มค่าก่อนรับว่าความ',

  // 2. หน้าแรก (Home Page)
  home_hero_title: 'ทนายความชั้น 1 ใบอนุญาตว่าความทั่วราชอาณาจักร',
  home_hero_subtitle: 'รับว่าความและที่ปรึกษากฎหมาย',
  home_hero_desc: 'มุ่งมั่นปกป้องสิทธิและผลประโยชน์สูงสุดของลูกความ ดำเนินคดีด้วยความซื่อสัตย์สุจริต โดยทนายความชั้น 1 ผู้มีประสบการณ์ว่าความจริงยาวนานกว่า 35 ถึงเกือบ 40 ปี เชี่ยวชาญคดีแพ่ง คดีอาญา มรดก ครอบครัว และที่ดิน เน้นรับดูแลคดีในพื้นที่จังหวัดปัตตานี และ 4 จังหวัดใกล้เคียงอย่างใกล้ชิด',
  home_start_price: 'เริ่มต้น 7,000 ฿',
  home_price_note: '* ค่าบริการเริ่มต้นที่ 7,000 บาท (ขึ้นอยู่กับประเภทและความยากง่ายของคดี ซึ่งบางคดีราคานี้เป็นไปได้)',
  home_exp_years: 'กว่า 35 - 40 ปี',
  home_license_issuer: 'สภาทนายความ ในพระบรมราชูปถัมภ์',
  home_license_lawyer_title: 'ทนายความผู้ดำเนินคดีประจำสำนักงาน',
  home_license_lawyer_qual: 'นิติศาสตรบัณฑิต, เนติบัณฑิตไทย (น.บ.ท.)',
  home_license_exp: 'กว่า 35 - 40 ปี',
  home_license_area: 'ปัตตานี และ 4 จว. ใกล้เคียง',
  home_license_status: '● ประจำการ / พร้อมให้คำปรึกษา',
  
  // จุดเด่น 4 ข้อ (Why Choose Us)
  home_feat1_title: 'ทนายความชั้น 1 ตัวจริง (35+ ปี)',
  home_feat1_desc: 'ว่าความโดยทนายความอาวุโสผู้ถือใบอนุญาตตลอดชีพชั้น 1 มีประสบการณ์ตรงในชั้นศาลยาวนานกว่า 35 ถึงเกือบ 40 ปี เชี่ยวชาญกลยุทธ์คดีอย่างรอบคอบ',
  home_feat2_title: 'เน้นปัตตานี & 4 จังหวัดใกล้เคียง',
  home_feat2_desc: 'รับดูแลคดีหลักใน จ.ปัตตานี และ 4 พื้นที่ใกล้เคียง: นราธิวาส, สงขลา, หาดใหญ่ และยะลา เพื่อให้เวลาและใส่ใจลูกความได้อย่างเต็มเม็ดเต็มหน่วย',
  home_feat3_title: 'รักษาความลับ 100%',
  home_feat3_desc: 'ข้อมูล ข้อเท็จจริง และเอกสารทุกชิ้นของลูกความจะถูกเก็บรักษาเป็นความลับสูงสุดตามมรรยาททนายความอย่างเคร่งครัด',
  home_feat4_title: 'ค่าบริการเริ่มต้นที่ 7,000 ฿',
  home_feat4_desc: 'ค่าบริการเริ่มต้นที่ 7,000 บาท ขึ้นอยู่กับประเภทและความยากง่ายของคดี (กรณีออกนอกพื้นที่หรือต่างจังหวัด ลูกค้าต้องเข้ามาพูดคุยตกลงรายละเอียดและราคากับทนายความโดยตรงที่สำนักงานเท่านั้น)',

  // แบนเนอร์จองคิวด่วนท้ายหน้าแรก
  home_cta_title: 'มีปัญหาทางกฎหมาย หรือต้องการปรึกษาคดีด่วน?',
  home_cta_desc: 'จองคิวรับคำปรึกษากับทนายความชั้น 1 ได้ทันที ทั้งแบบเดินทางมาที่สำนักงาน หรือทางวิดีโอคอลออนไลน์และโทรศัพท์',
  home_cta_btn_text: 'จองคิวออนไลน์ตอนนี้',
  home_cta_phone: 'โทรด่วน 081-234-5678',

  // 3. หน้าเกี่ยวกับเรา (About Page)
  about_title: 'ความน่าเชื่อถือและจรรยาบรรณวิชาชีพ',
  about_desc: 'ดำเนินงานโดยทนายความชั้น 1 อาวุโส ผู้มีใบอนุญาตว่าความประเภทตลอดชีพ ประสบการณ์ทำงานด้านกฎหมายยาวนานกว่า 35 ถึงเกือบ 40 ปี',
  about_section_title: 'ทนายความชั้น 1 อาวุโส ประจำสำนักงาน',
  about_section_desc: 'ประสบการณ์ว่าความและที่ปรึกษากฎหมายยาวนานกว่า 35 ถึงเกือบ 40 ปี เปี่ยมด้วยความเชี่ยวชาญและจริยธรรม',
  about_lawyer_name: 'ทนายความ ธนบดี นิติสิริ',
  about_lawyer_title: 'ทนายความชั้น 1 อาวุโส (ประเภทตลอดชีพ)',
  about_lawyer_exp: '⚖️ ประสบการณ์ 35+ ถึงเกือบ 40 ปี',
  about_lawyer_image: '',
  about_exp_heading: 'ประสบการณ์ว่าความและการทำงานด้านกฎหมาย',
  about_exp_item1: 'ทนายความชั้น 1 (ใบอนุญาตว่าความประเภทตลอดชีพ): สภาทนายความในพระบรมราชูปถัมภ์ มีสิทธิว่าความดำเนินคดีทุกศาลทั่วราชอาณาจักร',
  about_exp_item2: 'ประสบการณ์ในวิชาชีพยาวนานกว่า 35 ถึงเกือบ 40 ปี: ผ่านการว่าความคดีแพ่ง คดีอาญา คดีที่ดิน และคดีมรดก ในศาลชั้นต้น ศาลอุทธรณ์ และศาลฎีกา มาอย่างยาวนานต่อเนื่อง',
  about_exp_item3: 'ความคุ้นเคยอย่างลึกซึ้งในระบบศาลพื้นที่ภาคใต้: โดยเฉพาะศาลจังหวัดปัตตานี, ศาลจังหวัดสงขลา, ศาลแขวงสงขลา, ศาลจังหวัดนาทวี, ศาลจังหวัดยะลา, และศาลจังหวัดนราธิวาส',
  about_exp_item4: 'เชี่ยวชาญการตรวจเอกสารและวางรูปคดีอย่างรอบคอบ: วิเคราะห์จุดได้เปรียบ-เสียเปรียบ อย่างตรงไปตรงมา คดีไหนควรไกล่เกลี่ยหรือควรฟ้องร้อง ชี้แจงลูกความตามความจริง',
  about_cta_title: 'พร้อมให้คำปรึกษาและวางแนวทางคดีแก่ท่าน',
  about_cta_desc: 'สามารถนัดหมายเวลาเพื่อเข้าพบพูดคุยรายละเอียดข้อเท็จจริง หรือส่งเอกสารให้ทนายตรวจดูเบื้องต้นก่อนได้',

  // 4. หน้าบริการและเรทราคา (Services Page)
  services_title: 'บริการทางกฎหมาย & อัตราค่าวิชาชีพ',
  services_desc: 'ว่าความโดยทนายความชั้น 1 อาวุโส ประสบการณ์ยาวนานกว่า 35 - 40 ปี เน้นดูแลพื้นที่จังหวัดปัตตานี และ 4 จังหวัดใกล้เคียง ด้วยเรทราคาที่โปร่งใส เป็นธรรม และชัดเจน',
  services_area_heading: 'ขอบเขตพื้นที่รับว่าความและดำเนินคดี',
  services_area_note: 'เน้นรับงานในพื้นที่ปัตตานี และ 4 จังหวัดใกล้เคียง ได้แก่ นราธิวาส, สงขลา, หาดใหญ่, และยะลา เพื่อให้ทนายความสามารถทุ่มเทเวลาและใส่ใจติดตามรายละเอียดข้อเท็จจริงในสำนวนคดีของลูกความทุกท่านได้อย่างใกล้ชิด รัดกุม และมีประสิทธิภาพสูงสุด สำหรับคดีที่ต้องออกนอกพื้นที่หรือต่างจังหวัด ลูกค้าต้องเข้ามาพูดคุยตกลงรายละเอียดและราคากับทนายความโดยตรงที่สำนักงานเท่านั้น',
  services_start_price: 'เริ่มต้น 7,000 บาท',
  services_price_note: '* ค่าบริการเริ่มต้นที่ 7,000 บาท (ขึ้นอยู่กับประเภทและความยากง่ายของคดี ซึ่งบางคดีราคานี้เป็นไปได้)',
  services_province_note: '📢 "กรณีออกนอกพื้นที่หรือต่างจังหวัด ลูกค้าต้องเข้ามาพูดคุยตกลงรายละเอียดและราคากับทนายความโดยตรงที่สำนักงานเท่านั้น"',
  services_price_out_note: 'พิจารณาตามระยะทาง ค่าพาหนะเดินทาง และจำนวนนัดพิจารณาคดีจริง',

  // บริการ 5 หมวดคดีหลัก
  services_cat1_title: 'คดีแพ่งและพาณิชย์',
  services_cat1_sub: 'Civil & Commercial Cases',
  services_cat1_desc: 'รับว่าความฟ้องร้องและแก้ต่างข้อพิพาททางแพ่ง บังคับตามสัญญา เรียกเงินกู้ยืม ติดตามหนี้สิน ละเมิด และบังคับคดี',
  services_cat1_items: 'ฟ้องคดีสัญญากู้ยืมเงิน สัญญาจะซื้อจะขาย และเช็คเด้ง\nคดีฟ้องขับไล่ ข้อพิพาทเรื่องกรรมสิทธิ์ที่ดิน และภาระจำยอม\nคดีละเมิด อุบัติเหตุจราจร เรียกค่าสินไหมทดแทน\nสืบทรัพย์ บังคับคดี ยึดทรัพย์ และอายัดบัญชี',

  services_cat2_title: 'คดีอาญาทุกประเภท',
  services_cat2_sub: 'Criminal Defense & Prosecution',
  services_cat2_desc: 'ดำเนินคดีอาญาอย่างมืออาชีพ ทั้งในฐานะทนายโจทก์ฟ้องคดี และทนายจำเลยแก้ต่างเพื่อพิสูจน์ความบริสุทธิ์',
  services_cat2_items: 'คดียักยอก ฉ้อโกง บุกรุก เอกสารเท็จ\nคดีทำร้ายร่างกาย ประมาทเป็นเหตุให้ผู้อื่นถึงแก่ความตาย\nยื่นคำร้องขอปล่อยชั่วคราว (ประกันตัว) ในชั้นสอบสวนและศาล\nคดีความผิดตาม พ.ร.บ.คอมพิวเตอร์ และหมิ่นประมาท',

  services_cat3_title: 'คดีมรดกและพินัยกรรม',
  services_cat3_sub: 'Inheritance & Wills',
  services_cat3_desc: 'จัดการเรื่องทรัพย์สินมรดกให้ถูกต้องเรียบร้อย ยื่นคำร้องตั้งผู้จัดการมรดก และระงับข้อพิพาทระหว่างทายาท',
  services_cat3_items: 'ยื่นคำร้องขอตั้งผู้จัดการมรดกทั่วราชอาณาจักร (รวดเร็ว)\nฟ้องแบ่งทรัพย์มรดก ฟ้องเพิกถอนนิติกรรมโอนมรดกมิชอบ\nร่างพินัยกรรมแบบเขียนเอง หรือพินัยกรรมฝ่ายเมือง\nไกล่เกลี่ยประนีประนอมแบ่งมรดกในครอบครัว',

  services_cat4_title: 'คดีครอบครัวและเยาวชน',
  services_cat4_sub: 'Family Law Cases',
  services_cat4_desc: 'ดำเนินคดีด้วยความเข้าใจ ละเอียดอ่อน และเน้นประโยชน์สูงสุดของบุตรผู้เยาว์และสิทธิอันชอบธรรม',
  services_cat4_items: 'คดีฟ้องหย่า เรียกค่าเลี้ยงดู ค่าอุปการะเลี้ยงดูบุตร\nฟ้องแบ่งสินสมรส และหนี้สินระหว่างสมรส\nคดีขอใช้อำนาจปกครองบุตรแต่เพียงผู้เดียว และรับรองบุตร\nจัดทำบันทึกข้อตกลงการหย่าแนบท้ายทะเบียนหย่า',

  services_cat5_title: 'นิติกรรมสัญญาและที่ปรึกษาธุรกิจ',
  services_cat5_sub: 'Contracts & Legal Advisor',
  services_cat5_desc: 'ร่างและตรวจสัญญาเพื่อปิดช่องโหว่ความเสี่ยงทางกฎหมาย ออกหนังสือบอกกล่าวทวงถาม และรับเป็นที่ปรึกษาประจำ',
  services_cat5_items: 'ตรวจและร่างสัญญาจะซื้อจะขาย สัญญาเช่า สัญญาจ้าง\nทำหนังสือบอกกล่าวทวงถาม (Notice) ก่อนฟ้องคดี\nบริการที่ปรึกษากฎหมายประจำสำนักงานและห้างหุ้นส่วน\nเจรจาต่อรองระงับข้อพิพาททางธุรกิจ',

  // 5. หน้าติดต่อเรา (Contact Page)
  contact_note: 'สำนักงานตั้งอยู่ในเขตพื้นที่จังหวัดปัตตานี พร้อมดูแลคดีในพื้นที่ปัตตานี นราธิวาส สงขลา หาดใหญ่ และยะลา',

  // 6. ข้อความส่วนท้าย (Footer)
  footer_desc: 'ให้บริการปรึกษากฎหมายและรับว่าความทั่วราชอาณาจักร ด้วยความซื่อสัตย์สุจริต เที่ยงธรรม และเชี่ยวชาญ',
  footer_copyright: '© 2026 สำนักงานทนายความชั้น 1 (รับว่าความทั่วราชอาณาจักร). สงวนลิขสิทธิ์ทุกประการ.',

  // 7. ระบบจัดลำดับเมนู (Menu Sorting)
  menu_order: [
    { id: 'home', label: 'หน้าแรก', url: 'index.html', visible: true },
    { id: 'about', label: 'เกี่ยวกับเรา', url: 'about.html', visible: true },
    { id: 'services', label: 'บริการและราคา', url: 'services.html', visible: true },
    { id: 'booking', label: 'จองคิว', url: 'booking.html', visible: true },
    { id: 'contact', label: 'ติดต่อเรา', url: 'contact.html', visible: true }
  ]
};

// ดึงค่าการตั้งค่าจาก LocalStorage (หากไม่มีให้คืนค่าเริ่มต้น)
function getSiteSettings() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SITE_SETTINGS };
  const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!data) return { ...DEFAULT_SITE_SETTINGS };
  try {
    return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(data) };
  } catch (e) {
    console.error('Error parsing site settings', e);
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

// บันทึกค่าการตั้งค่าลง LocalStorage
function saveSiteSettings(newSettings) {
  const current = getSiteSettings();
  const updated = {
    ...current,
    ...newSettings
  };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  }
  applySiteSettings(updated);

  logActivity(
    'บันทึกการตั้งค่าเว็บไซต์',
    'อัปเดตข้อมูลสายด่วน / เนื้อหาหน้าเว็บ CMS หรือลำดับเมนูเรียบร้อย',
    'cms',
    '💾'
  );

  return updated;
}

// รีเซ็ตการตั้งค่ากลับเป็นค่าเริ่มต้น
function resetSiteSettings() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SITE_SETTINGS));
  }
  applySiteSettings(DEFAULT_SITE_SETTINGS);
  logActivity('คืนค่าการตั้งค่าเริ่มต้น', 'คืนค่าข้อมูลติดต่อและ CMS กลับสู่ค่ามาตรฐาน', 'cms', '↺');
  return { ...DEFAULT_SITE_SETTINGS };
}

// อัปเดตแสดงผลบนแถบ Topbar, หน้าติดต่อ และทุก element ที่มี data-cms
function applySiteSettings(customSettings) {
  if (typeof document === 'undefined') return;
  const settings = customSettings || getSiteSettings();

  // 1. อัปเดตสายด่วน
  const hotlineEls = document.querySelectorAll('#topbarHotline, [data-setting="hotline"], [data-cms="hotline"]');
  hotlineEls.forEach(el => {
    el.textContent = settings.hotline;
  });

  // 2. อัปเดตเวลาทำการ
  const hoursEls = document.querySelectorAll('#topbarHours, [data-setting="hours"], [data-cms="business_hours"]');
  hoursEls.forEach(el => {
    el.textContent = settings.business_hours;
  });

  // 3. อัปเดตแผนที่ Google Maps (Iframe และลิงก์นำทาง)
  const mapIframe = document.getElementById('contactMapIframe');
  if (mapIframe && settings.maps_embed) {
    mapIframe.src = settings.maps_embed;
  }

  const mapLinks = document.querySelectorAll('#contactMapLink, [data-cms-link="maps_url"]');
  mapLinks.forEach(link => {
    if (settings.maps_url) link.href = settings.maps_url;
  });

  const lineLinks = document.querySelectorAll('[data-cms-link="line_url"]');
  lineLinks.forEach(link => {
    if (settings.line_url) link.href = settings.line_url;
  });

  // 4. อัปเดต Dynamic CMS ทั่วทั้งเว็บ
  Object.keys(settings).forEach(key => {
    const val = settings[key];
    if (val !== undefined && val !== null) {
      // 4.1 ข้อความทั่วไป
      document.querySelectorAll(`[data-cms="${key}"]`).forEach(el => {
        if (el.hasAttribute('data-cms-format-lead') && typeof val === 'string' && val.includes(':')) {
          const colonIdx = val.indexOf(':');
          const lead = val.slice(0, colonIdx + 1);
          const rest = val.slice(colonIdx + 1);
          el.innerHTML = `<strong>${escapeHtml(lead)}</strong>${escapeHtml(rest)}`;
        } else {
          el.textContent = val;
        }
      });

      // 4.2 รายการหลายบรรทัด (Multiline List Items) เช่น ข้อความบริการ
      document.querySelectorAll(`[data-cms-list="${key}"]`).forEach(listEl => {
        if (typeof val === 'string') {
          const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            listEl.innerHTML = lines.map(line => `
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>${escapeHtml(line)}</span>
              </li>
            `).join('');
          }
        }
      });
    }
  });

  // 4.3 อัปเดตรูปภาพทนายความในหน้าเกี่ยวกับเรา (Lawyer Profile Photo)
  const lawyerImgUrl = settings.about_lawyer_image && typeof settings.about_lawyer_image === 'string' ? settings.about_lawyer_image.trim() : '';
  const lawyerImgs = document.querySelectorAll('#aboutLawyerPhoto, [data-cms-img="about_lawyer_image"]');
  const lawyerSvgs = document.querySelectorAll('#aboutLawyerDefaultIcon, [data-cms-default-icon="about_lawyer_image"]');

  lawyerImgs.forEach(img => {
    if (lawyerImgUrl) {
      img.src = lawyerImgUrl;
      img.style.display = 'block';
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
    }
  });

  lawyerSvgs.forEach(svg => {
    if (lawyerImgUrl) {
      svg.style.display = 'none';
    } else {
      svg.style.display = 'block';
    }
  });

  // 4.4 ระบบจัดการเบอร์โทรศัพท์จุดเดียวทั้งเว็บไซต์ (Centralized Universal Phone System)
  const phoneSource = settings.hotline || settings.office_phone || '081-234-5678';
  const phoneDigitsMatch = phoneSource.match(/0[0-9]{1,2}-?[0-9]{3}-?[0-9]{4}|0[0-9]{8,9}/);
  const cleanPhone = phoneDigitsMatch ? phoneDigitsMatch[0].replace(/[^0-9]/g, '') : '0812345678';
  const displayPhone = phoneDigitsMatch ? phoneDigitsMatch[0] : '081-234-5678';

  // อัปเดตทุกลิงก์โทรศัพท์ที่เป็น href="tel:..." ให้โทรติดเบอร์จริงทันที
  document.querySelectorAll('a[href^="tel:"], [data-cms-tel]').forEach(link => {
    link.href = `tel:${cleanPhone}`;
  });

  document.querySelectorAll('[data-cms-phone-only]').forEach(el => {
    el.textContent = displayPhone;
  });

  // 5. แสดงผลแถบเมนูนำทางแบบจัดลำดับไดนามิก (Dynamic Navbar)
  renderDynamicNavbar(settings);
}

// ฟังก์ชันเรนเดอร์เมนู Navbar ตามลำดับที่ตั้งค่าไว้
function renderDynamicNavbar(settings) {
  const navMenus = document.querySelectorAll('.nav-menu');
  if (!navMenus || navMenus.length === 0) return;

  const menuItems = settings.menu_order || DEFAULT_SITE_SETTINGS.menu_order;
  const isInsideAdmin = window.location.pathname.includes('/admin/');
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  navMenus.forEach(navMenu => {
    navMenu.innerHTML = '';
    menuItems.forEach(item => {
      if (item.visible === false) return;

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'nav-link';
      
      const itemUrl = item.url;
      const resolvedUrl = isInsideAdmin ? '../' + itemUrl : itemUrl;
      a.href = resolvedUrl;
      a.textContent = item.label;

      // ไฮไลต์เมนูหน้าที่เปิดอยู่
      if (!isInsideAdmin) {
        if (currentPath === itemUrl || (currentPath === '' && itemUrl === 'index.html')) {
          a.classList.add('active');
        }
      }

      li.appendChild(a);
      navMenu.appendChild(li);

      // รองรับการปิดเมนูบนมือถือเมื่อคลิกเลือกลิงก์
      a.addEventListener('click', () => {
        if (typeof window.closeMobileNavbar === 'function') {
          window.closeMobileNavbar();
        } else {
          navMenu.classList.remove('active');
          const toggle = document.querySelector('.menu-toggle');
          if (toggle) toggle.classList.remove('active');
        }
      });
    });

    // เพิ่มปุ่มจองคิวขนาดใหญ่สำหรับมือถือในกล่องดรอปดาวน์
    if (!isInsideAdmin) {
      const ctaLi = document.createElement('li');
      ctaLi.className = 'mobile-cta-item';
      const ctaUrl = isInsideAdmin ? '../booking.html' : 'booking.html';
      ctaLi.innerHTML = `
        <a href="${ctaUrl}" class="btn-mobile-nav-cta">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>จองคิวปรึกษาคดีความ</span>
        </a>
      `;
      const ctaLink = ctaLi.querySelector('a');
      if (ctaLink) {
        ctaLink.addEventListener('click', () => {
          if (typeof window.closeMobileNavbar === 'function') {
            window.closeMobileNavbar();
          } else {
            navMenu.classList.remove('active');
          }
        });
      }
      navMenu.appendChild(ctaLi);
    }
  });
}

// ฟังก์ชันควบคุมการเปิด-ปิดเมนูบนหน้าจอมือถือ (Responsive Mobile Navbar Controller)
function initMobileNavbar() {
  const menuToggles = document.querySelectorAll('.menu-toggle');
  const navMenus = document.querySelectorAll('.nav-menu');
  if (menuToggles.length === 0 || navMenus.length === 0) return;

  function openMenu() {
    navMenus.forEach(m => m.classList.add('active'));
    menuToggles.forEach(btn => {
      btn.classList.add('active');
      btn.setAttribute('aria-expanded', 'true');
    });
    if (typeof logActivity === 'function') {
      logActivity('เปิดเมนูนำทางบนมือถือ', 'ผู้ใช้คลิกเปิดเมนูดรอปดาวน์', 'click', '📱');
    }
  }

  function closeMenu() {
    navMenus.forEach(m => m.classList.remove('active'));
    menuToggles.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function toggleMenu() {
    const isAnyActive = Array.from(navMenus).some(m => m.classList.contains('active'));
    if (isAnyActive) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  menuToggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });
  });

  document.addEventListener('click', (e) => {
    const isClickInsideMenu = Array.from(navMenus).some(m => m.contains(e.target));
    const isClickInsideToggle = Array.from(menuToggles).some(btn => btn.contains(e.target));
    if (!isClickInsideMenu && !isClickInsideToggle) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
      closeMenu();
    }
  });

  window.closeMobileNavbar = closeMenu;
  window.openMobileNavbar = openMenu;
}

// ระบบติดตามการเข้าชมและการคลิกความเคลื่อนไหวอัตโนมัติ
function initActivityAutoTracker() {
  const path = window.location.pathname.toLowerCase();
  let pageName = 'หน้าหลัก (Home)';
  if (path.includes('about')) pageName = 'เกี่ยวกับสำนักงาน (About)';
  else if (path.includes('services')) pageName = 'บริการ & อัตราค่าบริการ (Services)';
  else if (path.includes('booking')) pageName = 'แบบฟอร์มจองคิวปรึกษา (Booking)';
  else if (path.includes('contact')) pageName = 'ติดต่อเรา & แผนที่สำนักงาน (Contact)';
  else if (path.includes('dashboard')) pageName = 'แดชบอร์ดจัดการระบบ (Admin Dashboard)';
  else if (path.includes('login')) pageName = 'หน้าเข้าสู่ระบบผู้ดูแล (Admin Login)';

  logActivity('เข้าชมหน้าเว็บ', pageName, 'visit', '🌐');

  document.addEventListener('click', (e) => {
    const telLink = e.target.closest('a[href^="tel:"]');
    if (telLink) {
      const telNum = telLink.getAttribute('href').replace('tel:', '').trim();
      logActivity('กดโทรสายด่วน', `เบอร์ ${telNum} (ผู้ใช้กดจากลิงก์บนหน้าเว็บ)`, 'click', '📞');
    }
    const mapLink = e.target.closest('a[href*="google.com/maps"], a[href*="maps.app.goo.gl"], #contactMapLink');
    if (mapLink) {
      logActivity('กดเปิดแผนที่นำทาง', 'เปิด Google Maps เพื่อดูเส้นทางมายังสำนักงาน', 'click', '🗺️');
    }
  });
}

// ตัวควบคุม Navbar Hamburger และอัปเดตข้อมูลไดนามิกเมื่อหน้าเว็บโหลด
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initActivityAutoTracker();
    initMobileNavbar();
    applySiteSettings();

    // ฟังการซิงค์ข้อมูลข้ามแท็บ
    window.addEventListener('storage', (e) => {
      if (e.key === SETTINGS_STORAGE_KEY) {
        applySiteSettings();
      }
    });

    // หากมีการโหลด supabase-config.js ให้พยายามซิงค์ค่าล่าสุดจาก Supabase
    if (typeof fetchSiteSettingsFromSupabase === 'function') {
      fetchSiteSettingsFromSupabase().then((settings) => {
        applySiteSettings(settings);
      }).catch(() => {});
    }
  });
}
