/* ==========================================================================
   AquaPure Water Station | Direct Piped Water Supply & Connection Utility Engine
   - ថ្លៃសេវាតភ្ជាប់ទុយោតាមផ្ទះ (Home Connection Fee): 450,000 ៛ (Cambodian Riel)
   - ថ្លៃសេវាទុយោផ្ទាល់រោងចក្រ (Factory Direct Pipeline Fee): 1,500,000 ៛ (Cambodian Riel)
   - តម្លៃទឹកស្អាតតាមកុងទ័រ (Metered Water Consumption Rate): 1 m³ = 2,500 ៛ (Cambodian Riel)
   ========================================================================== */

const RATE_PER_M3 = 2500;            // 2,500 Riel per cubic meter
const FEE_HOME_CONNECT = 450000;       // 450,000 Riel for Home connection service
const FEE_COMPANY_CONNECT = 1500000;   // 1,500,000 Riel for Factory direct station connection

const USER_ROLES = {
  admin: { label: 'Administrator', name: 'ប្រធានប្រតិបត្តិការ', permissions: ['viewDashboard', 'createPayment', 'exportReports', 'resetData', 'approveRegistrations', 'manageUsers'] },
  clerk: { label: 'Clerk', name: 'បុគ្គលិកបេឡា', permissions: ['viewDashboard', 'createPayment'] },
  finance: { label: 'Finance', name: 'បុគ្គលិកហិរញ្ញវត្ថុ', permissions: ['viewDashboard', 'exportReports'] },
  user: { label: 'Normal User', name: 'អតិថិជនទូទៅ', permissions: ['createPayment'] }
};

const DEFAULT_USERS = [
  { id: 'USR-ADMIN', name: 'ប្រធានប្រតិបត្តិការ', email: 'admin@aquapure.kh', password: 'admin123', role: 'admin', protected: true },
  { id: 'USR-CLERK', name: 'បុគ្គលិកបេឡា', email: 'clerk@aquapure.kh', password: 'clerk123', role: 'clerk' },
  { id: 'USR-FINANCE', name: 'បុគ្គលិកហិរញ្ញវត្ថុ', email: 'finance@aquapure.kh', password: 'finance123', role: 'finance' },
  { id: 'USR-NORMAL', name: 'អតិថិជនទូទៅ', email: 'user@aquapure.kh', password: 'user123', role: 'user' }
];

function getStoredRole() {
  const role = localStorage.getItem('aquapure_role');
  return USER_ROLES[role] ? role : 'admin';
}

function getStoredUsers() {
  const storedUsers = JSON.parse(localStorage.getItem('aquapure_users') || 'null');
  if (!Array.isArray(storedUsers)) return DEFAULT_USERS;
  const existingEmails = new Set(storedUsers.map(user => user.email));
  return [...storedUsers, ...DEFAULT_USERS.filter(user => !existingEmails.has(user.email))];
}

function hasPermission(permission) {
  const role = USER_ROLES[appState.auth.user.role] || USER_ROLES.user;
  return appState.auth.isLoggedIn && role.permissions.includes(permission);
}

// Format Riel currency (e.g., "450,000 ៛")
function formatRiel(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) amount = 0;
  return Math.round(amount).toLocaleString('en-US') + ' ៛';
}

// Format m³ (e.g., "10.0 m³")
function formatM3(val) {
  if (isNaN(val) || val === null || val === undefined) val = 0;
  return val.toFixed(1) + ' m³';
}

// Khmer month names formatter
function formatMonthLabel(month) {
  if (!month || month === 'Unknown') return 'ខែមិនស្គាល់';
  const [y, m] = month.split('-');
  const khmerMonths = [
    'មករា (Jan)', 'កុម្ភៈ (Feb)', 'មីនា (Mar)', 'មេសា (Apr)',
    'ឧសភា (May)', 'មិថុនា (Jun)', 'កក្កដា (Jul)', 'សីហា (Aug)',
    'កញ្ញា (Sep)', 'តុលា (Oct)', 'វិច្ឆិកា (Nov)', 'ធ្នូ (Dec)'
  ];
  return `ខែ${khmerMonths[parseInt(m, 10) - 1]} ឆ្នាំ${y}`;
}

function getStatusLabel(status) {
  if (status === 'Completed') return 'បានទូទាត់ (Paid)';
  if (status === 'Failed') return 'មិនទាន់ទូទាត់ (Unpaid)';
  if (status === 'Rejected') return 'ត្រូវបានបដិសេធ (Rejected)';
  return 'រង់ចាំ (Pending)';
}

function formatLocalDateTime(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const parts = formatter.formatToParts(date);
  const values = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') values[part.type] = part.value;
  });

  const month = values.month || '00';
  const day = values.day || '00';
  const hour = values.hour || '00';
  const minute = values.minute || '00';
  const period = values.dayPeriod || 'AM';

  return `${day}/${month} | ${hour}:${minute} ${period.toLowerCase()}`;
}

// --- Default Piped Water Customer Dataset (Connections & Meter Billing) ---
const DEFAULT_CUSTOMERS = [
  {
    id: "BILL-894201",
    meterId: "MTR-1082",
    name: "សុខ ពិសិដ្ឋ (Sok Piseth)",
    email: "piseth.sok@gmail.com",
    phone: "+855 12 234 567",
    company: "គេហដ្ឋាន សុខ ពិសិដ្ឋ",
    address: "ផ្ទះលេខ ៧៤២, ផ្លូវ ៦៣, សង្កាត់បឹងកេងកង១",
    city: "រាជធានីភ្នំពេញ (Phnom Penh)",
    state: "ខណ្ឌចំការមន (Chamkarmon)",
    zip: "12302",
    country: "កម្ពុជា (Cambodia)",
    serviceType: "residential_new",
    serviceTypeName: "សេវាតភ្ជាប់ទុយោតាមផ្ទះ (Home Connect)",
    connectionFee: 450000,
    containerType: "ទុយោតាមផ្ទះ (1/2\" Line)",
    deliverySlot: "វដ្តដើមខែ (ថ្ងៃទី ១ - ៥ ដើមខែ)",
    cubicMeters: 12.5,
    notes: "តភ្ជាប់ទុយោថ្មីតាមផ្ទះ។ កប់ទុយោ និងដំឡើងប្រអប់នាឡិកាទឹកស្អាតលើជញ្ជាំងមុខផ្ទះរួចរាល់។",
    packageName: "ការប្រើប្រាស់តាមផ្ទះ (Residential)",
    amount: 31250,
    hasExpressAddon: false,
    addonPrice: 0,
    hasWashAddon: true,
    washPrice: 8000,
    hasAlkalineAddon: false,
    alkalinePrice: 0,
    tax: 0,
    total: 489250, // 450,000 (connect) + 31,250 (water) + 8,000 (wash)
    cardLast4: "4242",
    cardBrand: "Visa",
    status: "Completed",
    date: "2026-08-13 09:15",
    month: "2026-08",
    batchId: "AQ-PIPE-2026-99"
  },
  {
    id: "BILL-773194",
    meterId: "MTR-2041",
    name: "ចាន់ សុភ័ក្ត្រ (Chan Sopheak)",
    email: "sopheak@vancecapital.kh",
    phone: "+855 23 890 123",
    company: "អគារ Vance Capital",
    address: "អគារលេខ ១១៨, មហាវិថីព្រះនរោត្តម, ជាន់ទី ៣",
    city: "រាជធានីភ្នំពេញ (Phnom Penh)",
    state: "ខណ្ឌដូនពេញ (Daun Penh)",
    zip: "12201",
    country: "កម្ពុជា (Cambodia)",
    serviceType: "company_new",
    serviceTypeName: "ទុយោផ្ទាល់រោងចក្រ (Factory Direct)",
    connectionFee: 1500000,
    containerType: "ទុយោរោងចក្រ/ការិយាល័យ (1\" Line)",
    deliverySlot: "វដ្តដើមខែ (ថ្ងៃទី ១ - ៥ ដើមខែ)",
    cubicMeters: 25.0,
    notes: "បណ្តាញទុយោឧស្សាហកម្មខ្នាត 1\" បូមផ្ទាល់ពីស្ថានីយមេ Dara Pichmony Water Station ចូលរោងចក្រ/អគារ។",
    packageName: "ការិយាល័យ/ពាណិជ្ជកម្ម (Commercial Office)",
    amount: 62500,
    hasExpressAddon: true,
    addonPrice: 5000,
    hasWashAddon: true,
    washPrice: 8000,
    hasAlkalineAddon: true,
    alkalinePrice: 6000,
    tax: 0,
    total: 1581500, // 1,500,000 (connect) + 62,500 (water) + 19,000 (addons)
    cardLast4: "5521",
    cardBrand: "Mastercard",
    status: "Completed",
    date: "2026-08-12 16:40",
    month: "2026-08",
    batchId: "AQ-PIPE-2026-98"
  },
  {
    id: "BILL-610492",
    meterId: "MTR-3094",
    name: "គង់ សារិទ្ធ (Kong Sarith)",
    email: "sarith@lumendesign.co",
    phone: "+855 12 341 998",
    company: "រោងចក្រ Lumen Studio",
    address: "ផ្ទះលេខ ៤៥០, ផ្លូវ ៦៣, សង្កាត់បឹងកេងកង១",
    city: "រាជធានីភ្នំពេញ (Phnom Penh)",
    state: "ខណ្ឌចំការមន (Chamkarmon)",
    zip: "12302",
    country: "កម្ពុជា (Cambodia)",
    serviceType: "company_new",
    serviceTypeName: "ទុយោផ្ទាល់រោងចក្រ (Factory Direct)",
    connectionFee: 1500000,
    containerType: "ទុយោឧស្សាហកម្មផ្ទាល់ពីស្ថានីយ (2\" Line)",
    deliverySlot: "វដ្តដើមខែ (ថ្ងៃទី ១ - ៥ ដើមខែ)",
    cubicMeters: 50.0,
    notes: "ទុយោឧស្សាហកម្មទំហំ 2\" សម្រាប់រោងចក្រ និងកន្លែងផលិតកម្ម។",
    packageName: "រោងចក្រ/ឧស្សាហកម្ម (Industrial Facility)",
    amount: 125000,
    hasExpressAddon: true,
    addonPrice: 5000,
    hasWashAddon: false,
    washPrice: 0,
    hasAlkalineAddon: false,
    alkalinePrice: 0,
    tax: 0,
    total: 1630000, // 1,500,000 + 125,000 + 5,000
    cardLast4: "3782",
    cardBrand: "Amex",
    status: "Completed",
    date: "2026-08-11 11:20",
    month: "2026-08",
    batchId: "AQ-PIPE-2026-95"
  },
  {
    id: "BILL-509183",
    meterId: "MTR-4019",
    name: "ម៉ៅ ដារ៉ូ (Mao Daro)",
    email: "daro.mao@innovatelabs.kh",
    phone: "+855 16 789 012",
    company: "គេហដ្ឋាន ម៉ៅ ដារ៉ូ",
    address: "ផ្ទះលេខ ៨, ផ្លូវទន្លេបាសាក់, សង្កាត់ទន្លេបាសាក់",
    city: "រាជធានីភ្នំពេញ (Phnom Penh)",
    state: "ខណ្ឌចំការមន (Chamkarmon)",
    zip: "12301",
    country: "កម្ពុជា (Cambodia)",
    serviceType: "existing_bill",
    serviceTypeName: "បង់ថ្លៃទឹកប្រចាំខែ (Monthly Usage)",
    connectionFee: 0,
    containerType: "ទុយោតាមផ្ទះ (1/2\" Line)",
    deliverySlot: "វដ្តដើមខែ (ថ្ងៃទី ១ - ៥ ដើមខែ)",
    cubicMeters: 8.5,
    notes: "កុងទ័រទឹកផ្ទះកំពុងដំណើរការ។ បង់ថ្លៃទឹកប្រចាំខែធម្មតា។",
    packageName: "ការប្រើប្រាស់តាមផ្ទះ (Residential)",
    amount: 21250,
    hasExpressAddon: false,
    addonPrice: 0,
    hasWashAddon: false,
    washPrice: 0,
    hasAlkalineAddon: false,
    alkalinePrice: 0,
    tax: 0,
    total: 21250,
    cardLast4: "4242",
    cardBrand: "Visa",
    status: "Completed",
    date: "2026-08-10 14:05",
    month: "2026-08",
    batchId: "AQ-PIPE-2026-91"
  },
  {
    id: "BILL-441092",
    meterId: "MTR-5028",
    name: "រ៉ាឆែល អាដាម (Rachel Adams)",
    email: "rachel@adamslaw.com.kh",
    phone: "+855 17 671 224",
    company: "ការិយាល័យ Adams",
    address: "អគារលេខ ១០០, មហាវិថីសហព័ន្ធរុស្ស៊ី",
    city: "រាជធានីភ្នំពេញ (Phnom Penh)",
    state: "ខណ្ឌទួលគោក (Toul Kork)",
    zip: "12102",
    country: "កម្ពុជា (Cambodia)",
    serviceType: "existing_bill",
    serviceTypeName: "បង់ថ្លៃទឹកប្រចាំខែ (Monthly Usage)",
    connectionFee: 0,
    containerType: "ទុយោរោងចក្រ/ការិយាល័យ (1\" Line)",
    deliverySlot: "វដ្តដើមខែ (ថ្ងៃទី ១ - ៥ ដើមខែ)",
    cubicMeters: 15.0,
    notes: "កាតធនាគារផុតសុពលភាពពេលកាត់ប្រាក់ប្រចាំខែ។",
    packageName: "ការិយាល័យ/ពាណិជ្ជកម្ម (Commercial Office)",
    amount: 37500,
    hasExpressAddon: false,
    addonPrice: 0,
    hasWashAddon: false,
    washPrice: 0,
    hasAlkalineAddon: false,
    alkalinePrice: 0,
    tax: 0,
    total: 37500,
    cardLast4: "4002",
    cardBrand: "Visa",
    status: "Failed",
    date: "2026-08-09 18:30",
    month: "2026-08",
    batchId: "AQ-PIPE-2026-88"
  },
  {
    id: "BILL-329104",
    meterId: "MTR-6072",
    name: "ថូម៉ាស មូល័រ (Thomas Mueller)",
    email: "t.mueller@techkraft.kh",
    phone: "+855 11 123 456",
    company: "រោងចក្រ Techkraft Cambodia",
    address: "អគារលេខ ១០០, មហាវិថីម៉ៅសេទុង",
    city: "រាជធានីភ្នំពេញ (Phnom Penh)",
    state: "ខណ្ឌចំការមន (Chamkarmon)",
    zip: "12303",
    country: "កម្ពុជា (Cambodia)",
    serviceType: "company_new",
    serviceTypeName: "ទុយោផ្ទាល់រោងចក្រ (Factory Direct)",
    connectionFee: 1500000,
    containerType: "ទុយោឧស្សាហកម្មផ្ទាល់ពីស្ថានីយ (2\" Line)",
    deliverySlot: "វដ្តដើមខែ (ថ្ងៃទី ១ - ៥ ដើមខែ)",
    cubicMeters: 100.0,
    notes: "ទុយោបូមផ្ទាល់កម្រិតឧស្សាហកម្មខ្នាត 2\" តភ្ជាប់ពីស្ថានីយមេចូលរោងចក្រ។",
    packageName: "រោងចក្រ/ឧស្សាហកម្ម (Industrial Facility)",
    amount: 250000,
    hasExpressAddon: true,
    addonPrice: 5000,
    hasWashAddon: true,
    washPrice: 8000,
    hasAlkalineAddon: false,
    alkalinePrice: 0,
    tax: 0,
    total: 1763000, // 1,500,000 + 250,000 + 13,000
    cardLast4: "4242",
    cardBrand: "Visa",
    status: "Completed",
    date: "2026-08-08 10:15",
    month: "2026-08",
    batchId: "AQ-PIPE-2026-80"
  },
  {
    id: "BILL-210491",
    meterId: "MTR-7083",
    name: "មាស សុភ័ក្រ (Meas Sopheak)",
    email: "sopheak.meas@gmail.com",
    phone: "+855 12 210 491",
    company: "គេហដ្ឋាន មាស សុភ័ក្រ",
    address: "ផ្ទះលេខ ២២, ផ្លូវ ២៧១, សង្កាត់ទួលទំពូង",
    city: "រាជធានីភ្នំពេញ (Phnom Penh)",
    state: "ខណ្ឌចំការមន (Chamkarmon)",
    zip: "12311",
    country: "កម្ពុជា (Cambodia)",
    serviceType: "residential_new",
    serviceTypeName: "សេវាតភ្ជាប់ទុយោតាមផ្ទះ (Home Connect)",
    connectionFee: 450000,
    containerType: "ទុយោតាមផ្ទះ (1/2\" Line)",
    deliverySlot: "វដ្តដើមខែ (ថ្ងៃទី ១ - ៥ ដើមខែ)",
    cubicMeters: 9.0,
    notes: "តភ្ជាប់ទុយោថ្មី និងដំឡើងនាឡិកាទឹកស្អាតតាមផ្ទះ។",
    packageName: "ការប្រើប្រាស់តាមផ្ទះ (Residential)",
    amount: 22500,
    hasExpressAddon: false,
    addonPrice: 0,
    hasWashAddon: false,
    washPrice: 0,
    hasAlkalineAddon: false,
    alkalinePrice: 0,
    tax: 0,
    total: 472500, // 450,000 + 22,500
    cardLast4: "4242",
    cardBrand: "Visa",
    status: "Completed",
    date: "2026-07-31 09:05",
    month: "2026-07",
    batchId: "AQ-PIPE-2026-75"
  },
  {
    id: "BILL-110293",
    meterId: "MTR-8095",
    name: "កែវ វិសាល (Keo Visal)",
    email: "visal@keoproperty.kh",
    phone: "+855 15 110 293",
    company: "អាផាតមិន កែវ វិសាល",
    address: "មហាវិថី ១០១៩, សង្កាត់ភ្នំពេញថ្មី",
    city: "រាជធានីភ្នំពេញ (Phnom Penh)",
    state: "ខណ្ឌសែនសុខ (Sen Sok)",
    zip: "12000",
    country: "កម្ពុជា (Cambodia)",
    serviceType: "existing_bill",
    serviceTypeName: "បង់ថ្លៃទឹកប្រចាំខែ (Monthly Usage)",
    connectionFee: 0,
    containerType: "ទុយោកុងទ័ររងបន្ទប់ជួល/ខុនដូ",
    deliverySlot: "វដ្តដើមខែ (ថ្ងៃទី ១ - ៥ ដើមខែ)",
    cubicMeters: 75.0,
    notes: "វិក្កយបត្រកុងទ័រទឹកប្រើប្រាស់ប្រចាំខែរបស់អាគារអាផាតមិន។",
    packageName: "រោងចក្រ/ឧស្សាហកម្ម (Industrial Facility)",
    amount: 187500,
    hasExpressAddon: false,
    addonPrice: 0,
    hasWashAddon: true,
    washPrice: 8000,
    hasAlkalineAddon: false,
    alkalinePrice: 0,
    tax: 0,
    total: 195500,
    cardLast4: "1234",
    cardBrand: "Visa",
    status: "Completed",
    date: "2026-07-28 11:00",
    month: "2026-07",
    batchId: "AQ-PIPE-2026-65"
  }
];

