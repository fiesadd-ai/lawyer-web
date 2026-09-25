/**
 * สคริปต์ควบคุมระบบหลังบ้าน (Admin Dashboard Controller - 100% Real Supabase Database)
 * สำนักงานทนายความชั้น 1 (รับว่าความทั่วราชอาณาจักร)
 * 
 * ฟังก์ชันหลัก:
 * 1. ระบบ Sidebar Navigation และสลับหน้าจอ (Smooth Section Switching)
 * 2. จัดการคิวปรึกษาจริง 100% (Appointments): SELECT, UPDATE STATUS, DELETE ออกจาก Supabase ถาวร
 * 3. จัดการข้อมูลสายด่วน & เวลาทำการ (Hotline & Office Settings)
 * 4. จัดการเนื้อหาหน้าเว็บไซต์ (Dynamic CMS Pages)
 * 5. จัดการจัดเรียงลำดับเมนูนำทาง (Navbar Menu Sorting)
 * 6. ระบบตรวจสอบและตั้งค่าการเชื่อมต่อ Supabase Database
 */

// ตัวแปรสถานะการทำงานภายในระบบ
let currentSection = 'appointments';
let currentFilterStatus = 'all';
let currentSearchQuery = '';
let editableMenuItems = [];

// ข้อมูลหัวข้อหน้าสำหรับ Topbar
const SECTION_METADATA = {
  appointments: {
    title: 'จัดการคิวปรึกษาคดีความ',
    desc: 'ข้อมูลจริงจาก Supabase Database ตาราง appointments • เพิ่ม ลบ แก้ไขสถานะได้แบบ Real-time',
    icon: '📋'
  },
  contact: {
    title: 'ตั้งค่าการติดต่อ & เวลาทำการ',
    desc: 'กำหนดเบอร์สายด่วนกลางสำนักงาน (เช่น 073-xxx-xxx) เพื่อความปลอดภัย และตั้งเวลาทำการบน Top Bar',
    icon: '📞'
  },
  cms: {
    title: 'จัดการเนื้อหาหน้าเว็บไซต์ (CMS)',
    desc: 'ปรับแต่งข้อความ สโลแกน ประสบการณ์ 35-40 ปี ใบอนุญาตชั้น 1 และเงื่อนไขเรทราคาบริการ 7,000 บาท',
    icon: '📝'
  },
  menu: {
    title: 'จัดลำดับหน้า / เมนูนำทาง (Navbar)',
    desc: 'กำหนดลำดับการแสดงผลของแต่ละหน้าบนแถบเมนูหลักของเว็บไซต์ พร้อมพรีวิวแบบเรียลไทม์',
    icon: '🔀'
  }
};

// เริ่มต้นระบบเมื่อโหลดหน้าเสร็จ
document.addEventListener('DOMContentLoaded', async () => {
  const adminEmailEl = document.getElementById('currentAdminEmail');
  if (adminEmailEl) {
    adminEmailEl.textContent = localStorage.getItem('lawyer_admin_email') || 'ผู้ดูแลระบบ (Admin)';
  }

  initUrlHashRouting();
  updateSupabaseStatusDisplay();
  await refreshAllAdminData();
  setupEventListeners();
  renderActivityLogs();
});

/**
 * โหลดข้อมูลและรีเฟรชข้อมูลทั้งหมดจาก Supabase
 */
async function refreshAllAdminData() {
  await renderAppointmentsTable();
  await loadAllSettingsToForm();
  updateSupabaseStatusDisplay();
  renderActivityLogs();
}

/**
 * ตรวจสอบ Hash บน URL เพื่อเปิดหน้าที่ผู้ใช้เลือกไว้ค้างไว้
 */
function initUrlHashRouting() {
  const hash = window.location.hash.replace('#', '');
  if (hash && SECTION_METADATA[hash]) {
    switchAdminSection(hash, false);
  } else {
    switchAdminSection('appointments', false);
  }
}

/**
 * สลับหน้าเนื้อหาผ่าน Sidebar Navigation
 */
