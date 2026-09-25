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
    page: window.location.pathname.split('/').pop() || 'index.html'
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
    window.dispatchEvent(new CustomEvent('lawyer_activity_logged', { detail: entry }));
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
window.logActivity = logActivity;
window.getActivityLogs = getActivityLogs;
window.clearActivityLogs = clearActivityLogs;

// รายการนัดหมายเริ่มต้น (Real System: เริ่มต้นจากตารางจริงในฐานข้อมูล Supabase)
const INITIAL_BOOKINGS = [];

// ดึงรายการทั้งหมดจาก Local Cache
function getBookings() {
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

// เพิ่มรายการจองใหม่
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

  // ตรวจสอบว่ามี id นี้อยู่แล้วหรือไม่ ถ้ามีให้อัปเดต ถ้าไม่มีให้เพิ่มใหม่
  const existingIdx = bookings.findIndex(b => b.id === id);
  if (existingIdx !== -1) {
    bookings[existingIdx] = fullBooking;
  } else {
    bookings.unshift(fullBooking);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));

  // บันทึกความเคลื่อนไหว
  logActivity(
    'ยื่นจองคิวใหม่',
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

    // บันทึกความเคลื่อนไหว
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

    // บันทึกความเคลื่อนไหว
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
      return `<span class="status-badge">${status}</span>`;
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

  toast.innerHTML = `${iconSvg} <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// ระบบจัดการการตั้งค่าหน้าเว็บไซต์แบบครบวงจร (Site Settings, CMS & Menu Sorting)
// ==========================================
const SETTINGS_STORAGE_KEY = 'lawyer_site_settings';
const DEFAULT_SITE_SETTINGS = {
  // 1. ระบบจัดการเบอร์โทรและช่องทางติดต่อ (ปลอดภัยสำหรับทนาย)
  hotline: '073-xxx-xxx, 081-234-5678 (เบอร์กลางสำนักงาน)',
  business_hours: 'เปิดทุกวัน 06:00 - 18:00 น. (หมายเหตุ: นอกจากไม่ว่างหรือติดธุระส่วนตัวข้างนอก สำนักงานจะปิด)',
  office_phone: '073-xxx-xxx',
  line_id: '@lawyer1th',
  office_address: 'ทนายความ รอสนั่น อีซอ อำเภอเมืองปัตตานี จังหวัดปัตตานี (เน้นรับดูแลคดีในพื้นที่ ปัตตานี, นราธิวาส, สงขลา, หาดใหญ่ และยะลา)',
  visit_note: 'กรุณานัดหมายคิวล่วงหน้าเพื่อเตรียมเอกสารและอำนวยความสะดวกก่อนเดินทางมายังสำนักงาน',
  maps_url: 'https://maps.app.goo.gl/2ukUyWUSAMQPn3DYA',
  maps_embed: 'https://maps.google.com/maps?q=6.8506101,101.2548708&hl=th&z=17&output=embed',

  // 2. ระบบจัดการและแก้ไขเนื้อหาทุกหน้า (เรียงตามลำดับความสำคัญ)
  // 2.1 หน้าแรก (Home Page)
  home_hero_title: 'ทนายความชั้น 1 ใบอนุญาตว่าความทั่วราชอาณาจักร',
  home_hero_desc: 'ว่าความดำเนินคดีด้วยความรอบคอบ ซื่อสัตย์สุจริต และเปี่ยมด้วยประสบการณ์กว่า 35 ถึงเกือบ 40 ปี ในศาลจังหวัดปัตตานีและพื้นที่ใกล้เคียง',
  home_start_price: 'เริ่มต้น 7,000 ฿',
  home_price_note: '* ค่าบริการเริ่มต้นที่ 7,000 บาท (ขึ้นอยู่กับประเภทและความยากง่ายของคดี ซึ่งบางคดีราคานี้เป็นไปได้)',
  home_exp_years: 'กว่า 35 - 40 ปี',
  home_cta_title: 'มีปัญหาทางกฎหมาย หรือต้องการปรึกษาคดีด่วน?',
  home_cta_desc: 'จองคิวรับคำปรึกษากับทนายความชั้น 1 ได้ทันที ทั้งแบบเดินทางมาที่สำนักงาน หรือทางวิดีโอคอลออนไลน์และโทรศัพท์',
  home_cta_btn_text: 'จองคิวออนไลน์ตอนนี้',
  home_cta_phone: 'โทรด่วน 081-234-5678',

  // 2.2 หน้าเกี่ยวกับเรา (About Page)
  about_title: 'ความน่าเชื่อถือและจรรยาบรรณวิชาชีพ',
  about_desc: 'ดำเนินงานโดยทนายความชั้น 1 อาวุโส ผู้มีใบอนุญาตว่าความประเภทตลอดชีพ ประสบการณ์ทำงานด้านกฎหมายยาวนานกว่า 35 ถึงเกือบ 40 ปี',
  about_lawyer_name: 'ทนายความ ธนบดี นิติสิริ',
  about_lawyer_title: 'ทนายความชั้น 1 อาวุโส (ประเภทตลอดชีพ)',
  about_lawyer_exp: '⚖️ ประสบการณ์ 35+ ถึงเกือบ 40 ปี',
  about_lawyer_image: '',
  about_exp_heading: 'ประสบการณ์ว่าความและการทำงานด้านกฎหมาย',
  about_exp_item1: 'ทนายความชั้น 1 (ใบอนุญาตว่าความประเภทตลอดชีพ): สภาทนายความในพระบรมราชูปถัมภ์ มีสิทธิว่าความดำเนินคดีทุกศาลทั่วราชอาณาจักร',
  about_exp_item2: 'ประสบการณ์ในวิชาชีพยาวนานกว่า 35 ถึงเกือบ 40 ปี: ผ่านการว่าความคดีแพ่ง คดีอาญา คดีที่ดิน และคดีมรดก ในศาลชั้นต้น ศาลอุทธรณ์ และศาลฎีกา มาอย่างยาวนานต่อเนื่อง',
  about_exp_item3: 'ความคุ้นเคยอย่างลึกซึ้งในระบบศาลพื้นที่ภาคใต้: โดยเฉพาะศาลจังหวัดปัตตานี, ศาลจังหวัดสงขลา, ศาลแขวงสงขลา, ศาลจังหวัดนาทวี, ศาลจังหวัดยะลา, และศาลจังหวัดนราธิวาส',
  about_exp_item4: 'เชี่ยวชาญการตรวจเอกสารและวางรูปคดีอย่างรอบคอบ: วิเคราะห์จุดได้เปรียบ-เสียเปรียบ อย่างตรงไปตรงมา คดีไหนควรไกล่เกลี่ยหรือควรฟ้องร้อง ชี้แจงลูกความตามความจริง',

  // 2.3 หน้าบริการและเรทราคา (Services Page)
  services_area_note: 'เน้นรับงานในพื้นที่ปัตตานี และ 4 จังหวัดใกล้เคียง ได้แก่ นราธิวาส, สงขลา, หาดใหญ่, และยะลา เพื่อให้ทนายความสามารถทุ่มเทเวลาและใส่ใจติดตามรายละเอียดข้อเท็จจริงในสำนวนคดีของลูกความทุกท่านได้อย่างใกล้ชิด รัดกุม และมีประสิทธิภาพสูงสุด สำหรับคดีที่ต้องออกนอกพื้นที่หรือต่างจังหวัด ลูกค้าต้องเข้ามาพูดคุยตกลงรายละเอียดและราคากับทนายความโดยตรงที่สำนักงานเท่านั้น',
  services_start_price: 'เริ่มต้น 7,000 บาท',
  services_province_note: '📢 "กรณีออกนอกพื้นที่หรือต่างจังหวัด ลูกค้าต้องเข้ามาพูดคุยตกลงรายละเอียดและราคากับทนายความโดยตรงที่สำนักงานเท่านั้น"',

  // 2.4 หน้าติดต่อเรา (Contact Page)
  contact_note: 'สำนักงานตั้งอยู่ในเขตพื้นที่อำเภอเมืองปัตตานี พร้อมดูแลคดีในพื้นที่ปัตตานี นราธิวาส สงขลา หาดใหญ่ และยะลา',

  // 3. ระบบจัดลำดับเมนู (Menu Sorting)
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
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  applySiteSettings();

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
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SITE_SETTINGS));
  applySiteSettings();
  logActivity('คืนค่าการตั้งค่าเริ่มต้น', 'คืนค่าข้อมูลติดต่อและ CMS กลับสู่ค่ามาตรฐาน', 'cms', '↺');
  return { ...DEFAULT_SITE_SETTINGS };
}

// อัปเดตแสดงผลบนแถบ Topbar, หน้าติดต่อ และทุก element ที่มี data-cms
function applySiteSettings() {
  const settings = getSiteSettings();

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

  // 4. อัปเดต Dynamic CMS ทั่วทั้งเว็บ
  const cmsMap = {
    'office_phone': settings.office_phone,
    'line_id': settings.line_id,
    'office_address': settings.office_address,
    'visit_note': settings.visit_note,
    'maps_url': settings.maps_url,
    'home_hero_title': settings.home_hero_title,
    'home_hero_desc': settings.home_hero_desc,
    'home_start_price': settings.home_start_price,
    'home_price_note': settings.home_price_note,
    'home_exp_years': settings.home_exp_years,
    'home_cta_title': settings.home_cta_title,
    'home_cta_desc': settings.home_cta_desc,
    'home_cta_btn_text': settings.home_cta_btn_text,
    'home_cta_phone': settings.home_cta_phone,
    'about_title': settings.about_title,
    'about_desc': settings.about_desc,
    'about_lawyer_name': settings.about_lawyer_name,
    'about_lawyer_title': settings.about_lawyer_title,
    'about_lawyer_exp': settings.about_lawyer_exp,
    'about_exp_heading': settings.about_exp_heading,
    'about_exp_item1': settings.about_exp_item1,
    'about_exp_item2': settings.about_exp_item2,
    'about_exp_item3': settings.about_exp_item3,
    'about_exp_item4': settings.about_exp_item4,
    'services_area_note': settings.services_area_note,
    'services_start_price': settings.services_start_price,
    'services_province_note': settings.services_province_note,
    'contact_note': settings.contact_note
  };

  Object.keys(cmsMap).forEach(key => {
    const val = cmsMap[key];
    if (val !== undefined && val !== null) {
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
    }
  });

  // 4.2 อัปเดตรูปภาพทนายความในหน้าเกี่ยวกับเรา (Lawyer Profile Photo)
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

  // 4.3 ระบบจัดการเบอร์โทรศัพท์จุดเดียวทั้งเว็บไซต์ (Centralized Universal Phone System)
  const phoneSource = settings.hotline || settings.office_phone || '081-234-5678';
  const phoneDigitsMatch = phoneSource.match(/0[0-9]{1,2}-?[0-9]{3}-?[0-9]{4}|0[0-9]{8,9}/);
  const cleanPhone = phoneDigitsMatch ? phoneDigitsMatch[0].replace(/[^0-9]/g, '') : '0812345678';

  // อัปเดตทุกลิงก์โทรศัพท์ที่เป็น href="tel:..." ให้โทรติดเบอร์จริงทันที
  document.querySelectorAll('a[href^="tel:"], [data-cms-tel]').forEach(link => {
    link.href = `tel:${cleanPhone}`;
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

  // 1. คลิกปุ่มแฮมเบอร์เกอร์เพื่อสลับ เปิด/ปิด
  menuToggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });
  });

  // 2. คลิกพื้นที่ด้านนอก (Outside click) ให้ปิดเมนูดรอปดาวน์อัตโนมัติ
  document.addEventListener('click', (e) => {
    const isClickInsideMenu = Array.from(navMenus).some(m => m.contains(e.target));
    const isClickInsideToggle = Array.from(menuToggles).some(btn => btn.contains(e.target));
    if (!isClickInsideMenu && !isClickInsideToggle) {
      closeMenu();
    }
  });

  // 3. ปิดเมนูเมื่อกดปุ่ม ESC บนคีย์บอร์ด
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });

  // 4. หากปรับขนาดหน้าจอขยายกลับเป็น Desktop (> 992px) ให้ปิดสถานะ active
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

  // บันทึกการเข้าชมหน้าเว็บ
  logActivity('เข้าชมหน้าเว็บ', pageName, 'visit', '🌐');

  // ตรวจจับการกดโทรสายด่วน และการเปิดแผนที่ Google Maps
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
document.addEventListener('DOMContentLoaded', () => {
  // เริ่มระบบติดตามความเคลื่อนไหว
  initActivityAutoTracker();

  // ติดตั้งระบบควบคุม Navbar บนมือถือ
  initMobileNavbar();

  // นำค่าการตั้งค่ามาแสดงผลทันทีเมื่อเปิดหน้า
  applySiteSettings();

  // หากมีการโหลด supabase-config.js ให้พยายามซิงค์ค่าล่าสุดจาก Supabase
  if (typeof fetchSiteSettingsFromSupabase === 'function') {
    fetchSiteSettingsFromSupabase().then(() => {
      applySiteSettings();
    }).catch(() => {});
  }
});