// --- Global Application State ---
let appState = {
  currentView: 'home',
  currentStep: 1,
  currentTheme: localStorage.getItem('aquapure_theme') || 'dark',
  customers: JSON.parse(localStorage.getItem('aquapure_customers')) || DEFAULT_CUSTOMERS,
  users: getStoredUsers(),
  
  // Authentication State
  auth: {
    isLoggedIn: sessionStorage.getItem('aquapure_auth') === 'true',
    user: {
      name: 'ប្រធានប្រតិបត្តិការ',
      email: 'admin@aquapure.kh',
      role: sessionStorage.getItem('aquapure_role') || getStoredRole()
    }
  },

  // Active Order / Meter Intake Form Data
  formData: {
    serviceType: 'residential_new', // 'residential_new', 'company_new', 'existing_bill'
    serviceTypeName: 'សេវាតភ្ជាប់ទុយោតាមផ្ទះ (Home Connect)',
    fullName: '',
    email: '',
    phone: '',
    meterId: 'MTR-1082',
    company: '',
    address: '',
    city: 'រាជធានីភ្នំពេញ (Phnom Penh)',
    state: 'ខណ្ឌចំការមន (Chamkarmon)',
    zip: '12302',
    containerType: 'ទុយោតាមផ្ទះ (1/2" Line)',
    deliverySlot: 'វដ្តដើមខែ (ថ្ងៃទី ១ - ៥ ដើមខែ)',
    notes: ''
  },

  // Active Order Plan & Financials
  order: {
    serviceType: 'residential_new',
    connectionFee: FEE_HOME_CONNECT,
    packageId: 'residential',
    packageName: 'ការប្រើប្រាស់តាមផ្ទះ (Residential)',
    packageDesc: 'ទឹកស្អាតតាមទុយោផ្ទាល់ @ 2,500 ៛/m³',
    cubicMeters: 0.0,
    basePrice: 25000,
    hasExpressAddon: false,
    addonExpressPrice: 5000,
    hasWashAddon: false,
    addonWashPrice: 8000,
    hasAlkalineAddon: false,
    addonAlkalinePrice: 6000,
    subtotal: 475000,
    total: 475000
  },

  // Payment State
  payment: {
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardBrand: 'Visa',
    cardLast4: '4242',
    testPresetMode: 'success',
    lastTxnId: null
  }
};

// Initialize App on DOM Ready
function initDashboardSlides() {
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const dots = Array.from(document.querySelectorAll('.slide-dot'));
  if (!slides.length) return;

  let activeIndex = 0;
  const showSlide = (nextIndex) => {
    activeIndex = nextIndex;
    slides.forEach((slide, index) => {
      slide.classList.toggle('active', index === activeIndex);
    });
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === activeIndex);
    });
  };

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => showSlide(index));
  });

  setInterval(() => {
    const nextIndex = (activeIndex + 1) % slides.length;
    showSlide(nextIndex);
  }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDashboardSlides();
  recalculateTotals();
  renderPublicDashboard();
  renderAdminMetrics();
  renderMonthlyTotals();
  renderAdminTable();
  updateAuthUI();
  updateBadgeCount();
  lucide.createIcons();
});

// --- Theme Management ---
function initTheme() {
  document.documentElement.setAttribute('data-theme', appState.currentTheme);
  updateThemeIcon();
}