function switchAdminSection(sectionId, updateHash = true) {
  if (!SECTION_METADATA[sectionId]) return;
  currentSection = sectionId;

  // 1. ปรับสถานะ Active ที่ปุ่ม Sidebar
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    if (item.dataset.section === sectionId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // 2. ปรับการแสดงผล Section เนื้อหา
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSection = document.getElementById(`section-${sectionId}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // 3. ปรับชื่อหน้าใน Topbar
  const meta = SECTION_METADATA[sectionId];
  const titleEl = document.getElementById('topbarPageTitle');
  const descEl = document.getElementById('topbarPageDesc');
  if (titleEl) titleEl.textContent = `${meta.icon} ${meta.title}`;
  if (descEl) descEl.textContent = meta.desc;

  // 4. บันทึก hash ใน URL
  if (updateHash) {
    window.location.hash = sectionId;
  }

  // 5. ปิด Mobile Sidebar
  closeMobileSidebar();
}

/**
 * ควบคุม Sidebar บนหน้าจอขนาดเล็ก (Mobile Responsive)
 */
function openMobileSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.add('sidebar-open');
  if (backdrop) backdrop.classList.add('active');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('sidebar-open');
  if (backdrop) backdrop.classList.remove('active');
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  if (sidebar && sidebar.classList.contains('sidebar-open')) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}

/**
 * สลับหมวดย่อยในส่วนจัดการเนื้อหา (CMS Sub-tabs)
 */
function switchCmsSubTab(subId) {
  document.querySelectorAll('.cms-subnav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.cms-subpane').forEach(pane => pane.classList.remove('active'));

  const activeBtn = document.getElementById(`btn-cms-${subId}`);
  const activePane = document.getElementById(`pane-cms-${subId}`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activePane) activePane.classList.add('active');
}

// ==========================================================================
// 1. จัดการคิวปรึกษาจริง 100% (Appointments จาก Supabase)
// ==========================================================================

async function renderAppointmentsTable() {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  // แสดงสถานะกำลังโหลด
  tbody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
        <div style="display: inline-flex; align-items: center; gap: 10px; font-weight: 500;">
          <svg style="animation: spin 1s linear infinite; width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="0.8"></path>
          </svg>
          กำลังดึงข้อมูลจริงจาก Supabase Database...
        </div>
      </td>
    </tr>
  `;

  let allBookings = [];
  try {
    allBookings = await fetchAppointmentsFromSupabase();
  } catch (err) {
    console.error('Fetch appointments error:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state" style="color: #dc2626; padding: 40px 20px;">
          <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">
            ⚠️ ไม่สามารถดึงข้อมูลจาก Supabase ได้
          </div>
          <div style="font-size: 0.88rem; color: var(--text-muted); max-width: 500px; margin: 0 auto 16px;">
            ${escapeHtml(err.message || 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือ Supabase Project URL')}
          </div>
          <button type="button" class="btn btn-outline btn-sm" onclick="openSupabaseModal()">
            ⚙️ ตรวจสอบการตั้งค่า Supabase
          </button>
        </td>
      </tr>
    `;
    return;
  }

  // 1. คำนวณสถิติจากข้อมูลจริง
  const totalCount = allBookings.length;
  let pendingCount = 0;
  let confirmedCount = 0;
  let completedCount = 0;

  allBookings.forEach(b => {
    if (b.status === 'pending') pendingCount++;
    if (b.status === 'confirmed') confirmedCount++;
    if (b.status === 'completed') completedCount++;
  });

  // อัปเดตตัวเลขในการ์ดสรุป
  updateText('statTotal', totalCount);
  updateText('statPending', pendingCount);
  updateText('statConfirmed', confirmedCount);
  updateText('statCompleted', completedCount);

  // อัปเดตจำนวนในปุ่ม Filter
  updateText('filterCountAll', totalCount);
  updateText('filterCountPending', pendingCount);
  updateText('filterCountConfirmed', confirmedCount);
  updateText('filterCountCompleted', completedCount);

  // อัปเดตตัวเลข Badge เตือนที่ Sidebar ซ้ายมือ
  const sidebarBadge = document.getElementById('sidebarPendingBadge');
  if (sidebarBadge) {
    sidebarBadge.textContent = `${pendingCount} รอดำเนินการ`;
    sidebarBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }

  // 2. กรองข้อมูลตามสถานะและคำค้นหา
  const filtered = allBookings.filter(b => {
    const matchStatus = (currentFilterStatus === 'all' || b.status === currentFilterStatus);
    let matchSearch = true;
    if (currentSearchQuery !== '') {
      const targetStr = `${b.id} ${b.fullname} ${b.phone} ${b.case_type}`.toLowerCase();
      matchSearch = targetStr.includes(currentSearchQuery);
    }
    return matchStatus && matchSearch;
  });

  // 3. แสดงผลตาราง
  if (filtered.length === 0) {
    if (allBookings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--primary-dark); margin-bottom: 6px;">
              ยังไม่มีรายการจองคิวในฐานข้อมูล Supabase
            </div>
            <p style="font-size: 0.9rem; color: var(--text-muted); max-width: 480px; margin: 0 auto 18px; line-height: 1.6;">
              ตาราง <code>appointments</code> บน Supabase ว่างเปล่า เมื่อลูกค้ากรอกข้อมูลผ่านหน้าเว็บไซต์ ข้อมูลจะปรากฏที่นี่ทันที
            </p>
            <a href="../booking.html" target="_blank" class="btn btn-primary btn-sm">
              ➕ ทดลองส่งข้อมูลจองคิวจริง (booking.html)
            </a>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 4px;">ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</div>
            <div style="font-size: 0.85rem;"><button type="button" onclick="resetFilters()" style="color: var(--primary); text-decoration: underline; background:none; border:none; cursor:pointer;">ล้างการค้นหา</button> เพื่อดูข้อมูลทั้งหมด</div>
          </td>
        </tr>
      `;
    }
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td>
        <span style="font-family: monospace; font-size: 0.85rem; font-weight: 600; color: var(--primary);">
          ${escapeHtml(item.id)}
        </span>
      </td>
      <td>
        <div class="client-cell">
          <span class="client-name">${escapeHtml(item.fullname)}</span>
          <span class="client-phone">📞 ${escapeHtml(item.phone)}</span>
        </div>
      </td>
      <td>
        <span style="font-weight: 500; color: var(--text-main);">${escapeHtml(item.case_type)}</span>
      </td>
      <td>
        <div style="font-size: 0.88rem; font-weight: 500;">📅 ${escapeHtml(item.booking_date)}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">⏰ ${escapeHtml(item.booking_time)} น.</div>
      </td>
      <td>
        <span style="font-size: 0.85rem; color: var(--text-main);">
          ${formatConsultType(item.consult_type)}
        </span>
      </td>
      <td>
        ${formatStatusBadge(item.status)}
      </td>
      <td style="text-align: center;">
        <div class="action-buttons" style="justify-content: center;">
          <button type="button" class="btn-icon" title="ดูรายละเอียดคดี" onclick="showBookingDetail('${item.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button type="button" class="btn-icon" title="เปลี่ยนสถานะ" onclick="openStatusModal('${item.id}', '${escapeJs(item.fullname)}', '${item.status}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button type="button" class="btn-icon delete" title="ลบออกจาก Supabase อย่างถาวร" onclick="handleDeleteBooking('${item.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setFilter(status) {
  currentFilterStatus = status;
  const pills = document.querySelectorAll('#filterPillsContainer .filter-pill');
  pills.forEach(p => p.classList.remove('active'));

  const indexMap = { 'all': 0, 'pending': 1, 'confirmed': 2, 'completed': 3 };
  if (pills[indexMap[status]]) {
    pills[indexMap[status]].classList.add('active');
  }
  renderAppointmentsTable();
}

function handleSearch(query) {
  currentSearchQuery = query.trim().toLowerCase();
  renderAppointmentsTable();
}

function resetFilters() {
  currentFilterStatus = 'all';
  currentSearchQuery = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  setFilter('all');
}

function showBookingDetail(id) {
  const bookings = getBookings();
  const item = bookings.find(b => b.id === id);
  if (!item) return;

  const detailIdEl = document.getElementById('modalDetailId');
  if (detailIdEl) detailIdEl.textContent = item.id;

  const body = document.getElementById('modalDetailBody');
  if (body) {
    body.innerHTML = `
      <div style="background: var(--primary-bg); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px;">
        <div style="font-size: 1.15rem; font-weight: 700; color: var(--primary-dark); margin-bottom: 4px;">
          ${escapeHtml(item.fullname)}
        </div>
        <div style="display: flex; gap: 18px; font-size: 0.88rem; color: var(--text-muted); flex-wrap: wrap;">
          <span>เบอร์โทร: <strong>${escapeHtml(item.phone)}</strong></span>
          <span>อีเมล: <strong>${escapeHtml(item.email || 'ไม่ได้ระบุ')}</strong></span>
          <span>บันทึกเมื่อ: ${escapeHtml(item.created_at || '-')}</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px;">
          <span style="font-size: 0.8rem; color: var(--text-muted);">หมวดหมู่คดี:</span>
          <div style="font-weight: 600; color: var(--primary);">${escapeHtml(item.case_type)}</div>
        </div>
        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px;">
          <span style="font-size: 0.8rem; color: var(--text-muted);">ช่องทางและเวลานัดหมาย:</span>
          <div style="font-weight: 600;">${formatConsultType(item.consult_type)}</div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">📅 ${escapeHtml(item.booking_date)} (${escapeHtml(item.booking_time)} น.)</div>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <strong style="display: block; font-size: 0.9rem; color: var(--primary-dark); margin-bottom: 6px;">
          ข้อเท็จจริง / รายละเอียดที่ลูกความแจ้งเบื้องต้น:
        </strong>
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; line-height: 1.7; font-size: 0.9rem; color: var(--text-main); white-space: pre-line;">
          ${escapeHtml(item.details ? item.details : 'ไม่มีการระบุรายละเอียดเพิ่มเติม')}
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 10px;">
        <span style="font-size: 0.88rem; color: var(--text-muted);">สถานะปัจจุบัน:</span>
        <div>${formatStatusBadge(item.status)}</div>
      </div>
    `;
  }

  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.add('active');
}

function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('active');
}

function openStatusModal(id, fullname, currentStatus) {
  document.getElementById('statusBookingId').value = id;
  document.getElementById('statusClientName').textContent = `${fullname} (${id})`;
  document.getElementById('newStatusSelect').value = currentStatus;
  
  const modal = document.getElementById('statusModal');
  if (modal) modal.classList.add('active');
}

function closeStatusModal() {
  const modal = document.getElementById('statusModal');
  if (modal) modal.classList.remove('active');
}

/**
 * อัปเดตสถานะนัดหมายลง Supabase จริง 100%
 */
async function handleUpdateStatus(event) {
  event.preventDefault();
  const id = document.getElementById('statusBookingId').value;
  const newStatus = document.getElementById('newStatusSelect').value;

  try {
    await updateAppointmentStatusInSupabase(id, newStatus);
    closeStatusModal();
    await renderAppointmentsTable();
    showToast(`อัปเดตสถานะของ ${id} ใน Supabase สำเร็จแล้ว`);
  } catch (err) {
    console.error('Update status error:', err);
    alert('เกิดข้อผิดพลาดในการอัปเดตสถานะใน Supabase: ' + (err.message || err));
  }
}

/**
 * ลบข้อมูลนัดหมายออกจาก Supabase อย่างถาวร 100% (Real DELETE)
 */
async function handleDeleteBooking(id) {
  if (confirm(`ยืนยันลบรายการรหัส ${id} ออกจากฐานข้อมูล Supabase อย่างถาวรใช่หรือไม่?\n\n⚠️ คำเตือน: ข้อมูลจะถูกลบออกจาก Cloud Database จริงๆ และไม่สามารถกู้คืนได้`)) {
    try {
      await deleteAppointmentFromSupabase(id);
      await renderAppointmentsTable();
      showToast(`ลบรายการรหัส ${id} ออกจาก Supabase สำเร็จแล้ว`, 'error');
    } catch (err) {
      console.error('Delete error:', err);
      alert('เกิดข้อผิดพลาดในการลบข้อมูลจาก Supabase: ' + (err.message || err));
    }
  }
}

// ==========================================================================
// 2. จัดการการตั้งค่าสายด่วน & ติดต่อ (Hotline & Contacts)
// ==========================================================================

async function loadAllSettingsToForm() {
  const settings = await fetchSiteSettingsFromSupabase();

  // 1. หมวดสายด่วน & เวลาทำการ
  setVal('settingHotline', settings.hotline);
  setVal('settingHours', settings.business_hours);
  setVal('settingOfficePhone', settings.office_phone);
  setVal('settingLineId', settings.line_id);
  setVal('settingAddress', settings.office_address);
  setVal('settingVisitNote', settings.visit_note);
  setVal('settingMapsUrl', settings.maps_url);
  setVal('settingMapsEmbed', settings.maps_embed);
  updateHotlinePreview();

  // 2. หมวดเนื้อหา CMS ทุกหน้า
  setVal('cmsHomeHeroTitle', settings.home_hero_title);
  setVal('cmsHomeHeroDesc', settings.home_hero_desc);
  setVal('cmsHomeStartPrice', settings.home_start_price);
  setVal('cmsHomePriceNote', settings.home_price_note);
  setVal('cmsHomeExpYears', settings.home_exp_years);
  setVal('cmsHomeCtaTitle', settings.home_cta_title || 'มีปัญหาทางกฎหมาย หรือต้องการปรึกษาคดีด่วน?');
  setVal('cmsHomeCtaDesc', settings.home_cta_desc || 'จองคิวรับคำปรึกษากับทนายความชั้น 1 ได้ทันที ทั้งแบบเดินทางมาที่สำนักงาน หรือทางวิดีโอคอลออนไลน์และโทรศัพท์');
  setVal('cmsHomeCtaBtnText', settings.home_cta_btn_text || 'จองคิวออนไลน์ตอนนี้');
  setVal('cmsHomeCtaPhone', settings.home_cta_phone || 'โทรด่วน 081-234-5678');
  updateHomeCtaLivePreview();

  setVal('cmsAboutTitle', settings.about_title);
  setVal('cmsAboutDesc', settings.about_desc);
  setVal('cmsAboutLawyerName', settings.about_lawyer_name);
  setVal('cmsAboutLawyerTitle', settings.about_lawyer_title);
  setVal('cmsAboutLawyerExp', settings.about_lawyer_exp);
  setVal('cmsAboutLawyerImage', settings.about_lawyer_image || '');
  setVal('cmsAboutExpHeading', settings.about_exp_heading);
  setVal('cmsAboutExpItem1', settings.about_exp_item1);
  setVal('cmsAboutExpItem2', settings.about_exp_item2);
  setVal('cmsAboutExpItem3', settings.about_exp_item3);
  setVal('cmsAboutExpItem4', settings.about_exp_item4);
  updateAboutLivePreview();

  setVal('cmsServicesStartPrice', settings.services_start_price);
  setVal('cmsServicesAreaNote', settings.services_area_note);
  setVal('cmsServicesProvinceNote', settings.services_province_note);

  setVal('cmsContactNote', settings.contact_note);

  // 3. หมวดจัดลำดับเมนูนำทาง (Navbar)
  editableMenuItems = JSON.parse(JSON.stringify(settings.menu_order || DEFAULT_SITE_SETTINGS.menu_order));
  renderMenuSortList();
}

function updateHotlinePreview() {
  const hotline = getVal('settingHotline');
  const hours = getVal('settingHours');
  const line = getVal('settingLineId');

  const p1 = document.getElementById('previewHotline');
  const p2 = document.getElementById('previewHours');
  const p3 = document.getElementById('previewLine');

  if (p1) p1.textContent = hotline || '-';
  if (p2) p2.textContent = hours || '-';
  if (p3) p3.textContent = line || '-';

  // ซิงค์เบอร์โทรศัพท์ไปยังปุ่มโทรด่วนท้ายหน้าแรกอัตโนมัติ (Universal Phone Sync)
  const match = hotline.match(/0[0-9]{1,2}-?[0-9]{3}-?[0-9]{4}|0[0-9]{8,9}/);
  if (match) {
    const ctaPhoneInput = document.getElementById('cmsHomeCtaPhone');
    if (ctaPhoneInput && (!ctaPhoneInput.value || ctaPhoneInput.value.startsWith('โทรด่วน'))) {
      ctaPhoneInput.value = `โทรด่วน ${match[0]}`;
      updateHomeCtaLivePreview();
    }
  }
}

// อัปเดตตัวอย่างสดของแบนเนอร์จองคิวด่วน (Quick CTA Banner Live Preview)
function updateHomeCtaLivePreview() {
  const title = getVal('cmsHomeCtaTitle') || 'มีปัญหาทางกฎหมาย หรือต้องการปรึกษาคดีด่วน?';
  const desc = getVal('cmsHomeCtaDesc') || 'จองคิวรับคำปรึกษากับทนายความชั้น 1 ได้ทันที ทั้งแบบเดินทางมาที่สำนักงาน หรือทางวิดีโอคอลออนไลน์และโทรศัพท์';
  const btnText = getVal('cmsHomeCtaBtnText') || 'จองคิวออนไลน์ตอนนี้';
  const phone = getVal('cmsHomeCtaPhone') || 'โทรด่วน 081-234-5678';

  updateText('previewHomeCtaTitle', title);
  updateText('previewHomeCtaDesc', desc);
  updateText('previewHomeCtaBtnText', btnText);
  updateText('previewHomeCtaPhone', phone);
}

function updateAboutLivePreview() {
  const name = getVal('cmsAboutLawyerName') || 'ทนายความ ธนบดี นิติสิริ';
  const title = getVal('cmsAboutLawyerTitle') || 'ทนายความชั้น 1 อาวุโส (ประเภทตลอดชีพ)';
  const exp = getVal('cmsAboutLawyerExp') || '⚖️ ประสบการณ์ 35+ ถึงเกือบ 40 ปี';
  const heading = getVal('cmsAboutExpHeading') || 'ประสบการณ์ว่าความและการทำงานด้านกฎหมาย';

  updateText('previewAboutLawyerName', name);
  updateText('previewAboutLawyerTitle', title);
  updateText('previewAboutLawyerExp', exp);
  updateText('previewAboutExpHeading', heading);

  const formatItem = (elId, text) => {
    const el = document.getElementById(elId);
    if (!el) return;
    if (text && text.includes(':')) {
      const idx = text.indexOf(':');
      const lead = text.slice(0, idx + 1);
      const rest = text.slice(idx + 1);
      el.innerHTML = `<strong>${escapeHtml(lead)}</strong>${escapeHtml(rest)}`;
    } else {
      el.textContent = text || '-';
    }
  };

  formatItem('previewAboutExpItem1', getVal('cmsAboutExpItem1'));
  formatItem('previewAboutExpItem2', getVal('cmsAboutExpItem2'));
  formatItem('previewAboutExpItem3', getVal('cmsAboutExpItem3'));
  formatItem('previewAboutExpItem4', getVal('cmsAboutExpItem4'));

  // อัปเดตรูปภาพในการ์ดตัวอย่างสด
  const imgUrl = getVal('cmsAboutLawyerImage');
  const previewImg = document.getElementById('previewAboutLawyerImg');
  const previewSvg = document.getElementById('previewAboutLawyerSvg');
  if (previewImg && previewSvg) {
    if (imgUrl) {
      previewImg.src = imgUrl;
      previewImg.style.display = 'block';
      previewSvg.style.display = 'none';
    } else {
      previewImg.removeAttribute('src');
      previewImg.style.display = 'none';
      previewSvg.style.display = 'block';
    }
  }
}

// อัปโหลดและบีบอัดรูปภาพทนายความอัตโนมัติ (Canvas Compression)
function handleLawyerPhotoUpload(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const maxDim = 500;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setVal('cmsAboutLawyerImage', compressedDataUrl);
      updateAboutLivePreview();
      showToast('อัปโหลดและแสดงตัวอย่างรูปภาพแล้ว อย่าลืมกดบันทึก CMS');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function handleSaveHotlineSettings(event) {
  event.preventDefault();
  const updated = {
    hotline: getVal('settingHotline'),
    business_hours: getVal('settingHours'),
    office_phone: getVal('settingOfficePhone'),
    line_id: getVal('settingLineId'),
    office_address: getVal('settingAddress'),
    visit_note: getVal('settingVisitNote'),
    maps_url: getVal('settingMapsUrl'),
    maps_embed: getVal('settingMapsEmbed')
  };

  try {
    await saveSiteSettingsToSupabase(updated);
    showToast('บันทึกข้อมูลสายด่วนและช่องทางติดต่อลง Supabase สำเร็จแล้ว!');
  } catch (err) {
    console.error('Save hotline error:', err);
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Supabase: ' + (err.message || err));
  }
}

async function handleResetSiteSettings() {
  if (confirm('ยืนยันคืนค่าข้อมูลการติดต่อกลับสู่ค่าเริ่มต้นใช่หรือไม่?')) {
    const defaultSettings = resetSiteSettings();
    await saveSiteSettingsToSupabase(defaultSettings);
    await loadAllSettingsToForm();
    showToast('คืนค่าข้อมูลเริ่มต้นเรียบร้อยแล้ว');
  }
}

// ==========================================================================
// 3. จัดการเนื้อหาหน้าเว็บไซต์ (Dynamic Content CMS)
// ==========================================================================

async function handleSaveCmsSettings(event) {
  event.preventDefault();

  const cmsData = {
    home_hero_title: getVal('cmsHomeHeroTitle'),
    home_hero_desc: getVal('cmsHomeHeroDesc'),
    home_start_price: getVal('cmsHomeStartPrice'),
    home_price_note: getVal('cmsHomePriceNote'),
    home_exp_years: getVal('cmsHomeExpYears'),
    home_cta_title: getVal('cmsHomeCtaTitle'),
    home_cta_desc: getVal('cmsHomeCtaDesc'),
    home_cta_btn_text: getVal('cmsHomeCtaBtnText'),
    home_cta_phone: getVal('cmsHomeCtaPhone'),

    about_title: getVal('cmsAboutTitle'),
    about_desc: getVal('cmsAboutDesc'),
    about_lawyer_name: getVal('cmsAboutLawyerName'),
    about_lawyer_title: getVal('cmsAboutLawyerTitle'),
    about_lawyer_exp: getVal('cmsAboutLawyerExp'),
    about_lawyer_image: getVal('cmsAboutLawyerImage'),
    about_exp_heading: getVal('cmsAboutExpHeading'),
    about_exp_item1: getVal('cmsAboutExpItem1'),
    about_exp_item2: getVal('cmsAboutExpItem2'),
    about_exp_item3: getVal('cmsAboutExpItem3'),
    about_exp_item4: getVal('cmsAboutExpItem4'),

    services_start_price: getVal('cmsServicesStartPrice'),
    services_area_note: getVal('cmsServicesAreaNote'),
    services_province_note: getVal('cmsServicesProvinceNote'),

    contact_note: getVal('cmsContactNote')
  };

  try {
    await saveSiteSettingsToSupabase(cmsData);
    showToast('บันทึกเนื้อหาทุกหน้าเว็บไซต์ (CMS) ลง Supabase สำเร็จแล้ว!');
  } catch (err) {
    console.error('Save CMS error:', err);
    alert('เกิดข้อผิดพลาดในการบันทึกเนื้อหาลง Supabase: ' + (err.message || err));
  }
}

// ==========================================================================
// 4. จัดลำดับเมนูนำทาง (Navbar Menu Sorting)
// ==========================================================================

function renderMenuSortList() {
  const container = document.getElementById('menuSortListContainer');
  const preview = document.getElementById('navbarLivePreview');
  if (!container || !preview) return;

  container.innerHTML = editableMenuItems.map((item, index) => `
    <div class="menu-sort-item">
      <div class="menu-info">
        <span class="menu-order-badge">${index + 1}</span>
        <div>
          <span class="menu-label-text">${escapeHtml(item.label)}</span>
          <span class="menu-url-text">(${escapeHtml(item.url)})</span>
        </div>
      </div>

      <div class="menu-actions">
        <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; margin-right: 8px; cursor: pointer;">
          <input type="checkbox" ${item.visible !== false ? 'checked' : ''} onchange="toggleMenuVisibility(${index})">
          <span>แสดงผล</span>
        </label>

        <button type="button" class="btn btn-outline btn-sm" onclick="moveMenuItem(${index}, -1)" ${index === 0 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''} title="ย้ายขึ้น">
          ⬆️ ขึ้น
        </button>
        <button type="button" class="btn btn-outline btn-sm" onclick="moveMenuItem(${index}, 1)" ${index === editableMenuItems.length - 1 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''} title="ย้ายลง">
          ⬇️ ลง
        </button>
      </div>
    </div>
  `).join('');

  // พรีวิวเมนู Navbar
  preview.innerHTML = editableMenuItems
    .filter(m => m.visible !== false)
    .map((m, idx) => `
      <span style="background: ${idx === 0 ? 'var(--primary-soft)' : 'transparent'}; color: ${idx === 0 ? 'var(--primary-dark)' : 'var(--text-main)'}; font-weight: 600; padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid ${idx === 0 ? 'var(--primary-light)' : 'var(--border-color)'}; font-size: 0.9rem;">
        ${escapeHtml(m.label)}
      </span>
    `).join('<span style="color: var(--text-light);">•</span>');
}

function moveMenuItem(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= editableMenuItems.length) return;

  const temp = editableMenuItems[index];
  editableMenuItems[index] = editableMenuItems[targetIndex];
  editableMenuItems[targetIndex] = temp;

  renderMenuSortList();
}

function toggleMenuVisibility(index) {
  editableMenuItems[index].visible = !editableMenuItems[index].visible;
  renderMenuSortList();
}

async function handleSaveMenuOrder() {
  try {
    await saveSiteSettingsToSupabase({ menu_order: editableMenuItems });
    showToast('บันทึกลำดับเมนูนำทาง (Navbar) ลง Supabase สำเร็จแล้ว!');
  } catch (err) {
    console.error('Save menu error:', err);
    alert('เกิดข้อผิดพลาดในการบันทึกลำดับเมนู: ' + (err.message || err));
  }
}

function handleResetMenuOrder() {
  if (confirm('ยืนยันคืนค่าลำดับเมนูนำทางกลับสู่ค่าเริ่มต้นใช่หรือไม่?')) {
    editableMenuItems = JSON.parse(JSON.stringify(DEFAULT_SITE_SETTINGS.menu_order));
    renderMenuSortList();
  }
}

// ==========================================================================
// 5. ระบบตรวจสอบและตั้งค่าการเชื่อมต่อ Supabase Database
// ==========================================================================

function updateSupabaseStatusDisplay() {
  const isConnected = isSupabaseConfigured();
  const banner = document.getElementById('sidebarStatusBanner');
  const text = document.getElementById('sidebarStatusText');
  const dot = document.getElementById('sidebarStatusDot');

  if (banner && text && dot) {
    if (isConnected) {
      banner.style.background = 'linear-gradient(135deg, #ecfdf5, #f0fdf4)';
      banner.style.borderColor = '#a7f3d0';
      text.style.color = '#065f46';
      text.textContent = 'Supabase Cloud Synced 🟢';
      dot.style.background = '#10b981';
    } else {
      banner.style.background = 'linear-gradient(135deg, #fffbeb, #fef3c7)';
      banner.style.borderColor = '#fde68a';
      text.style.color = '#92400e';
      text.textContent = 'ตั้งค่า Supabase URL 🟡';
      dot.style.background = '#f59e0b';
    }
  }
}

function openSupabaseModal() {
  const currentUrl = localStorage.getItem('supabase_project_url') || SUPABASE_CONFIG.url || '';
  const currentKey = localStorage.getItem('supabase_publishable_key') || SUPABASE_CONFIG.publishableKey || '';

  const urlInput = document.getElementById('modalSupabaseUrl');
  const keyInput = document.getElementById('modalSupabaseKey');

  if (urlInput) urlInput.value = currentUrl.includes('your-project-ref') ? '' : currentUrl;
  if (keyInput) keyInput.value = currentKey;

  const modal = document.getElementById('supabaseModal');
  if (modal) modal.classList.add('active');
}

function closeSupabaseModal() {
  const modal = document.getElementById('supabaseModal');
  if (modal) modal.classList.remove('active');
}

async function handleSaveSupabaseConfig(event) {
  event.preventDefault();
  const url = document.getElementById('modalSupabaseUrl').value.trim();
  const key = document.getElementById('modalSupabaseKey').value.trim();

  if (!url) {
    alert('กรุณากรอก Supabase Project URL (เช่น https://xyz.supabase.co)');
    return;
  }

  saveSupabaseConnectionSettings(url, key);
  closeSupabaseModal();
  updateSupabaseStatusDisplay();
  showToast('บันทึกการตั้งค่าเชื่อมต่อ Supabase เรียบร้อยแล้ว');
  await refreshAllAdminData();
}

async function handleTestSupabaseConnection() {
  const url = document.getElementById('modalSupabaseUrl').value.trim();
  const key = document.getElementById('modalSupabaseKey').value.trim();
  const testResultEl = document.getElementById('supabaseTestResult');

  if (!url || !key) {
    alert('กรุณากรอกทั้ง URL และ Key ก่อนทดสอบ');
    return;
  }

  if (testResultEl) {
    testResultEl.style.display = 'block';
    testResultEl.innerHTML = '<span style="color: #64748b;">⏳ กำลังทดสอบการเชื่อมต่อกับ Supabase...</span>';
  }

  try {
    const testClient = window.supabase.createClient(url, key);
    const { data, error } = await testClient.from('appointments').select('id').limit(1);

    if (error) {
      if (testResultEl) {
        testResultEl.innerHTML = `
          <div style="color: #dc2626; font-weight: 600;">❌ เชื่อมต่อไม่สำเร็จ: ${escapeHtml(error.message)}</div>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">หากยังไม่ได้สร้างตาราง ให้เปิด Supabase SQL Editor แล้วรันโค้ดจากไฟล์ <code>supabase_schema.sql</code></div>
        `;
      }
    } else {
      if (testResultEl) {
        testResultEl.innerHTML = `
          <div style="color: #059669; font-weight: 700;">✅ เชื่อมต่อสำเร็จ 100%! ตาราง appointments พร้อมใช้งาน</div>
        `;
      }
    }
  } catch (e) {
    if (testResultEl) {
      testResultEl.innerHTML = `<div style="color: #dc2626; font-weight: 600;">❌ เกิดข้อผิดพลาด: ${escapeHtml(e.message || e)}</div>`;
    }
  }
}

// ==========================================================================
// ตัวช่วยและ Utility Functions
// ==========================================================================

function setupEventListeners() {
  ['settingHotline', 'settingHours', 'settingLineId'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateHotlinePreview);
  });

  [
    'cmsHomeCtaTitle',
    'cmsHomeCtaDesc',
    'cmsHomeCtaBtnText',
    'cmsHomeCtaPhone'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateHomeCtaLivePreview);
  });

  [
    'cmsAboutLawyerName',
    'cmsAboutLawyerTitle',
    'cmsAboutLawyerExp',
    'cmsAboutLawyerImage',
    'cmsAboutExpHeading',
    'cmsAboutExpItem1',
    'cmsAboutExpItem2',
    'cmsAboutExpItem3',
    'cmsAboutExpItem4'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateAboutLivePreview);
  });

  // อัปโหลดไฟล์รูปภาพทนายความ
  const photoFileInput = document.getElementById('cmsAboutLawyerPhotoFile');
  if (photoFileInput) {
    photoFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleLawyerPhotoUpload(e.target.files[0]);
      }
    });
  }

  // ลบรูปภาพทนายความ (กลับไปใช้ไอคอน)
  const removePhotoBtn = document.getElementById('btnRemoveLawyerPhoto');
  if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', () => {
      setVal('cmsAboutLawyerImage', '');
      const fileInput = document.getElementById('cmsAboutLawyerPhotoFile');
      if (fileInput) fileInput.value = '';
      updateAboutLivePreview();
      showToast('ลบรูปภาพแล้ว (แสดงไอคอนเริ่มต้น)');
    });
  }

  // ปิด modal เมื่อคลิก backdrop
  window.addEventListener('click', (e) => {
    const detailModal = document.getElementById('detailModal');
    const statusModal = document.getElementById('statusModal');
    const supabaseModal = document.getElementById('supabaseModal');
    if (e.target === detailModal) closeDetailModal();
    if (e.target === statusModal) closeStatusModal();
    if (e.target === supabaseModal) closeSupabaseModal();
  });

  // ฟัง Custom Event เพื่อรีเฟรช Live Activity Log อัตโนมัติเมื่อเกิดกิจกรรมใหม่
  window.addEventListener('lawyer_activity_logged', () => {
    renderActivityLogs();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'lawyer_activity_logs') {
      renderActivityLogs();
    }
  });
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.value = val;
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function updateText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'");
}