function toggleTheme() {
  appState.currentTheme = appState.currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('aquapure_theme', appState.currentTheme);
  document.documentElement.setAttribute('data-theme', appState.currentTheme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const isDark = appState.currentTheme === 'dark';
  toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  toggle.setAttribute('aria-pressed', String(!isDark));
  toggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  // Lucide replaces <i> nodes with SVGs. Recreate the placeholder so the
  // icon changes correctly on every theme switch.
  const icon = document.getElementById('theme-icon');
  if (icon) icon.outerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" id="theme-icon"></i>`;
  if (window.lucide) lucide.createIcons();
}

// --- Navigation & View Switching ---
function switchTab(tabName) {
  if ((tabName === 'checkout' || tabName === 'admin') && !appState.auth.isLoggedIn) {
    openLoginModal();
    return;
  }

  if (tabName === 'checkout' && !hasPermission('createPayment')) {
    alert('សិទ្ធិ Finance អាចមើលទិន្នន័យហិរញ្ញវត្ថុ និងទាញយករបាយការណ៍បានតែប៉ុណ្ណោះ។');
    return;
  }

  if (tabName === 'admin' && !hasPermission('viewDashboard')) {
    alert('គណនី Normal User អាចមើលវិក្កយបត្រ និងបង់ប្រាក់បានតែប៉ុណ្ណោះ។');
    tabName = 'home';
  }

  appState.currentView = tabName;

  const tabs = ['home', 'company', 'checkout', 'admin'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const view = document.getElementById(`view-${t}`);
    if (btn) btn.classList.remove('active');
    if (view) view.classList.remove('active');
  });

  const activeBtn = document.getElementById(`tab-${tabName}`);
  const activeView = document.getElementById(`view-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activeView) activeView.classList.add('active');

  if (tabName === 'home') {
    renderPublicDashboard();
  } else if (tabName === 'admin') {
    checkAdminAccess();
  }

  lucide.createIcons();
  updatePendingApprovalAlert();
  updateCheckoutRoleUI();
  if (hasPermission('manageUsers')) renderUserManagement();
}

function updateCheckoutRoleUI() {
  const isClerkNewRegistration = appState.auth.user.role === 'clerk' && appState.formData.serviceType !== 'existing_bill';
  const paymentStep = document.getElementById('step-node-3');
  const paymentLine = document.getElementById('step-line-2');
  const paymentView = document.getElementById('form-step-3');
  const continueButton = document.getElementById('step2-continue-button');

  [paymentStep, paymentLine, paymentView].forEach(element => {
    if (element) element.classList.toggle('hidden', isClerkNewRegistration);
  });
  if (continueButton) {
    continueButton.innerHTML = isClerkNewRegistration
      ? 'ដាក់ស្នើការចុះឈ្មោះ <i data-lucide="send"></i>'
      : 'បន្តទៅការទូទាត់ប្រាក់ <i data-lucide="arrow-right"></i>';
  }
  lucide.createIcons();
}

// Start connection order from public dashboard card
function startConnectionOrder(serviceType) {
  restartIntake();
  selectServiceCard(serviceType);
  switchTab('checkout');
}

// Select service card with visual indicator
function selectServiceCard(val) {
  const cards = {
    'residential_new': document.getElementById('scard-residential'),
    'company_new': document.getElementById('scard-company'),
    'existing_bill': document.getElementById('scard-existing')
  };

  Object.values(cards).forEach(c => {
    if (c) c.classList.remove('active');
  });

  if (cards[val]) {
    cards[val].classList.add('active');
  }

  const hiddenInput = document.getElementById('serviceType');
  if (hiddenInput) hiddenInput.value = val;

  handleServiceTypeChange(val);
}

// Service type change handler
function handleServiceTypeChange(val) {
  appState.formData.serviceType = val;
  appState.order.serviceType = val;

  const containerSelect = document.getElementById('containerType');

  if (val === 'residential_new') {
    appState.order.connectionFee = FEE_HOME_CONNECT;
    appState.formData.serviceTypeName = 'សេវាតភ្ជាប់ទុយោតាមផ្ទះ (Home Connect)';
    if (containerSelect) containerSelect.value = 'ទុយោតាមផ្ទះ (1/2" Line)';
  } else if (val === 'company_new') {
    appState.order.connectionFee = FEE_COMPANY_CONNECT;
    appState.formData.serviceTypeName = 'ទុយោផ្ទាល់រោងចក្រ (Factory Direct)';
    if (containerSelect) containerSelect.value = 'ទុយោរោងចក្រ/ការិយាល័យ (1" Line)';
  } else {
    appState.order.connectionFee = 0;
    appState.formData.serviceTypeName = 'បង់ថ្លៃទឹកប្រចាំខែ (Monthly Usage)';
  }

  updateStep2FeeBanner();
  recalculateTotals();
  updateCheckoutRoleUI();
}

function updateStep2FeeBanner() {
  const badge = document.getElementById('step2-fee-badge');
  const banner = document.getElementById('connection-fee-banner');
  const title = document.getElementById('fee-banner-title');
  const desc = document.getElementById('fee-banner-desc');
  const price = document.getElementById('fee-banner-price');

  if (badge) badge.textContent = formatRiel(appState.order.connectionFee);

  if (banner) {
    if (appState.order.connectionFee === 0) {
      banner.style.display = 'none';
    } else {
      banner.style.display = 'flex';
      if (appState.order.serviceType === 'residential_new') {
        if (title) title.textContent = 'ថ្លៃសេវាតភ្ជាប់ទុយោទឹកតាមផ្ទះ (Home Connection Fee)';
        if (desc) desc.textContent = 'រួមបញ្ចូលទាំងការកប់ទុយោ 1/2", ដំឡើងនាឡិកាទឹកអេឡិចត្រូនិច និងតេស្តសម្ពាធទឹក។';
        if (price) price.textContent = formatRiel(FEE_HOME_CONNECT);
      } else {
        if (title) title.textContent = 'ថ្លៃសេវាទុយោផ្ទាល់រោងចក្រ (Factory Direct Line Fee)';
        if (desc) desc.textContent = 'រួមបញ្ចូលបណ្តាញទុយោឧស្សាហកម្មកម្លាំងខ្នាត 1\" បូមផ្ទាល់ពីស្ថានីយមេ Dara Pichmony Water Station ចូលរោងចក្រជាមួយនាឡិកាទឹកស្តង់ដារ។';
        if (price) price.textContent = formatRiel(FEE_COMPANY_CONNECT);
      }
    }
  }
}

// --- Authentication & Operations Access ---
function updateAuthUI() {
  const btnLogin = document.getElementById('btn-open-login');
  const userPill = document.getElementById('logged-in-badge');
  const gate = document.getElementById('admin-login-gate');
  const authContent = document.getElementById('admin-authenticated-content');
  const adminTab = document.getElementById('tab-admin');
  const checkoutTab = document.getElementById('tab-checkout');
  const publicEmployeeMetrics = document.getElementById('public-employee-metrics');
  const paymentButtons = document.querySelectorAll('[data-permission="createPayment"]');
  const resetButton = document.getElementById('reset-sample-data-btn');
  const exportButtons = document.querySelectorAll('[data-permission="exportReports"]');
  const userManagementPanel = document.getElementById('user-management-panel');
  const userRole = document.getElementById('user-role');
  const userName = document.getElementById('user-display-name');
  const roleInfo = USER_ROLES[appState.auth.user.role] || USER_ROLES.user;

  if (appState.auth.isLoggedIn) {
    if (btnLogin) btnLogin.classList.add('hidden');
    if (userPill) userPill.classList.remove('hidden');
    if (gate) gate.classList.add('hidden');
    if (authContent) authContent.classList.remove('hidden');
    if (adminTab) adminTab.classList.toggle('hidden', !hasPermission('viewDashboard'));
    if (checkoutTab) checkoutTab.classList.toggle('hidden', !hasPermission('createPayment'));
    if (publicEmployeeMetrics) publicEmployeeMetrics.classList.remove('hidden');
    paymentButtons.forEach(button => button.classList.toggle('hidden', !hasPermission('createPayment')));
    if (resetButton) resetButton.classList.toggle('hidden', !hasPermission('resetData'));
    exportButtons.forEach(button => button.classList.toggle('hidden', !hasPermission('exportReports')));
    if (userManagementPanel) userManagementPanel.classList.toggle('hidden', !hasPermission('manageUsers'));
    if (userName) userName.textContent = roleInfo.name;
    if (userRole) userRole.textContent = roleInfo.label;
  } else {
    if (btnLogin) btnLogin.classList.remove('hidden');
    if (userPill) userPill.classList.add('hidden');
    if (gate) gate.classList.remove('hidden');
    if (authContent) authContent.classList.add('hidden');
    if (adminTab) adminTab.classList.add('hidden');
    if (checkoutTab) checkoutTab.classList.add('hidden');
    if (publicEmployeeMetrics) publicEmployeeMetrics.classList.add('hidden');
    paymentButtons.forEach(button => button.classList.add('hidden'));
    if (resetButton) resetButton.classList.add('hidden');
    exportButtons.forEach(button => button.classList.add('hidden'));
    if (userManagementPanel) userManagementPanel.classList.add('hidden');
  }

  lucide.createIcons();
  updatePendingApprovalAlert();
}

function checkAdminAccess() {
  updateAuthUI();
  if (hasPermission('viewDashboard')) {
    renderAdminMetrics();
    renderMonthlyTotals();
    renderAdminTable();
    renderUserManagement();
  }
}

function openLoginModal() {
  const modal = document.getElementById('login-modal');
  const errorAlert = document.getElementById('login-error-alert');
  if (errorAlert) errorAlert.classList.add('hidden');
  if (modal) modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.classList.add('hidden');
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;

  const account = appState.users.find(user => user.email.toLowerCase() === email.toLowerCase());
  if (account && account.password === password) {
    performLoginSuccess(account.email, account.role);
  } else {
    const errorAlert = document.getElementById('login-error-alert');
    if (errorAlert) errorAlert.classList.remove('hidden');
  }
}

function quickDemoAdminLogin() {
  performLoginSuccess('admin@aquapure.kh', 'admin');
}

function quickDemoClerkLogin() {
  performLoginSuccess('clerk@aquapure.kh', 'clerk');
}

function quickDemoFinanceLogin() {
  performLoginSuccess('finance@aquapure.kh', 'finance');
}

function quickDemoUserLogin() {
  performLoginSuccess('user@aquapure.kh', 'user');
}

function performLoginSuccess(email, role) {
  appState.auth.isLoggedIn = true;
  appState.auth.user.email = email;
  appState.auth.user.role = role;
  appState.auth.user.name = USER_ROLES[role].name;
  sessionStorage.setItem('aquapure_auth', 'true');
  sessionStorage.setItem('aquapure_role', role);
  closeLoginModal();
  updateAuthUI();
  switchTab(hasPermission('viewDashboard') ? 'admin' : 'home');
  
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#06B6D4', '#10B981', '#38BDF8']
    });
  }
}

function logoutAdmin() {
  appState.auth.isLoggedIn = false;
  sessionStorage.removeItem('aquapure_auth');
  sessionStorage.removeItem('aquapure_role');
  localStorage.removeItem('aquapure_auth');
  localStorage.removeItem('aquapure_role');
  appState.auth.user.role = 'user';
  updateAuthUI();
  switchTab('home');
}

function saveUsers() {
  localStorage.setItem('aquapure_users', JSON.stringify(appState.users));
}

function renderUserManagement() {
  const body = document.getElementById('user-management-body');
  if (!body) return;
  body.innerHTML = appState.users.map(user => `
    <tr>
      <td><strong>${escapeHtml(user.name)}</strong><br><span class="text-muted">${escapeHtml(user.email)}</span></td>
      <td><span class="role-chip role-${user.role}">${USER_ROLES[user.role].label}</span></td>
      <td class="text-right">
        <button class="btn btn-secondary btn-sm" onclick="editUser('${user.id}')"><i data-lucide="pencil"></i> កែប្រែ</button>
        ${user.protected ? '' : `<button class="btn btn-secondary btn-sm text-danger" onclick="deleteUser('${user.id}')"><i data-lucide="trash-2"></i> លុប</button>`}
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}

function resetUserForm() {
  document.getElementById('user-form')?.reset();
  const id = document.getElementById('user-edit-id');
  const title = document.getElementById('user-form-title');
  if (id) id.value = '';
  if (title) title.textContent = 'បង្កើតអ្នកប្រើប្រាស់ថ្មី';
}

function editUser(id) {
  if (!hasPermission('manageUsers')) return;
  const user = appState.users.find(item => item.id === id);
  if (!user || user.protected) {
    alert('គណនី Admin សំខាន់មិនអាចកែប្រែបានទេ។');
    return;
  }
  document.getElementById('user-edit-id').value = user.id;
  document.getElementById('user-name-input').value = user.name;
  document.getElementById('user-email-input').value = user.email;
  document.getElementById('user-password-input').value = user.password;
  document.getElementById('user-role-input').value = user.role;
  document.getElementById('user-form-title').textContent = 'កែប្រែអ្នកប្រើប្រាស់';
}

function handleUserFormSubmit(event) {
  event.preventDefault();
  if (!hasPermission('manageUsers')) return;
  const id = document.getElementById('user-edit-id').value;
  const name = document.getElementById('user-name-input').value.trim();
  const email = document.getElementById('user-email-input').value.trim().toLowerCase();
  const password = document.getElementById('user-password-input').value;
  const role = document.getElementById('user-role-input').value;
  if (!name || !email || !password || !USER_ROLES[role]) return;
  const duplicate = appState.users.find(user => user.email === email && user.id !== id);
  if (duplicate) {
    alert('អ៊ីមែលនេះមានអ្នកប្រើប្រាស់រួចហើយ។');
    return;
  }
  if (id) {
    const user = appState.users.find(item => item.id === id);
    if (user && !user.protected) Object.assign(user, { name, email, password, role });
  } else {
    appState.users.push({ id: `USR-${Date.now()}`, name, email, password, role });
  }
  saveUsers();
  renderUserManagement();
  resetUserForm();
}

function deleteUser(id) {
  if (!hasPermission('manageUsers')) return;
  const user = appState.users.find(item => item.id === id);
  if (!user || user.protected) return;
  if (!confirm(`តើអ្នកចង់លុបគណនី ${user.email} មែនទេ?`)) return;
  appState.users = appState.users.filter(item => item.id !== id);
  saveUsers();
  renderUserManagement();
}

// --- 1. Public Dashboard Metrics & Self-Service Lookup ---
function renderPublicDashboard() {
  const completed = appState.customers.filter(c => c.status === 'Completed');
  const totalRiel = completed.reduce((acc, c) => acc + c.total, 0);
  const totalM3 = completed.reduce((acc, c) => acc + (c.cubicMeters || 0), 0);
  const totalCustomers = appState.customers.length;

  const currentMonth = getCurrentMonth();
  const thisMonth = completed.filter(c => c.month === currentMonth);
  const thisMonthRiel = thisMonth.reduce((acc, c) => acc + c.total, 0);
  const thisMonthM3 = thisMonth.reduce((acc, c) => acc + (c.cubicMeters || 0), 0);

  const pubRev = document.getElementById('public-metric-revenue');
  const pubVol = document.getElementById('public-metric-volume');
  const pubCust = document.getElementById('public-metric-customers');
  const pubMonth = document.getElementById('public-metric-this-month');
  const pubMonthSub = document.getElementById('public-metric-this-month-sub');

  if (pubRev) pubRev.textContent = formatRiel(totalRiel);
  if (pubVol) pubVol.textContent = `${totalM3.toLocaleString()} m³`;
  if (pubCust) pubCust.textContent = totalCustomers;
  if (pubMonth) pubMonth.textContent = formatRiel(thisMonthRiel);
  if (pubMonthSub) pubMonthSub.innerHTML = `<i data-lucide="droplets"></i> ${thisMonthM3.toLocaleString()} m³ ខែនេះ`;

  lucide.createIcons();
}

function searchCustomerBill() {
  const query = document.getElementById('public-lookup-input')?.value.toLowerCase().trim();
  const container = document.getElementById('lookup-result-container');
  if (!container) return;

  if (!query) {
    alert("សូមបញ្ចូលលេខទូរស័ព្ទ, លេខកុងទ័រ (Meter ID) ឬលេខវិក្កយបត្រ ដើម្បីស្វែងរក។");
    return;
  }

  const match = appState.customers.find(c => 
    c.phone.toLowerCase().includes(query) || 
    (c.meterId && c.meterId.toLowerCase().includes(query)) ||
    c.id.toLowerCase().includes(query) ||
    c.email.toLowerCase().includes(query) ||
    c.name.toLowerCase().includes(query)
  );

  container.classList.remove('hidden');

  if (!match) {
    container.innerHTML = `
      <div class="lookup-not-found">
        <i data-lucide="alert-circle" class="text-warning" style="width: 32px; height: 32px; margin-bottom: 8px;"></i>
        <h4>រកមិនឃើញទិន្នន័យកុងទ័រទឹក ឬវិក្កយបត្រឡើយ</h4>
        <p>ពុំមានកំណត់ត្រាផ្គូផ្គងនឹង "<strong>${escapeHtml(query)}</strong>" ទេ។ សូមពិនិត្យលេខកុងទ័រ ឬលេខទូរស័ព្ទឡើងវិញ។</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const statusKhmer = getStatusLabel(match.status);

  container.innerHTML = `
    <div class="lookup-success-card">
      <div class="lookup-header-bar">
        <div>
          <span class="lookup-id-chip font-mono">វិក្កយបត្រ: ${match.id} • កុងទ័រ #${match.meterId || 'MTR-1082'}</span>
          <h3 style="margin-top: 4px; font-weight: 800;">${escapeHtml(match.name)}</h3>
          <span style="font-size: 0.8125rem; color: var(--text-muted);">${escapeHtml(match.address)} • ${escapeHtml(match.phone)}</span>
        </div>
        <div style="text-align: right;">
          <span class="status-badge ${match.status.toLowerCase().replace(/\s+/g, '-')}">${statusKhmer}</span>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">ខែគិតប្រាក់: ${formatMonthLabel(match.month || match.date?.substring(0,7))}</div>
        </div>
      </div>

      <div class="lookup-details-grid margin-top-md">
        <div class="detail-box">
          <span class="detail-label">ប្រភេទសេវាតភ្ជាប់</span>
          <strong class="detail-val text-cyan">${escapeHtml(match.serviceTypeName || 'ទុយោទឹកស្អាត')}</strong>
        </div>
        <div class="detail-box">
          <span class="detail-label">បរិមាណទឹកប្រើប្រាស់</span>
          <strong class="detail-val font-mono">${(match.cubicMeters || 0).toLocaleString()} m³ (${(match.cubicMeters * 1000 || 0).toLocaleString()} លីត្រ)</strong>
        </div>
        <div class="detail-box">
          <span class="detail-label">ថ្លៃសេវាតភ្ជាប់</span>
          <strong class="detail-val font-mono">${formatRiel(match.connectionFee || 0)}</strong>
        </div>
        <div class="detail-box">
          <span class="detail-label">ទឹកប្រាក់សរុប</span>
          <strong class="detail-val font-mono text-cyan" style="font-size: 1.15rem;">${formatRiel(match.total)}</strong>
        </div>
      </div>

      <div class="lookup-footer-actions margin-top-md">
        <button class="btn btn-primary btn-sm" onclick="viewCustomerDetail('${match.id}')">
          <i data-lucide="printer"></i> មើល & បោះពុម្ពវិក្កយបត្រផ្លូវការ (PDF)
        </button>
        <button class="btn btn-secondary btn-sm" onclick="switchTab('checkout'); restartIntake();">
          <i data-lucide="plus"></i> តភ្ជាប់ថ្មី / បង់វិក្កយបត្រ
        </button>
      </div>
    </div>
  `;

  lucide.createIcons();
}

function autofillDemoLookup() {
  const input = document.getElementById('public-lookup-input');
  if (input) {
    input.value = "MTR-1082";
    searchCustomerBill();
  }
}

// --- 2. Stepper & Piped Bill Payment Flow ---
function goToStep(stepNum) {
  if (stepNum > 1 && !validateStep1()) {
    alert("សូមបំពេញព័ត៌មានអតិថិជន និងលេខកុងទ័រឱ្យបានត្រឹមត្រូវសិនមុននឹងបន្ត។");
    return;
  }

  if (stepNum === 3 && appState.auth.user.role === 'clerk' && appState.formData.serviceType !== 'existing_bill') {
    completeSuccessfulPayment();
    return;
  }

  appState.currentStep = stepNum;

  for (let i = 1; i <= 4; i++) {
    const node = document.getElementById(`step-node-${i}`);
    const line = document.getElementById(`step-line-${i}`);
    const formStep = document.getElementById(`form-step-${i}`);

    if (node) {
      node.classList.remove('active', 'completed');
      if (i < stepNum) node.classList.add('completed');
      else if (i === stepNum) node.classList.add('active');
    }
    if (line) {
      if (i < stepNum) line.classList.add('active');
      else line.classList.remove('active');
    }
    if (formStep) {
      if (i === stepNum) formStep.classList.add('active');
      else formStep.classList.remove('active');
    }
  }

  const summaryBadge = document.getElementById('summary-badge');
  if (summaryBadge) summaryBadge.textContent = `ជំហាន ${stepNum} នៃ ៤`;

  lucide.createIcons();
}

// --- Step 1: Customer Intake ---
function validateStep1() {
  const name = document.getElementById('fullName')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const address = document.getElementById('address')?.value.trim();
  const city = document.getElementById('city')?.value.trim();
  const state = document.getElementById('state')?.value.trim();
  const zip = document.getElementById('zip')?.value.trim();
  return Boolean(name && email && phone && address && city && state && zip);
}

function handleStep1Submit(e) {
  e.preventDefault();
  const serviceTypeVal = document.getElementById('serviceType')?.value || 'residential_new';
  
  appState.formData = {
    serviceType: serviceTypeVal,
    serviceTypeName: serviceTypeVal === 'residential_new' ? 'សេវាតភ្ជាប់ទុយោតាមផ្ទះ (Home Connect)' : (serviceTypeVal === 'company_new' ? 'ទុយោផ្ទាល់រោងចក្រ (Factory Direct)' : 'បង់ថ្លៃទឹកប្រចាំខែ (Monthly Usage)'),
    fullName: document.getElementById('fullName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    meterId: document.getElementById('meterId')?.value.trim() || 'MTR-1082',
    company: document.getElementById('company')?.value.trim() || '',
    address: document.getElementById('address').value.trim(),
    city: document.getElementById('city').value.trim(),
    state: document.getElementById('state').value.trim(),
    zip: document.getElementById('zip').value.trim(),
    containerType: document.getElementById('containerType').value,
    deliverySlot: document.getElementById('deliverySlot').value,
    notes: document.getElementById('notes').value.trim()
  };

  handleServiceTypeChange(serviceTypeVal);
  if (serviceTypeVal !== 'existing_bill') {
    appState.order.cubicMeters = 0;
    appState.order.packageDesc = `0 m³ ទឹកស្អាតតាមទុយោ @ ${RATE_PER_M3.toLocaleString()} ៛/m³`;
    recalculateTotals();
  }

  const previewName = document.getElementById('preview-name');
  if (previewName) previewName.textContent = appState.formData.fullName.toUpperCase() || 'YOUR NAME';
  goToStep(2);
}

// --- Step 2: Piped Volume & Meter Calculation (m³) ---
function selectPackage(packageId, name, cubicMeters) {
  appState.order.packageId = packageId;
  appState.order.packageName = name;

  const customBox = document.getElementById('custom-amount-box');

  if (packageId === 'custom') {
    if (customBox) customBox.style.display = 'block';
    const customM3 = parseFloat(document.getElementById('customM3Input')?.value) || 0;
    appState.order.cubicMeters = customM3;
    appState.order.packageDesc = `${customM3} m³ ទឹកកុងទ័រជាក់ស្តែង @ ${RATE_PER_M3.toLocaleString()} ៛/m³`;
  } else {
    if (customBox) customBox.style.display = 'none';
    appState.order.cubicMeters = cubicMeters;
    if (packageId === 'residential') {
      appState.order.packageDesc = `${cubicMeters} m³ ទឹកស្អាតតាមផ្ទះ @ ${RATE_PER_M3.toLocaleString()} ៛/m³`;
    } else if (packageId === 'office') {
      appState.order.packageDesc = `${cubicMeters} m³ ទឹកស្អាតការិយាល័យ @ ${RATE_PER_M3.toLocaleString()} ៛/m³`;
    } else {
      appState.order.packageDesc = `${cubicMeters} m³ ទឹកស្អាតឧស្សាហកម្ម @ ${RATE_PER_M3.toLocaleString()} ៛/m³`;
    }
  }

  const cards = document.querySelectorAll('#form-step-2 .package-card');
  cards.forEach(card => card.classList.remove('active'));
  if (event && event.currentTarget) event.currentTarget.classList.add('active');

  recalculateTotals();
}

function updateCustomM3(val) {
  const m3 = parseFloat(val) || 0;
  appState.order.cubicMeters = m3;
  appState.order.packageDesc = `${m3} m³ ទឹកកុងទ័រជាក់ស្តែង @ ${RATE_PER_M3.toLocaleString()} ៛/m³`;
  recalculateTotals();
}

function adjustM3(delta) {
  let m3 = appState.order.cubicMeters + delta;
  if (m3 < 0) m3 = 0;
  if (m3 > 10000) m3 = 10000;
  m3 = Math.round(m3 * 2) / 2;
  appState.order.cubicMeters = m3;

  if (appState.order.packageId !== 'custom') {
    appState.order.packageDesc = `${m3} m³ ទឹកស្អាតតាមទុយោ @ ${RATE_PER_M3.toLocaleString()} ៛/m³`;
  }

  const litersEl = document.getElementById('liters-count-num');
  if (litersEl) litersEl.textContent = (m3 * 1000).toLocaleString();

  recalculateTotals();
}

function toggleAddon(addonKey) {
  if (addonKey === 'express') appState.order.hasExpressAddon = document.getElementById('addon-express').checked;
  else if (addonKey === 'wash') appState.order.hasWashAddon = document.getElementById('addon-wash').checked;
  else if (addonKey === 'alkaline') appState.order.hasAlkalineAddon = document.getElementById('addon-alkaline').checked;
  recalculateTotals();
}

function recalculateTotals() {
  const m3 = appState.order.cubicMeters;
  const waterCost = m3 * RATE_PER_M3;
  const connectionFee = appState.order.connectionFee || 0;
  const express = appState.order.hasExpressAddon ? appState.order.addonExpressPrice : 0;
  const wash = appState.order.hasWashAddon ? appState.order.addonWashPrice : 0;
  const alkaline = appState.order.hasAlkalineAddon ? appState.order.addonAlkalinePrice : 0;

  const total = connectionFee + waterCost + express + wash + alkaline;

  appState.order.basePrice = waterCost;
  appState.order.subtotal = total;
  appState.order.total = total;

  // Update Stepper UI
  const m3Display = document.getElementById('m3-count-num');
  if (m3Display) m3Display.textContent = m3 % 1 === 0 ? m3 : m3.toFixed(1);

  const litersEl = document.getElementById('liters-count-num');
  if (litersEl) litersEl.textContent = (m3 * 1000).toLocaleString();

  const m3PriceDisplay = document.getElementById('m3-price-display');
  if (m3PriceDisplay) m3PriceDisplay.textContent = `${m3} m³ × ${RATE_PER_M3.toLocaleString()} ៛ = ${formatRiel(waterCost)}`;

  // Update Sidebar
  const packageTitle = document.getElementById('summary-package-title');
  if (packageTitle) {
    if (appState.order.serviceType === 'residential_new') packageTitle.textContent = 'សេវាតភ្ជាប់ទុយោតាមផ្ទះ (Home Connect)';
    else if (appState.order.serviceType === 'company_new') packageTitle.textContent = 'ទុយោផ្ទាល់រោងចក្រ (Factory Direct)';
    else packageTitle.textContent = appState.order.packageName;
  }

  const packageDesc = document.getElementById('summary-package-desc');
  if (packageDesc) {
    if (connectionFee > 0) {
      packageDesc.textContent = `ថ្លៃសេវាតភ្ជាប់ ${formatRiel(connectionFee)} + ទឹកកុងទ័រ ${m3} m³`;
    } else {
      packageDesc.textContent = `${m3} m³ ទឹកស្អាតតាមទុយោ @ 2,500 ៛/m³`;
    }
  }

  const gallonsPill = document.getElementById('summary-gallons-pill');
  if (gallonsPill) gallonsPill.textContent = `💧 ${m3} m³ ទឹកស្អាតតាមទុយោ`;

  // Connection fee row
  const feeRow = document.getElementById('summary-connection-fee-row');
  const feeLabel = document.getElementById('summary-connection-fee-label');
  const feeVal = document.getElementById('summary-connection-fee');

  if (feeRow) {
    if (connectionFee > 0) {
      feeRow.classList.remove('hidden');
      if (feeLabel) feeLabel.textContent = appState.order.serviceType === 'residential_new' ? 'ថ្លៃសេវាតភ្ជាប់ទុយោតាមផ្ទះ' : 'ថ្លៃសេវាទុយោផ្ទាល់រោងចក្រ';
      if (feeVal) feeVal.textContent = formatRiel(connectionFee);
    } else {
      feeRow.classList.add('hidden');
    }
  }

  const baseEl = document.getElementById('summary-base-price');
  if (baseEl) baseEl.textContent = formatRiel(waterCost);

  toggleVisibility('summary-addon-express-row', appState.order.hasExpressAddon);
  toggleVisibility('summary-addon-wash-row', appState.order.hasWashAddon);
  toggleVisibility('summary-addon-alkaline-row', appState.order.hasAlkalineAddon);

  const totalEl = document.getElementById('summary-total');
  if (totalEl) totalEl.textContent = formatRiel(total);

  const payBtn = document.getElementById('pay-button-amount');
  if (payBtn) payBtn.textContent = formatRiel(total);
}

function toggleVisibility(id, condition) {
  const el = document.getElementById(id);
  if (el) {
    if (condition) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
}

// --- Step 3: Payment Gateway & Card Auto-Formatting ---
function formatCardNumber(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
  input.value = formatted;

  const previewNum = document.getElementById('preview-number');
  if (previewNum) previewNum.textContent = formatted || '•••• •••• •••• ••••';

  const previewBrand = document.getElementById('preview-brand');
  const badge = document.getElementById('card-type-badge');
  let brand = 'VISA';
  if (val.startsWith('5')) brand = 'MC';
  else if (val.startsWith('3')) brand = 'AMEX';
  else if (val.startsWith('6')) brand = 'DISC';
  if (previewBrand) previewBrand.textContent = brand;
  if (badge) badge.textContent = brand;

  appState.payment.cardBrand = brand === 'MC' ? 'Mastercard' : (brand === 'AMEX' ? 'Amex' : 'Visa');
  appState.payment.cardLast4 = val.slice(-4) || '4242';
}

function formatExpiry(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 3) val = val.substring(0, 2) + '/' + val.substring(2);
  input.value = val;
  const previewExp = document.getElementById('preview-expiry');
  if (previewExp) previewExp.textContent = val || 'MM/YY';
}

function autofillCard(num, exp, cvc, mode) {
  const cardInput = document.getElementById('cardNumber');
  const expInput = document.getElementById('cardExpiry');
  const cvcInput = document.getElementById('cardCvc');
  if (cardInput) { cardInput.value = num; formatCardNumber(cardInput); }
  if (expInput) { expInput.value = exp; formatExpiry(expInput); }
  if (cvcInput) cvcInput.value = cvc;
  appState.payment.testPresetMode = mode;
  const alertEl = document.getElementById('payment-error-alert');
  if (alertEl) alertEl.classList.add('hidden');
}

// --- Payment Processing Engine ---
function processPayment(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('pay-submit-btn');
  const errorAlert = document.getElementById('payment-error-alert');
  const errorMsg = document.getElementById('payment-error-msg');

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> កំពុងដំណើរការទូទាត់ប្រាក់...`;
  lucide.createIcons();
  errorAlert.classList.add('hidden');

  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i data-lucide="lock"></i> បង់ប្រាក់សរុប <span id="pay-button-amount">${formatRiel(appState.order.total)}</span>`;
    lucide.createIcons();

    if (appState.payment.testPresetMode === 'decline') {
      errorMsg.textContent = "ការទូទាត់ត្រូវបានបដិសេធ: ធនាគារមិនអនុញ្ញាតប្រតិបត្តិការនេះ (Code: 4002_DECLINED)។";
      errorAlert.classList.remove('hidden');
      recordFailedTransaction("Transaction Declined by Issuer");
      return;
    }
    if (appState.payment.testPresetMode === 'funds') {
      errorMsg.textContent = "ការទូទាត់មិនជោគជ័យ: ទឹកប្រាក់ក្នុងកាតមិនគ្រប់គ្រាន់ (Code: 4003_INSUFFICIENT_FUNDS)។";
      errorAlert.classList.remove('hidden');
      recordFailedTransaction("Insufficient Funds");
      return;
    }
    completeSuccessfulPayment();
  }, 1600);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function recordFailedTransaction(reason) {
  const txnId = "BILL-" + Math.floor(100000 + Math.random() * 900000);
  const dateStr = formatLocalDateTime();

  const record = buildRecord(txnId, dateStr, "Failed", `មិនជោគជ័យ: ${reason}។ ${appState.formData.notes}`);
  appState.customers.unshift(record);
  saveCustomers();
  renderPublicDashboard();
}

function completeSuccessfulPayment() {
  const txnId = "BILL-" + Math.floor(100000 + Math.random() * 900000);
  const dateStr = formatLocalDateTime();
  const batchId = "AQ-PIPE-2026-" + Math.floor(70 + Math.random() * 29);

  const isClerkRegistration = appState.auth.user.role === 'clerk' && appState.formData.serviceType !== 'existing_bill';
  const recordStatus = isClerkRegistration ? 'Pending' : 'Completed';
  const record = buildRecord(txnId, dateStr, recordStatus, appState.formData.notes || "ទុយោទឹកស្អាតផ្ទាល់");
  record.batchId = batchId;
  appState.customers.unshift(record);
  saveCustomers();
  renderPublicDashboard();

  const receiptTitle = document.getElementById('receipt-title');
  const receiptMessage = document.getElementById('receipt-message');
  const receiptStatus = document.querySelector('.receipt-status-pill');
  if (recordStatus === 'Pending') {
    if (receiptTitle) receiptTitle.textContent = 'ការចុះឈ្មោះត្រូវបានដាក់ស្នើដោយជោគជ័យ!';
    if (receiptMessage) receiptMessage.textContent = 'សំណើរបស់អតិថិជនត្រូវបានកត់ត្រា និងកំពុងរង់ចាំ Admin អនុម័ត។';
    if (receiptStatus) receiptStatus.textContent = 'រង់ចាំការអនុម័ត (PENDING)';
  }

  // Populate Step 4 receipt
  document.getElementById('receipt-txn-id').textContent = txnId;
  document.getElementById('receipt-customer-name').textContent = record.name;
  document.getElementById('receipt-meter-id').textContent = record.meterId || 'MTR-1082';
  document.getElementById('receipt-date').textContent = dateStr;
  document.getElementById('receipt-address').textContent = record.address;
  document.getElementById('receipt-container-type').textContent = record.containerType;
  document.getElementById('receipt-payment-method').textContent = recordStatus === 'Pending' ? 'រង់ចាំ Admin អនុម័ត' : `${record.cardBrand} បញ្ចប់ដោយ ${record.cardLast4}`;
  document.getElementById('receipt-notes').textContent = record.notes;
  document.getElementById('receipt-batch-id').textContent = batchId;
  document.getElementById('receipt-m3-volume').textContent = `${record.cubicMeters} m³ (${(record.cubicMeters * 1000).toLocaleString()} លីត្រ)`;
  document.getElementById('receipt-rate').textContent = `${RATE_PER_M3.toLocaleString()} ៛/m³`;

  // Build receipt items
  let itemsHTML = '';
  if (record.connectionFee > 0) {
    itemsHTML += `
      <tr style="background: rgba(6,182,212,0.06);">
        <td><strong>${escapeHtml(record.serviceTypeName || 'សេវាតភ្ជាប់')}</strong> — ការកប់ទុយោ & ដំឡើងនាឡិកាទឹក</td>
        <td class="text-center font-mono">1 តំណភ្ជាប់</td>
        <td class="text-right font-mono text-cyan"><strong>${formatRiel(record.connectionFee)}</strong></td>
      </tr>`;
  }
  itemsHTML += `
    <tr>
      <td><strong>${escapeHtml(record.packageName)}</strong> — កុងទ័រ #${escapeHtml(record.meterId || 'MTR-1082')} (@ ${RATE_PER_M3.toLocaleString()} ៛/m³)</td>
      <td class="text-center font-mono">${record.cubicMeters} m³</td>
      <td class="text-right font-mono">${formatRiel(record.amount)}</td>
    </tr>`;
  if (record.hasExpressAddon) itemsHTML += `<tr><td>ត្រួតពិនិត្យសម្ពាធទុយោ & តេស្តវ៉ាន</td><td class="text-center">-</td><td class="text-right font-mono">${formatRiel(record.addonPrice)}</td></tr>`;
  if (record.hasWashAddon) itemsHTML += `<tr><td>ក្រិតកុងទ័រប្រចាំឆ្នាំ & លាងសម្អាតទុយោអូហ្សូន</td><td class="text-center">-</td><td class="text-right font-mono">${formatRiel(record.washPrice)}</td></tr>`;
  if (record.hasAlkalineAddon) itemsHTML += `<tr><td>បន្ថែមសារធាតុរ៉ែ & បន្ទន់ទឹកក្នុងទុយោ</td><td class="text-center">-</td><td class="text-right font-mono">${formatRiel(record.alkalinePrice)}</td></tr>`;

  document.getElementById('receipt-items-body').innerHTML = itemsHTML;
  document.getElementById('receipt-subtotal').textContent = formatRiel(record.total);
  document.getElementById('receipt-total').textContent = formatRiel(record.total);

  if (recordStatus === 'Pending') {
    const pendingAlert = document.getElementById('payment-error-alert');
    const pendingMsg = document.getElementById('payment-error-msg');
    if (pendingAlert && pendingMsg) {
      pendingMsg.textContent = 'ការចុះឈ្មោះបានបញ្ចប់។ សំណើរនេះត្រូវបានកត់ត្រា និងកំពុងរង់ចាំ Admin អនុម័ត។';
      pendingAlert.classList.remove('hidden');
    }
  }

  sendInvoiceToGmail(record).then((result) => {
    const errorAlert = document.getElementById('payment-error-alert');
    const errorMsg = document.getElementById('payment-error-msg');

    if (!result.success && recordStatus !== 'Pending') {
      console.warn('Invoice notification warning:', result.data || result.reason || 'unknown error');
      if (errorAlert && errorMsg) {
        errorMsg.textContent = 'Invoice email did not send. Backend server was not reachable.';
        errorAlert.classList.remove('hidden');
      }
    } else if (recordStatus !== 'Pending' && errorAlert) {
      errorAlert.classList.add('hidden');
    }
  });

  if (typeof confetti === 'function') {
    confetti({ particleCount: 130, spread: 80, origin: { y: 0.55 }, colors: ['#06B6D4', '#0284C7', '#38BDF8', '#10B981'] });
  }
  goToStep(4);
}

function buildRecord(txnId, dateStr, status, notes) {
  const m3 = appState.order.cubicMeters;
  return {
    id: txnId,
    meterId: appState.formData.meterId || 'MTR-1082',
    name: appState.formData.fullName || "អតិថិជនទូទៅ (Guest)",
    email: appState.formData.email || "guest@aquapure.kh",
    phone: appState.formData.phone || "N/A",
    company: appState.formData.company || "",
    address: `${appState.formData.address || ''}, ${appState.formData.city || ''}, ${appState.formData.state || ''}`.replace(/, ,/g, ','),
    city: appState.formData.city,
    state: appState.formData.state,
    zip: appState.formData.zip,
    serviceType: appState.formData.serviceType,
    serviceTypeName: appState.formData.serviceTypeName,
    connectionFee: appState.order.connectionFee || 0,
    containerType: appState.formData.containerType,
    deliverySlot: appState.formData.deliverySlot,
    cubicMeters: m3,
    notes: notes,
    packageName: appState.order.packageName,
    amount: appState.order.basePrice,
    hasExpressAddon: appState.order.hasExpressAddon,
    addonPrice: appState.order.hasExpressAddon ? appState.order.addonExpressPrice : 0,
    hasWashAddon: appState.order.hasWashAddon,
    washPrice: appState.order.hasWashAddon ? appState.order.addonWashPrice : 0,
    hasAlkalineAddon: appState.order.hasAlkalineAddon,
    alkalinePrice: appState.order.hasAlkalineAddon ? appState.order.addonAlkalinePrice : 0,
    tax: 0,
    total: appState.order.total,
    cardLast4: appState.payment.cardLast4,
    cardBrand: appState.payment.cardBrand,
    status: status,
    date: dateStr,
    month: dateStr.substring(0, 7),
    batchId: "AQ-PIPE-2026-" + Math.floor(70 + Math.random() * 29)
  };
}

// --- Step 4 Actions ---
function printReceipt() { window.print(); }

function openEmailModal() {
  const modal = document.getElementById('email-modal');
  const input = document.getElementById('emailModalTarget');
  if (input) input.value = appState.formData.email || '';
  if (modal) modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeEmailModal() {
  const modal = document.getElementById('email-modal');
  const status = document.getElementById('email-send-status');
  if (status) status.classList.add('hidden');
  if (modal) modal.classList.add('hidden');
}

function openContactOptions() {
  const modal = document.getElementById('contact-options-modal');
  if (modal) modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeContactOptions() {
  const modal = document.getElementById('contact-options-modal');
  if (modal) modal.classList.add('hidden');
}

function generateReceiptEmailBody(record) {
  return [
    'Dara Pichmony Water Station Service Receipt',
    '',
    `Customer: ${record.name}`,
    `Email: ${record.email}`,
    `Phone: ${record.phone}`,
    `Address: ${record.address}`,
    `Meter ID: ${record.meterId}`,
    `Service: ${record.serviceTypeName}`,
    `Connection Fee: ${formatRiel(record.connectionFee || 0)}`,
    `Water Usage: ${record.cubicMeters} m³`,
    `Total Paid: ${formatRiel(record.total || 0)}`,
    `Payment Status: ${record.status}`,
    `Date: ${record.date}`,
    `Batch ID: ${record.batchId}`,
    '',
    'Thank you for choosing Dara Pichmony Water Station.',
    'Powered by Dara Pichmony Direct Water Network.'
  ].join('\n');
}

function triggerMailtoReceipt(record) {
  const recipient = record.email || document.getElementById('emailModalTarget')?.value.trim() || 'support@aquapure.kh';
  const subject = encodeURIComponent(`Dara Pichmony Water Receipt - ${record.id}`);
  const body = encodeURIComponent(generateReceiptEmailBody(record));
  const mailtoLink = `mailto:${recipient}?subject=${subject}&body=${body}`;

  window.location.href = mailtoLink;
  return recipient;
}

async function sendInvoiceToGmail(record, options = {}) {
  const sendTelegram = options.sendTelegram !== false;
  const recipient = (record && record.email) || appState.formData.email || document.getElementById('emailModalTarget')?.value.trim() || 'customer@aquapure.kh';
  if (!recipient) return { success: false, reason: 'No recipient email' };

  const statusLabel = getStatusLabel(record.status);
  const statusEmoji = record.status === 'Completed' ? '✅' : (record.status === 'Pending' ? '⏳' : '⚠️');
  const safeName = escapeHtml(record.name || 'អតិថិជន');
  const safeAddress = escapeHtml(record.address || 'រាជធានីភ្នំពេញ');
  const safeService = escapeHtml(record.serviceTypeName || record.packageName || 'តភ្ជាប់ទុយោទឹកស្អាត');
  const totalRiel = formatRiel(record.total || record.amount || 0);
  const dateStr = record.date || formatLocalDateTime();
  const meterId = record.meterId || 'MTR-1082';
  const paymentMethod = record.status === 'Pending' ? 'រង់ចាំ Admin អនុម័ត' : (record.cardBrand ? `${record.cardBrand} •• ${record.cardLast4}` : 'ABA PAY / KHQR');
  const registeredBy = record.registeredBy || (appState.auth.isLoggedIn && appState.auth.user ? `${appState.auth.user.name} (${USER_ROLES[appState.auth.user.role]?.label || appState.auth.user.role})` : 'អតិថិជនចុះឈ្មោះតាមអនឡាញ (Online)');

  const telegramHtml = `💧 <b>ស្ថានីយទឹក តារា ពេជ្រមុនី</b>
  <i>DARA PICHMONY WATER STATION</i>
  ────────────────────────────
  🧾 <b>វិក្កយបត្រឌីជីថល (DIGITAL RECEIPT)</b>
  🆔 លេខវិក្កយបត្រ: <code>#${record.id || 'N/A'}</code>
  📅 កាលបរិច្ឆេទ: <code>${dateStr}</code>
  👨‍💼 <b>អ្នកចុះឈ្មោះ:</b> <b>${registeredBy}</b>

👤 <b>ព័ត៌មានអតិថិជន (Customer Info)</b>
 ├ ឈ្មោះ: <b>${safeName}</b>
 ├ ទូរស័ព្ទ: <code>${record.phone || appState.formData.phone || 'N/A'}</code>
 ├ អ៊ីមែល: <code>${record.email || recipient}</code>
 └ ទីតាំង: <code>${safeAddress}</code>

📟 <b>ទិន្នន័យនាឡិកាទឹក (Meter & Supply)</b>
 ├ លេខកុងទ័រ: <code>${meterId}</code>
 ├ សេវាកម្ម: <b>${safeService}</b>
 ├ បរិមាណប្រើប្រាស់: <code>${record.cubicMeters || 0} m³ (${((record.cubicMeters || 0) * 1000).toLocaleString()} L)</code>
 └ អត្រាតម្លៃគិត: <code>${RATE_PER_M3.toLocaleString()} ៛/m³</code>

<blockquote>💵 <b>ទឹកប្រាក់សរុប (TOTAL):</b> <b><u>${totalRiel}</u></b>
📌 <b>ស្ថានភាព:</b> <b>${statusEmoji} ${statusLabel}</b>
💳 <b>វិធីសាស្ត្រ:</b> <code>${paymentMethod}</code></blockquote>
────────────────────────────
✨ <i>ប្រព័ន្ធគ្រប់គ្រងការផ្គត់ផ្គង់ទឹកស្អាត & គីឡូទឹកស្វ័យប្រវត្ត</i>`;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="km">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Kantumruy Pro', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1120; color: #f8fafc; margin: 0; padding: 24px 12px; }
        .invoice-card { max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .invoice-header { background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
        .brand-title { font-size: 22px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.5px; }
        .brand-subtitle { font-size: 13px; opacity: 0.9; margin: 0; }
        .invoice-body { padding: 24px; }
        .badge-pill { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; background: rgba(6,182,212,0.15); color: #38bdf8; border: 1px solid rgba(6,182,212,0.3); margin-bottom: 18px; }
        .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
        .grid-table td { padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
        .grid-table td.label { width: 40%; color: #94a3b8; font-weight: 500; }
        .grid-table td.val { font-weight: 600; color: #f1f5f9; text-align: right; }
        .highlight-box { background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.25); border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0; }
        .highlight-label { font-size: 12px; text-transform: uppercase; color: #38bdf8; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
        .highlight-amount { font-size: 26px; font-weight: 800; color: #06b6d4; font-family: 'JetBrains Mono', monospace, sans-serif; }
        .invoice-footer { background: #090d16; padding: 18px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="invoice-header">
          <h1 class="brand-title">💧 Dara Pichmony Water Station</h1>
          <p class="brand-subtitle">ប្រព័ន្ធផ្គត់ផ្គង់ទឹកស្អាតតាមទុយោផ្ទាល់ • 1 m³ = 2,500 ៛</p>
        </div>
        <div class="invoice-body">
          <div style="text-align: center;">
            <span class="badge-pill">${statusEmoji} ${statusLabel}</span>
          </div>
          <table class="grid-table">
            <tr><td class="label">លេខវិក្កយបត្រ (Invoice):</td><td class="val" style="font-family: monospace; color:#38bdf8;">${record.id}</td></tr>
            <tr><td class="label">អតិថិជន (Customer):</td><td class="val">${safeName}</td></tr>
            <tr><td class="label">ទូរស័ព្ទ (Phone):</td><td class="val">${record.phone || 'N/A'}</td></tr>
            <tr><td class="label">លេខកុងទ័រ (Meter ID):</td><td class="val" style="font-family: monospace;">${meterId}</td></tr>
            <tr><td class="label">ប្រភេទសេវា (Service):</td><td class="val">${safeService}</td></tr>
            <tr><td class="label">ទីតាំង (Address):</td><td class="val">${safeAddress}</td></tr>
            <tr><td class="label">បរិមាណទឹក (Volume):</td><td class="val">${record.cubicMeters || 0} m³</td></tr>
            <tr><td class="label">កាលបរិច្ឆេទ (Date):</td><td class="val">${dateStr}</td></tr>
          </table>
          <div class="highlight-box">
            <div class="highlight-label">ទឹកប្រាក់សរុបត្រូវបង់ (Total Amount)</div>
            <div class="highlight-amount">${totalRiel}</div>
          </div>
        </div>
        <div class="invoice-footer">
          <p style="margin: 0 0 4px;">សូមអរគុណចំពោះការប្រើប្រាស់សេវាផ្គត់ផ្គង់ទឹកស្អាត តារា ពេជ្រមុនី</p>
          <p style="margin: 0; font-size: 11px;">Phnom Penh, Cambodia • Support: support@aquapure.kh</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const payload = {
    to: recipient,
    subject: `Dara Pichmony Digital Invoice - ${record.id}`,
    html: emailHtml,
    text: `Dara Pichmony Digital Invoice\n\nInvoice: ${record.id}\nCustomer: ${record.name}\nMeter ID: ${record.meterId}\nTotal Paid: ${totalRiel}\nStatus: ${record.status}`,
    telegramMessage: telegramHtml,
    sendTelegram: sendTelegram
  };

  const endpoints = ['/api/send-invoice'];
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    endpoints.push('http://localhost:5001/api/send-invoice', 'http://localhost:5000/api/send-invoice');
  }
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, data, recipient };
      }

      lastError = { data, response, reason: data.message || 'Notification backend warning' };
    } catch (error) {
      lastError = { reason: error.message || String(error) };
    }
  }

  return { success: false, data: lastError?.data, reason: lastError?.reason || 'Notification backend unavailable', recipient };
}

function sendReceiptEmail() {
  const targetEmail = document.getElementById('emailModalTarget')?.value.trim();
  const status = document.getElementById('email-send-status');
  if (!targetEmail) {
    alert("សូមបញ្ចូលអ៊ីមែលអ្នកទទួល! (Please enter recipient email)");
    return;
  }
  if (status) {
    status.innerHTML = `<i data-lucide="check-circle"></i> កំពុងផ្ញើវិក្កយបត្រទៅ <strong>${escapeHtml(targetEmail)}</strong> ...`;
    status.classList.remove('hidden');
    lucide.createIcons();
  }

  const record = {
    id: 'MANUAL-' + Date.now(),
    name: appState.formData.fullName || 'Dara Pichmony Customer',
    email: targetEmail,
    meterId: appState.formData.meterId || 'MTR-1082',
    serviceTypeName: appState.formData.serviceTypeName || 'Water Service',
    address: `${appState.formData.address || ''}, ${appState.formData.city || ''}, ${appState.formData.state || ''}`.replace(/, ,/g, ','),
    total: appState.order.total || 0,
    status: 'Completed',
    date: formatLocalDateTime()
  };

  sendInvoiceToGmail(record, { sendTelegram: false }).then((result) => {
    if (status) {
      status.innerHTML = result.success
        ? `<i data-lucide="check-circle"></i> ផ្ញើវិក្កយបត្រដោយជោគជ័យទៅ <strong>${escapeHtml(result.recipient)}</strong>។`
        : `<i data-lucide="alert-circle"></i> មិនអាចផ្ញើអ៊ីមែលបានទេ។ សូមពិនិត្យ Gmail App Password ឬ Backend Server។`;
      lucide.createIcons();
    }

    setTimeout(() => closeEmailModal(), 2800);
  });
}

function restartIntake() {
  appState.formData = {
    serviceType: 'residential_new',
    serviceTypeName: 'សេវាតភ្ជាប់ទុយោតាមផ្ទះ (Home Connect)',
    fullName: '',
    email: '',
    phone: '',
    meterId: 'MTR-1082',
    company: '',
    address: '',
    city: 'រាជធានីភ្នំពេញ (Phnom Penh)',
    state: 'ខណ្ឌចំការមន (Chamkarmon)',
    zip: '12302',
    containerType: 'ទុយោតាមផ្ទះ (1/2" Line)',
    deliverySlot: 'វដ្តដើមខែ (ថ្ងៃទី ១ - ៥ ដើមខែ)',
    notes: ''
  };
  document.getElementById('intake-form')?.reset();
  document.getElementById('payment-form')?.reset();
  appState.order.cubicMeters = 0;
  recalculateTotals();
  selectServiceCard('residential_new');
  goToStep(1);
}

function resetSampleData() {
  if (!hasPermission('resetData')) {
    alert('សិទ្ធិនេះមានសម្រាប់ Admin ប៉ុណ្ណោះ។');
    return;
  }

  if (confirm("តើអ្នកពិតជាចង់កំណត់ទិន្នន័យគំរូឡើងវិញមែនទេ?")) {
    appState.customers = DEFAULT_CUSTOMERS;
    saveCustomers();
    renderPublicDashboard();
    renderAdminMetrics();
    renderMonthlyTotals();
    renderAdminTable();
    alert("ទិន្នន័យគំរូត្រូវបានកំណត់ឡើងវិញដោយជោគជ័យ!");
  }
}

// --- 3. Protected Operations Dashboard Operations ---
function saveCustomers() {
  localStorage.setItem('aquapure_customers', JSON.stringify(appState.customers));
  updateBadgeCount();
  updatePendingApprovalAlert();
}

function updatePendingApprovalAlert() {
  const alert = document.getElementById('pending-approval-alert');
  if (!alert) return;
  const pendingCount = appState.customers.filter(customer => customer.status === 'Pending').length;
  alert.classList.toggle('hidden', !hasPermission('approveRegistrations') || pendingCount === 0);
  if (pendingCount > 0) {
    const count = document.getElementById('pending-approval-count');
    if (count) count.textContent = pendingCount;
  }
}

function approveCustomer(id) {
  if (!hasPermission('approveRegistrations')) {
    alert('មានតែ Admin ប៉ុណ្ណោះដែលអាចអនុម័តការចុះឈ្មោះបាន។');
    return;
  }

  const customer = appState.customers.find(item => item.id === id);
  if (!customer || customer.status !== 'Pending') return;
  customer.status = 'Completed';
  customer.approvedBy = appState.auth.user.email;
  customer.approvedAt = formatLocalDateTime();
  saveCustomers();
  renderPublicDashboard();
  renderAdminMetrics();
  renderMonthlyTotals();
  renderAdminTable();
  sendInvoiceToGmail(customer);
  alert(`ការចុះឈ្មោះ ${customer.id} ត្រូវបានអនុម័តដោយជោគជ័យ។`);
}

function rejectCustomer(id) {
  if (!hasPermission('approveRegistrations')) {
    alert('មានតែ Admin ប៉ុណ្ណោះដែលអាចបដិសេធការចុះឈ្មោះបាន។');
    return;
  }

  const customer = appState.customers.find(item => item.id === id);
  if (!customer || customer.status !== 'Pending') return;
  if (!confirm(`តើអ្នកចង់បដិសេធការចុះឈ្មោះ ${customer.id} មែនទេ?`)) return;
  customer.status = 'Rejected';
  customer.rejectedBy = appState.auth.user.email;
  customer.rejectedAt = formatLocalDateTime();
  customer.notes = `${customer.notes || ''} | Rejected by Admin`.trim();
  saveCustomers();
  renderPublicDashboard();
  renderAdminMetrics();
  renderMonthlyTotals();
  renderAdminTable();
}

function updateBadgeCount() {
  const badge = document.getElementById('customer-count-badge');
  if (badge) badge.textContent = appState.customers.length;
}

function renderAdminMetrics() {
  const completed = appState.customers.filter(c => c.status === 'Completed');
  const totalRiel = completed.reduce((acc, c) => acc + c.total, 0);
  const totalM3 = completed.reduce((acc, c) => acc + (c.cubicMeters || 0), 0);
  const totalCount = appState.customers.length;

  const currentMonth = getCurrentMonth();
  const thisMonth = completed.filter(c => c.month === currentMonth);
  const thisMonthRiel = thisMonth.reduce((acc, c) => acc + c.total, 0);
  const thisMonthM3 = thisMonth.reduce((acc, c) => acc + (c.cubicMeters || 0), 0);

  const adminRev = document.getElementById('metric-revenue');
  const adminGal = document.getElementById('metric-gallons');
  const adminCust = document.getElementById('metric-customers');
  const adminThisMonth = document.getElementById('metric-this-month');
  const adminThisMonthM3 = document.getElementById('metric-this-month-m3');

  if (adminRev) adminRev.textContent = formatRiel(totalRiel);
  if (adminGal) adminGal.textContent = `${totalM3.toLocaleString()} m³`;
  if (adminCust) adminCust.textContent = totalCount;
  if (adminThisMonth) adminThisMonth.textContent = formatRiel(thisMonthRiel);
  if (adminThisMonthM3) adminThisMonthM3.innerHTML = `<i data-lucide="droplets"></i> ${thisMonthM3.toLocaleString()} m³ ខែនេះ`;

  lucide.createIcons();
}

function renderMonthlyTotals() {
  const completed = appState.customers.filter(c => c.status === 'Completed');

  const monthMap = {};
  completed.forEach(c => {
    const m = c.month || c.date?.substring(0, 7) || 'Unknown';
    if (!monthMap[m]) monthMap[m] = { totalRiel: 0, totalM3: 0, count: 0 };
    monthMap[m].totalRiel += c.total;
    monthMap[m].totalM3 += c.cubicMeters || 0;
    monthMap[m].count++;
  });

  const sortedMonths = Object.keys(monthMap).sort((a, b) => b.localeCompare(a));
  const monthlyBody = document.getElementById('monthly-totals-body');
  if (!monthlyBody) return;

  if (sortedMonths.length === 0) {
    monthlyBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-muted);">ពុំមានទិន្នន័យឡើយ។</td></tr>`;
    return;
  }

  monthlyBody.innerHTML = sortedMonths.map(month => {
    const d = monthMap[month];
    const label = formatMonthLabel(month);
    const isCurrentMonth = month === getCurrentMonth();
    return `
      <tr class="${isCurrentMonth ? 'current-month-row' : ''}">
        <td><strong>${label}</strong>${isCurrentMonth ? ' <span class="current-month-badge">ខែនេះ (This Month)</span>' : ''}</td>
        <td class="font-mono text-cyan">${d.totalM3.toLocaleString()} m³</td>
        <td class="font-mono">${d.count} កុងទ័រ</td>
        <td class="font-mono text-cyan"><strong>${formatRiel(d.totalRiel)}</strong></td>
      </tr>`;
  }).join('');
}

function renderAdminTable(filteredData = null) {
  const data = filteredData || appState.customers;
  const tbody = document.getElementById('admin-table-body');
  const recordCountEl = document.getElementById('table-record-count');
  if (recordCountEl) recordCountEl.textContent = `បង្ហាញ ${data.length} នៃ ${appState.customers.length} កំណត់ត្រាកុងទ័រទឹកស្អាត`;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:36px; color:var(--text-muted);"><i data-lucide="inbox" style="width:32px; height:32px; margin-bottom:8px;"></i><p>រកមិនឃើញកំណត់ត្រាកុងទ័រទឹកឡើយ។</p></td></tr>`;
    lucide.createIcons();
    return;
  }

  tbody.innerHTML = data.map(c => {
    const statusKhmer = getStatusLabel(c.status);
    return `
    <tr>
      <td class="font-mono">
        <strong>${c.id}</strong><br>
        <span style="font-size:0.75rem; color:var(--color-cyan); font-weight:700;">កុងទ័រ #${c.meterId || 'MTR-1082'}</span><br>
        <span style="font-size:0.72rem; color:var(--text-muted);">${c.month || c.date?.substring(0,7)}</span>
      </td>
      <td>
        <strong style="color:var(--text-primary); display:block;">${escapeHtml(c.name)}</strong>
        <span style="font-size:0.78rem; color:var(--color-cyan);">${escapeHtml(c.email)}</span><br>
        <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(c.address || '')}</span>
      </td>
      <td>
        <strong style="display:block; font-size:0.82rem;">${escapeHtml(c.containerType || 'ទុយោតាមផ្ទះ')}</strong>
        <span style="font-size:0.75rem; color:var(--color-cyan); font-weight:700;">${escapeHtml(c.serviceTypeName || 'ទុយោស្តង់ដារ')}</span>
      </td>
      <td class="font-mono text-cyan"><strong>${(c.cubicMeters || 0).toLocaleString()} m³</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${RATE_PER_M3.toLocaleString()} ៛/m³</span></td>
      <td class="font-mono">${c.connectionFee > 0 ? `<span class="badge-fee">${formatRiel(c.connectionFee)}</span>` : '<span style="color:var(--text-muted);">-</span>'}</td>
      <td class="font-mono"><strong style="color:var(--color-cyan); font-size:0.95rem;">${formatRiel(c.total)}</strong></td>
      <td>
        <span class="status-badge ${c.status.toLowerCase().replace(/\s+/g,'-')}">
          <i data-lucide="${c.status === 'Completed' ? 'check-circle' : c.status === 'Failed' || c.status === 'Rejected' ? 'x-circle' : 'clock'}"></i>
          ${statusKhmer}
        </span>
      </td>
      <td class="text-right">
        ${c.status === 'Pending' && hasPermission('approveRegistrations') ? `<div class="approval-actions"><button class="btn btn-approve btn-sm" title="អនុម័តការចុះឈ្មោះ" onclick="approveCustomer('${c.id}')"><i data-lucide="check"></i> អនុម័ត</button><button class="btn btn-reject btn-sm" title="បដិសេធការចុះឈ្មោះ" onclick="rejectCustomer('${c.id}')"><i data-lucide="x"></i> បដិសេធ</button></div>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="viewCustomerDetail('${c.id}')">
          <i data-lucide="eye"></i> មើលវិក្កយបត្រ
        </button>
      </td>
    </tr>
  `;
  }).join('');

  lucide.createIcons();
}

function filterCustomerTable() {
  const query = document.getElementById('admin-search-input')?.value.toLowerCase().trim();
  const statusFilter = document.getElementById('admin-status-filter')?.value;
  const monthFilter = document.getElementById('admin-month-filter')?.value;

  let results = appState.customers.filter(c => {
    const matchesQuery = !query || (
      c.name.toLowerCase().includes(query) ||
      (c.meterId && c.meterId.toLowerCase().includes(query)) ||
      c.email.toLowerCase().includes(query) ||
      (c.address || '').toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query)
    );
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesMonth = monthFilter === 'all' || (c.month || c.date?.substring(0,7)) === monthFilter;
    return matchesQuery && matchesStatus && matchesMonth;
  });

  renderAdminTable(results);
}

function populateMonthFilter() {
  const select = document.getElementById('admin-month-filter');
  if (!select) return;
  const months = [...new Set(appState.customers.map(c => c.month || c.date?.substring(0,7)).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
  select.innerHTML = '<option value="all">គ្រប់ខែទាំងអស់ (All Months)</option>' + months.map(m => `<option value="${m}">${formatMonthLabel(m)}</option>`).join('');
}

// --- Customer Meter Detail Modal ---
function viewCustomerDetail(id) {
  const c = appState.customers.find(item => item.id === id);
  if (!c) return;

  const modal = document.getElementById('customer-modal');
  const content = document.getElementById('modal-customer-content');
  const statusKhmer = getStatusLabel(c.status);

  content.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
      <div>
        <h2 style="font-size:1.3rem; font-weight:800;">${escapeHtml(c.name)}</h2>
        <span style="color:var(--text-muted); font-size:0.875rem;">${escapeHtml(c.email)} • ${escapeHtml(c.phone)}</span>
      </div>
      <span class="status-badge ${c.status.toLowerCase().replace(/\s+/g,'-')}">${statusKhmer}</span>
    </div>

    <div style="background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.25); border-radius:var(--radius-md); padding:18px; margin-bottom:16px;">
      <h4 style="font-size:0.82rem; text-transform:uppercase; color:var(--color-cyan); margin-bottom:10px; font-weight:700;">🚰 ព័ត៌មានលម្អិតកុងទ័រ & បណ្តាញទុយោទឹក</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.875rem;">
        <div><strong>លេខសម្គាល់កុងទ័រ:</strong> <span class="font-mono text-cyan" style="font-weight:700;">${escapeHtml(c.meterId || 'MTR-1082')}</span></div>
        <div><strong>ប្រភេទសេវា:</strong> <span class="text-cyan font-mono">${escapeHtml(c.serviceTypeName || 'ទុយោស្តង់ដារ')}</span></div>
        <div><strong>ទំហំទុយោ:</strong> ${escapeHtml(c.containerType || 'ទុយោតាមផ្ទះ')}</div>
        <div><strong>ថ្លៃសេវាតភ្ជាប់:</strong> <span class="font-mono text-cyan">${formatRiel(c.connectionFee || 0)}</span></div>
        <div><strong>បរិមាណទឹកគិតប្រាក់:</strong> <span class="font-mono">${(c.cubicMeters || 0).toLocaleString()} m³ (${(c.cubicMeters * 1000 || 0).toLocaleString()} លីត្រ)</span></div>
        <div><strong>តម្លៃទឹកស្អាត:</strong> <span class="font-mono">${RATE_PER_M3.toLocaleString()} ៛/m³</span></div>
        <div><strong>វដ្តកត់ត្រាគីឡូ:</strong> ${escapeHtml(c.deliverySlot || 'វដ្តដើមខែ')}</div>
        <div><strong>ខែគិតប្រាក់:</strong> ${formatMonthLabel(c.month || c.date?.substring(0,7))}</div>
      </div>
    </div>

    <div style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:18px; margin-bottom:16px;">
      <h4 style="font-size:0.82rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px; font-weight:700;">📍 ទីតាំងអចលនទ្រព្យ & ចំណាំ</h4>
      <p style="font-size:0.9rem;"><strong>អាសយដ្ឋាន:</strong> ${escapeHtml(c.address)}</p>
      <p style="font-size:0.9rem; margin-top:8px;"><strong>ចំណាំទីតាំងដំឡើង:</strong> ${escapeHtml(c.notes)}</p>
    </div>

    <div style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:18px;">
      <h4 style="font-size:0.82rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; font-weight:700;">💰 សង្ខេបវិក្កយបត្រហិរញ្ញវត្ថុ</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.875rem;">
        <div><strong>លេខវិក្កយបត្រ:</strong> <span class="font-mono">${c.id}</span></div>
        <div><strong>វិធីសាស្ត្រទូទាត់:</strong> ${c.cardBrand} ···· ${c.cardLast4}</div>
        <div><strong>ថ្លៃសេវាតភ្ជាប់បានបង់:</strong> <span class="font-mono">${formatRiel(c.connectionFee || 0)}</span></div>
        <div><strong>ថ្លៃទឹកប្រើប្រាស់:</strong> <span class="font-mono">${formatRiel(c.amount)}</span></div>
        <div style="grid-column: span 2; border-top: 1px solid var(--border-color); padding-top: 10px; margin-top: 4px;">
          <strong>ទឹកប្រាក់បានទូទាត់សរុប:</strong> <span class="font-mono text-cyan" style="font-weight:800; font-size:1.15rem; margin-left: 8px;">${formatRiel(c.total)}</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-print-btn').onclick = () => window.print();
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeCustomerModal() {
  const modal = document.getElementById('customer-modal');
  if (modal) modal.classList.add('hidden');
}

function openImportModal() {
  const modal = document.getElementById('import-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeImportModal() {
  const modal = document.getElementById('import-modal');
  if (modal) modal.classList.add('hidden');
}

function downloadImportTemplate() {
  const csv = [
    'Customer Name,Email,Phone Number,Property Address,Pipeline Connection,Service Category,Connection Fee (KHR),Metered Volume (m³),Water Cost (KHR),Total Collected (KHR),Status,Date,Billing Month,Meter ID,Bill ID',
    'Sok Piseth,piseth@example.com,+855 12 333 444,House 742 Street 63,Home Connection,Monthly Usage,0,12.5,31250,31250,Completed,2026-08-13,2026-08,MTR-1001,BILL-111111',
    'Chan Sopheak,sopheak@company.com,+855 23 890 123,Building 118 Main Road,Factory Direct,Monthly Usage,1500000,25,62500,1581500,Completed,2026-08-12,2026-08,MTR-2041,BILL-111112'
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Dara_Pichmony_customer_import_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- Export CSV Report ---
function exportToCSV() {
  if (!hasPermission('exportReports')) {
    alert('សិទ្ធិនេះមានសម្រាប់ Admin និង Clerk ប៉ុណ្ណោះ។');
    return;
  }

  if (appState.customers.length === 0) { alert("ពុំមានទិន្នន័យកុងទ័រទឹកសម្រាប់ទាញយកឡើយ។"); return; }

  const headers = ["Bill ID","Meter ID","Billing Month","Customer Name","Email","Phone","Property Address","Pipeline Connection","Service Category","Connection Fee (KHR)","Metered Volume (m³)","Water Cost (KHR)","Total Collected (KHR)","Status","Date"];
  const rows = appState.customers.map(c => [
    `"${c.id}"`,
    `"${c.meterId || 'MTR-1082'}"`,
    `"${c.month || c.date?.substring(0,7)}"`,
    `"${c.name}"`,
    `"${c.email}"`,
    `"${c.phone}"`,
    `"${c.address}"`,
    `"${c.containerType || 'ទុយោតាមផ្ទះ'}"`,
    `"${c.serviceTypeName || 'ទុយោស្តង់ដារ'}"`,
    c.connectionFee || 0,
    c.cubicMeters || 0,
    c.amount,
    c.total,
    `"${c.status}"`,
    `"${c.date}"`
  ]);

  const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csv));
  link.setAttribute("download", `Dara_Pichmony_Piped_Water_Monthly_Report_${new Date().toISOString().substring(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function importCustomersFromExcel(event) {
  if (!hasPermission('manageUsers')) {
    alert('មានតែ Admin ប៉ុណ្ណោះដែលអាចនាំចូលទិន្នន័យអតិថិជនបាន។');
    event.target.value = '';
    return;
  }

  const file = event.target.files?.[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    alert('មិនអាចផ្ទុកកម្មវិធីអាន Excel បានទេ។ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិត។');
    event.target.value = '';
    return;
  }

  const input = document.getElementById('customer-import-file-input');
  if (input && input.files && input.files.length) {
    input.value = '';
  }

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    try {
      const workbook = XLSX.read(loadEvent.target.result, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const imported = rows.map(normalizeImportedCustomer).filter(customer => customer.name && customer.email);
      if (!imported.length) {
        alert('រកមិនឃើញទិន្នន័យត្រឹមត្រូវទេ។ ត្រូវមាន Customer Name និង Email។');
        return;
      }

      const existingIds = new Set(appState.customers.map(customer => customer.id));
      const newCustomers = imported.filter(customer => !existingIds.has(customer.id));
      appState.customers = [...newCustomers, ...appState.customers];
      saveCustomers();
      renderPublicDashboard();
      renderAdminMetrics();
      renderMonthlyTotals();
      populateMonthFilter();
      renderAdminTable();
      closeImportModal();
      alert(`បាននាំចូល ${newCustomers.length} កំណត់ត្រាថ្មី។${imported.length - newCustomers.length ? ` រំលង ${imported.length - newCustomers.length} កំណត់ត្រាស្ទួន។` : ''}`);
    } catch (error) {
      console.error('Excel import failed:', error);
      alert('ការនាំចូល Excel បរាជ័យ។ សូមពិនិត្យទម្រង់ឯកសារ។');
    } finally {
      event.target.value = '';
      if (input) input.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

document.addEventListener('DOMContentLoaded', () => {
  const importFileInput = document.getElementById('customer-import-file-input');
  if (importFileInput) {
    importFileInput.addEventListener('change', (event) => {
      if (event.target.files && event.target.files.length) {
        const hiddenInput = document.getElementById('customer-import-input');
        if (hiddenInput) {
          hiddenInput.files = event.target.files;
          importCustomersFromExcel({ target: hiddenInput });
        }
      }
    });
  }
});


function normalizeImportedCustomer(row) {
  const normalizeKey = (key) => String(key || '').trim().toLowerCase().replace(/[\s_\-]+/g, ' ');
  const get = (...keys) => {
    const aliases = keys.map(normalizeKey);
    const matchedKey = Object.keys(row).find(name => aliases.includes(normalizeKey(name)));
    return matchedKey !== undefined ? row[matchedKey] : '';
  };

  const dateValue = get('date', 'invoice date', 'billing date', 'created at') || formatLocalDateTime();
  const numeric = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number.parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(num) ? num : fallback;
  };

  const id = String(get('bill id', 'billid', 'invoice id', 'id') || `BILL-${Math.floor(100000 + Math.random() * 900000)}`);
  const cubicMeters = numeric(get('metered volume (m³)', 'metered volume', 'cubic meters', 'cubicmeters', 'volume', 'usage m3', 'volume (m3)'), 0);
  const amount = numeric(get('water cost (khr)', 'water cost', 'amount', 'water amount', 'monthly bill'), cubicMeters * RATE_PER_M3);
  const connectionFee = numeric(get('connection fee (khr)', 'connection fee', 'service fee', 'setup fee'), 0);
  const total = numeric(get('total collected (khr)', 'total', 'total amount', 'amount due'), connectionFee + amount);
  const statusValue = String(get('status', 'payment status', 'billing status') || 'Pending');
  const status = ['Completed', 'Pending', 'Failed', 'Rejected'].includes(statusValue) ? statusValue : 'Pending';

  const customerName = String(get('customer name', 'customername', 'customer', 'name', 'full name') || '').trim();
  const customerEmail = String(get('email', 'email address', 'e mail', 'customer email') || '').trim().toLowerCase();

  return {
    id,
    meterId: String(get('meter id', 'meterid', 'meter number', 'meter no') || 'MTR-1082'),
    name: customerName,
    email: customerEmail,
    phone: String(get('phone', 'phone number', 'mobile', 'mobile number') || 'N/A'),
    company: String(get('company', 'customer company', 'organization') || ''),
    address: String(get('property address', 'address', 'customer address', 'location') || ''),
    city: String(get('city') || ''),
    state: String(get('state') || ''),
    zip: String(get('zip', 'postal code') || ''),
    country: String(get('country') || 'កម្ពុជា (Cambodia)'),
    serviceType: 'existing_bill',
    serviceTypeName: String(get('service category', 'service type', 'billing type') || 'បង់ថ្លៃទឹកប្រចាំខែ (Monthly Usage)'),
    connectionFee,
    containerType: String(get('pipeline connection', 'container type', 'connection type', 'pipe type') || 'ទុយោតាមផ្ទះ'),
    deliverySlot: String(get('delivery slot', 'slot') || 'វដ្តដើមខែ'),
    cubicMeters,
    notes: String(get('notes', 'remarks', 'comment') || 'Imported from Excel'),
    packageName: String(get('package name', 'plan name') || 'ការប្រើប្រាស់តាមផ្ទះ (Residential)'),
    amount,
    hasExpressAddon: false,
    addonPrice: 0,
    hasWashAddon: false,
    washPrice: 0,
    hasAlkalineAddon: false,
    alkalinePrice: 0,
    tax: 0,
    total,
    cardLast4: 'N/A',
    cardBrand: 'Imported',
    status,
    date: String(dateValue),
    month: String(get('billing month', 'month', 'bill month') || dateValue).substring(0, 7),
    batchId: String(get('batch id', 'batchid') || 'IMPORTED')
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[m]);
}

// Auto-populate filter
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(populateMonthFilter, 150);
});