/**
 * ระบบออกจากระบบผู้ดูแล (Admin Logout)
 */
function handleAdminLogout() {
  if (confirm('คุณต้องการออกจากระบบผู้ดูแลใช่หรือไม่?')) {
    if (typeof logActivity === 'function') {
      const email = localStorage.getItem('lawyer_admin_email') || 'ผู้ดูแลระบบ';
      logActivity('ออกจากระบบผู้ดูแล', `${email} ลงชื่อออกจากระบบ`, 'auth', '🚪');
    }
    localStorage.removeItem('lawyer_admin_authenticated');
    localStorage.removeItem('lawyer_admin_email');
    localStorage.removeItem('lawyer_admin_login_at');
    sessionStorage.clear();
    window.location.href = 'login.html?logout=true';
  }
}

// ==========================================================================
// 6. ระบบแสดงผลประวัติความเคลื่อนไหวสด (Live Activity Feed System)
// ==========================================================================

let currentActivityFilter = 'all';

function filterActivityLogs(filterType, btnEl) {
  currentActivityFilter = filterType;
  if (btnEl) {
    document.querySelectorAll('.activity-filter-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  renderActivityLogs(filterType);
}

function renderActivityLogs(filterType = currentActivityFilter) {
  const container = document.getElementById('activityLogsContainer');
  if (!container) return;

  const logs = typeof getActivityLogs === 'function' ? getActivityLogs() : [];

  // นับจำนวนแต่ละประเภท
  const counts = {
    all: logs.length,
    visit: 0,
    click: 0,
    booking: 0,
    status: 0,
    cms: 0,
    auth: 0
  };

  logs.forEach(item => {
    if (counts[item.type] !== undefined) {
      counts[item.type]++;
    }
  });

  // อัปเดตตัวเลขในปุ่มกรอง
  updateText('actCountAll', counts.all);
  updateText('actCountVisit', counts.visit);
  updateText('actCountClick', counts.click);
  updateText('actCountBooking', counts.booking);
  updateText('actCountStatus', counts.status);
  updateText('actCountCms', counts.cms);
  updateText('actCountAuth', counts.auth);

  // กรองตามประเภท
  const filtered = filterType === 'all' ? logs : logs.filter(l => l.type === filterType);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 8px;">🕊️</div>
        <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">ยังไม่มีประวัติความเคลื่อนไหวในหมวดนี้</div>
        <div style="font-size: 0.82rem; margin-top: 4px;">เมื่อมีการเปิดหน้าเว็บ กดโทร หรือยื่นข้อมูล ระบบจะตรวจจับและบันทึกแบบสดๆ ทันที</div>
      </div>
    `;
    return;
  }

  const badgeStyles = {
    visit: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
    click: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
    booking: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
    status: { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
    cms: { bg: '#cffafe', color: '#0e7490', border: '#a5f3fc' },
    auth: { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
    system: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
  };

  container.innerHTML = filtered.map(log => {
    const style = badgeStyles[log.type] || badgeStyles.system;
    return `
      <div class="activity-log-item" style="display: flex; align-items: flex-start; gap: 14px; padding: 12px 14px; border-bottom: 1px solid var(--border-light); transition: background 0.15s ease;">
        <div style="width: 36px; height: 36px; border-radius: 10px; background: ${style.bg}; border: 1px solid ${style.border}; color: ${style.color}; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
          ${log.icon || '⚡'}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 3px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">
                ${escapeHtml(log.action)}
              </span>
              <span style="font-size: 0.72rem; padding: 1px 7px; border-radius: 4px; background: ${style.bg}; color: ${style.color}; font-weight: 600; border: 1px solid ${style.border};">
                ${escapeHtml(log.page || 'ระบบ')}
              </span>
            </div>
            <span style="font-size: 0.76rem; color: var(--text-muted); background: #f8fafc; padding: 2px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-variant-numeric: tabular-nums;">
              🕒 ${escapeHtml(log.timeFormatted || '')} • ${escapeHtml(log.dateFormatted || '')}
            </span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; word-break: break-word;">
            ${escapeHtml(log.details || '-')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ผูกเข้ากับ window สำหรับเรียกใช้จาก HTML
window.renderActivityLogs = renderActivityLogs;
window.filterActivityLogs = filterActivityLogs;
