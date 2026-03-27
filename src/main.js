import './style.css'
import { createIcons, PlusCircle, PieChart, Trash2, Calendar, Tags, Utensils, Car, Gamepad2, Receipt, Package, Wallet, LogOut, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, User } from 'lucide'
import Chart from 'chart.js/auto'
import { createClient } from '@supabase/supabase-js'

// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey)

// ==========================================
// 2. STATE MANAGEMENT (SUPABASE CLOUD)
// ==========================================
class ExpenseManager {
  async getExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }); 
    if (error) { console.error("Error fetching data:", error); return[]; }
    return data;
  }

  async addExpense(expense) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Sesi habis, silakan login ulang!");

    const { error } = await supabase.from('expenses').insert([{
      user_id: user.id,
      name: expense.name,
      category: expense.category,
      amount: expense.amount,
      date: expense.date
    }]);
    if (error) console.error("Error adding expense:", error);
  }

  async deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) console.error("Error deleting expense:", error);
  }
}
const db = new ExpenseManager();

// ==========================================
// 3. UTILITIES & CONFIG
// ==========================================
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hari ini';
  if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const appleColors = { Makanan: '#FF6B6B', Transportasi: '#5AC8FA', Hiburan: '#D7BDE2', Tagihan: '#FFA07A', Lainnya: '#81C784' };
const categoryIcons = { Makanan: 'utensils', Transportasi: 'car', Hiburan: 'gamepad-2', Tagihan: 'receipt', Lainnya: 'package' };

Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
Chart.defaults.color = '#9CA3AF';

// ==========================================
// 4. DOM MANIPULATION (ASYNC RENDER)
// ==========================================
let cachedExpenses =[]; // Cache data agar pindah tab cepat

const renderExpenseList = async (forceFetch = false) => {
  const listContainer = document.getElementById('expense-list');
  
  if (forceFetch || cachedExpenses.length === 0) {
    listContainer.innerHTML = '<p class="text-center py-6 text-gray-400 font-bold animate-pulse">Memuat...</p>';
    cachedExpenses = await db.getExpenses();
  }

  let expenses = cachedExpenses;
  const catFilter = window.currentHomeCategoryFilter || 'Semua';
  if (catFilter !== 'Semua') {
    expenses = expenses.filter(exp => exp.category === catFilter);
  }

  if (expenses.length === 0) {
    listContainer.innerHTML = `<p class="text-gray-400 text-center py-6 font-bold">Belum ada pengeluaran${catFilter !== 'Semua' ? ' di kategori ini' : ''}.</p>`;
    createIcons({ icons: { Trash2 } }); return;
  }

  listContainer.innerHTML = expenses.map(exp => `
    <div class="flex items-center justify-between p-4 bg-white rounded-[1.25rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-black/5 mb-3 group transition-all">
      <div class="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0" style="background-color: ${appleColors[exp.category] || '#ccc'}">
          <i data-lucide="${categoryIcons[exp.category] || 'package'}" class="w-6 h-6 text-white drop-shadow-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-bold text-gray-900 tracking-tight capitalize truncate">${exp.name}</h4>
          <p class="text-[11px] sm:text-xs text-gray-500 font-bold mt-0.5 truncate">${exp.category} • ${formatDate(exp.date)}</p>
        </div>
      </div>
      <div class="flex items-center gap-2 sm:gap-4 pl-2 flex-shrink-0">
        <span class="font-bold text-gray-900 text-sm sm:text-base">${formatRupiah(exp.amount)}</span>
        <button onclick="window.deleteItem('${exp.id}')" class="text-gray-300 hover:text-[#FF3B30] p-1.5 sm:p-2 rounded-full hover:bg-red-50 transition-colors">
          <i data-lucide="trash-2" class="w-5 h-5"></i>
        </button>
      </div>
    </div>
  `).join('');
  createIcons({ icons: { Trash2, Utensils, Car, Gamepad2, Receipt, Package } });
};

window.deleteItem = async (id) => {
  await db.deleteExpense(id);
  await updateAnalytics(true);
};

// ==========================================
// 5. ANALYTICS & CHARTS
// ==========================================
let categoryChartInstance = null;
let trendChartInstance = null;
let dailyChartInstance = null;

const updateAnalytics = async (forceFetch = false) => {
  if (forceFetch || cachedExpenses.length === 0) {
    cachedExpenses = await db.getExpenses();
  }
  const expenses = cachedExpenses;
  
  const filterInput = document.getElementById('filter-month').value;
  const[selYear, selMonth] = filterInput.split('-').map(Number);
  const catFilter = window.currentCategoryFilter || 'Semua';

  const monthExpenses = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getFullYear() === selYear && (d.getMonth() + 1) === selMonth && (catFilter === 'Semua' || exp.category === catFilter);
  });

  const totalMonth = monthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  document.getElementById('total-month').innerText = formatRupiah(totalMonth);

  const now = new Date();
  let daysPassed = (selYear === now.getFullYear() && selMonth === (now.getMonth() + 1)) ? (now.getDate() || 1) : new Date(selYear, selMonth, 0).getDate();
  document.getElementById('daily-avg').innerText = formatRupiah(totalMonth / daysPassed);

  const categoryData = {};
  monthExpenses.forEach(exp => { categoryData[exp.category] = (categoryData[exp.category] || 0) + Number(exp.amount); });

  let endDate = (selYear === now.getFullYear() && selMonth === (now.getMonth() + 1)) ? new Date() : new Date(selYear, selMonth, 0); 
  const last7Days = Array.from({length: 7}, (_, i) => { const d = new Date(endDate); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse();

  const trendData = last7Days.map(date => expenses.filter(exp => exp.date === date && (catFilter === 'Semua' || exp.category === catFilter)).reduce((sum, exp) => sum + Number(exp.amount), 0));
  const trendLabels = last7Days.map(d => d.substring(5).replace('-', '/'));

  let dailyLabels =[], dailyData =[], chartTitle = '';
  if (window.currentChartView === 'monthly') {
    dailyLabels =['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    dailyData = Array(12).fill(0);
    expenses.filter(exp => new Date(exp.date).getFullYear() === selYear && (catFilter === 'Semua' || exp.category === catFilter))
            .forEach(exp => dailyData[new Date(exp.date).getMonth()] += Number(exp.amount));
    chartTitle = `Tahun ${selYear}`;
  } else {
    const totalDaysInMonth = new Date(selYear, selMonth, 0).getDate();
    dailyLabels = Array.from({length: totalDaysInMonth}, (_, i) => i + 1);
    dailyData = Array(totalDaysInMonth).fill(0);
    monthExpenses.forEach(exp => dailyData[new Date(exp.date).getDate() - 1] += Number(exp.amount));
    const monthNames =["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    chartTitle = `${monthNames[selMonth-1]} ${selYear}`;
  }

  document.getElementById('daily-chart-title').innerText = chartTitle + (catFilter === 'Semua' ? '' : ` - ${catFilter}`);
  renderCharts(categoryData, trendData, trendLabels, dailyData, dailyLabels);
  
  if (window.location.hash !== '#/analytics') renderExpenseList(false); // Update list beranda juga
};

const renderCharts = (categoryData, trendData, trendLabels, dailyData, dailyLabels) => {
  const ctxCat = document.getElementById('categoryChart').getContext('2d');
  if (categoryChartInstance) categoryChartInstance.destroy();
  categoryChartInstance = new Chart(ctxCat, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categoryData).length ? Object.keys(categoryData) :['Belum ada data'],
      datasets:[{
        data: Object.values(categoryData).length ? Object.values(categoryData) : [1],
        backgroundColor: Object.values(categoryData).length ? Object.keys(categoryData).map(k => appleColors[k]) : ['#f3f4f6'],
        borderWidth: 0, hoverOffset: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '75%',
      plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 10, boxPadding: 10, padding: 15, font: { weight: 'bold' } } }, tooltip: { enabled: Object.keys(categoryData).length > 0 } }
    }
  });

  const ctxTrend = document.getElementById('trendChart').getContext('2d');
  if (trendChartInstance) trendChartInstance.destroy();
  const gradientBar = ctxTrend.createLinearGradient(0, 0, 0, 200);
  gradientBar.addColorStop(0, '#55E1FF'); gradientBar.addColorStop(1, '#2896FF');
  trendChartInstance = new Chart(ctxTrend, {
    type: 'bar',
    data: { labels: trendLabels, datasets:[{ data: trendData, backgroundColor: gradientBar, borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false, beginAtZero: true }, x: { grid: { display: false }, border: { display: false }, ticks: { font: { weight: 'bold' } } } } }
  });

  const ctxDaily = document.getElementById('dailyChart').getContext('2d');
  if (dailyChartInstance) dailyChartInstance.destroy();
  const gradientLine = ctxDaily.createLinearGradient(0, 0, 800, 0);
  gradientLine.addColorStop(0, '#55E1FF'); gradientLine.addColorStop(1, '#2896FF');
  const gradientDailyBg = ctxDaily.createLinearGradient(0, 0, 0, 300);
  gradientDailyBg.addColorStop(0, 'rgba(85, 225, 255, 0.4)'); gradientDailyBg.addColorStop(1, 'rgba(40, 150, 255, 0.0)');
  dailyChartInstance = new Chart(ctxDaily, {
    type: 'line',
    data: { labels: dailyLabels, datasets:[{ data: dailyData, borderColor: gradientLine, backgroundColor: gradientDailyBg, borderWidth: 3, tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6, pointBackgroundColor: '#FFF', pointBorderColor: '#2896FF', pointBorderWidth: 3 }] },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return formatRupiah(context.raw); } } } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f3f4f6', drawBorder: false }, border: { display: false }, ticks: { maxTicksLimit: 5, padding: 10, callback: function(value) { if (value >= 1000000000000) return (value / 1000000000000) + ' T'; if (value >= 1000000000) return (value / 1000000000) + ' M'; if (value >= 1000000) return (value / 1000000) + ' jt'; if (value >= 1000) return (value / 1000) + ' k'; return value; } } },
        x: { grid: { display: false }, border: { display: false }, ticks: { font: { weight: 'bold' }, padding: 10 } }
      }
    }
  });
};

// ==========================================
// 6. ROUTER & EVENT LISTENERS
// ==========================================
const handleRoute = () => {
  const hash = window.location.hash || '#/';
  const pageHome = document.getElementById('page-home');
  const pageAnalytics = document.getElementById('page-analytics');
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    if (link.getAttribute('href') === hash) { link.classList.add('text-[#2896FF]', 'bg-[#2896FF]/10'); link.classList.remove('text-gray-500'); } 
    else { link.classList.remove('text-[#2896FF]', 'bg-[#2896FF]/10'); link.classList.add('text-gray-500'); }
  });

  if (hash === '#/analytics') { pageHome.classList.add('hidden'); pageAnalytics.classList.remove('hidden'); updateAnalytics(false); } 
  else { pageAnalytics.classList.add('hidden'); pageHome.classList.remove('hidden'); renderExpenseList(false); }
};

document.addEventListener('DOMContentLoaded', () => {
  createIcons({ icons: { PlusCircle, PieChart, Trash2, Calendar, Tags, Utensils, Car, Gamepad2, Receipt, Package, Wallet, LogOut, Eye, EyeOff } });

  // --- SUPABASE AUTH STATE LISTENER ---
  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app-container');
  
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      // User is logged in
      authContainer.classList.add('hidden');
      appContainer.classList.remove('hidden');
      
      // Mengambil Nama (full_name) dari metadata rahasia Supabase
      // Jika nama kosong (misal user lama), maka fallback ke kata 'Pengguna'
      const userName = session.user.user_metadata?.full_name || 'Pengguna';
      
      // Tampilkan sapaan ke layar Mobile dan Desktop
      const greetingMobile = document.getElementById('greeting-text-mobile');
      const greetingDesktop = document.getElementById('greeting-text-desktop');
      
      if(greetingMobile) greetingMobile.innerText = `Halo, ${userName} 👋`;
      if(greetingDesktop) greetingDesktop.innerText = `Halo, ${userName} 👋`;

      updateAnalytics(true); // Mulai ambil data dari cloud
    } else {
      // User is logged out
      authContainer.classList.remove('hidden');
      appContainer.classList.add('hidden');
      
      // Kosongkan data lokal demi keamanan
      cachedExpenses =[]; 
    }
  });

  // --- LOGIN / REGISTER LOGIC ---
  createIcons({ icons: { PlusCircle, PieChart, Trash2, Calendar, Tags, Utensils, Car, Gamepad2, Receipt, Package, Wallet, LogOut, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, User } });

  let isLoginMode = true;
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  const authToggleText = document.getElementById('auth-toggle-text');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const forgotPwContainer = document.getElementById('forgot-password-container');
  const authErrorBox = document.getElementById('auth-error-box');
  const authErrorText = document.getElementById('auth-error-text');
  
  // Element Input Nama
  const authNameContainer = document.getElementById('auth-name-container');
  const authNameInput = document.getElementById('auth-name');

  const showError = (message) => {
    authErrorText.innerText = message;
    authErrorBox.classList.remove('hidden');
  };

  // Logika Toggle Login/Register
  authToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    authErrorBox.classList.add('hidden');
    
    if (isLoginMode) {
      authTitle.innerText = "Selamat Datang";
      authSubtitle.innerText = "Silakan masuk untuk mengelola keuanganmu.";
      authSubmitBtn.innerHTML = '<span>Masuk</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>';
      authToggleText.innerText = "Pengguna baru?";
      authToggleBtn.innerText = "Buat Akun";
      forgotPwContainer.classList.remove('hidden'); 
      
      // Sembunyikan input nama saat Login
      authNameContainer.classList.add('hidden');
      authNameInput.removeAttribute('required');
    } else {
      authTitle.innerText = "Buat Akun";
      authSubtitle.innerText = "Daftar sekarang untuk melacak pengeluaran.";
      authSubmitBtn.innerHTML = '<span>Daftar Sekarang</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>';
      authToggleText.innerText = "Sudah punya akun?";
      authToggleBtn.innerText = "Masuk";
      forgotPwContainer.classList.add('hidden'); 
      
      // Munculkan input nama saat Daftar
      authNameContainer.classList.remove('hidden');
      authNameInput.setAttribute('required', 'true');
    }
    createIcons({ icons: { ArrowRight } });
  });

  // (Logika Toggle Mata Password biarkan tetap ada)

  // Logika Submit Autentikasi
  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    authErrorBox.classList.add('hidden'); 
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const fullName = authNameInput.value; // Ambil nilai nama
    
    if(password.length < 6) {
      showError("Kata sandi minimal 6 karakter.");
      return;
    }

    authSubmitBtn.innerHTML = '<span class="animate-pulse">Mohon Tunggu...</span>';
    authSubmitBtn.disabled = true;
    
    if (isLoginMode) {
      // PROSES LOGIN
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) showError(error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : error.message);
    } else {
      // PROSES DAFTAR (Menyelipkan metadata nama)
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName // <-- Di sini letak keajaibannya!
          }
        }
      });
      
      if (error) {
        showError(error.message === 'User already registered' ? 'Email ini sudah terdaftar.' : error.message);
      } else {
        alert("Berhasil mendaftar! Silakan masuk dengan akun baru Anda.");
        authToggleBtn.click(); 
        document.getElementById('auth-password').value = ''; 
      }
    }
    
    authSubmitBtn.disabled = false;
    authSubmitBtn.innerHTML = isLoginMode ? '<span>Masuk</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>' : '<span>Daftar Sekarang</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>';
    createIcons({ icons: { ArrowRight } });
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
  });

  // --- MAIN APP LOGIC ---
  document.getElementById('exp-date').value = getTodayDate();
  document.getElementById('filter-month').value = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('filter-month').addEventListener('change', () => updateAnalytics(true));

  document.getElementById('exp-amount').addEventListener('input', function(e) {
    let value = this.value.replace(/[^0-9]/g, '');
    this.value = value ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
  });

  document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('btn-submit-expense');
    submitBtn.innerText = "Menyimpan data...";
    
    await db.addExpense({
      name: document.getElementById('exp-name').value, category: document.getElementById('exp-category').value,
      amount: document.getElementById('exp-amount').value.replace(/\./g, ''), date: document.getElementById('exp-date').value
    });
    
    e.target.reset(); document.getElementById('exp-date').value = getTodayDate();
    submitBtn.innerText = "Simpan Pengeluaran";
    updateAnalytics(true);
  });

  // --- TOGGLES & BUBBLES ---
  const applyFilterUI = (buttons, targetCategory) => {
    buttons.forEach(b => b.className = 'filter-bubble px-5 py-2 sm:py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-[0_2px_8px_rgb(0,0,0,0.04)] bg-white text-gray-500 hover:text-gray-900 ring-1 ring-inset ring-black/5');
    const activeBtn = Array.from(buttons).find(b => b.getAttribute('data-category') === targetCategory);
    if(activeBtn) activeBtn.className = 'filter-bubble px-5 py-2 sm:py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-[0_4px_12px_rgba(40,150,255,0.3)] bg-gradient-to-b from-[#55E1FF] to-[#2896FF] text-white';
  };

  const filterBubbles = document.querySelectorAll('.filter-bubble');
  filterBubbles.forEach(btn => btn.addEventListener('click', (e) => {
    window.currentCategoryFilter = e.target.getAttribute('data-category');
    applyFilterUI(filterBubbles, window.currentCategoryFilter); updateAnalytics(false);
  }));

  const filterBubblesHome = document.querySelectorAll('.filter-bubble-home');
  filterBubblesHome.forEach(btn => btn.addEventListener('click', (e) => {
    window.currentHomeCategoryFilter = e.target.getAttribute('data-category');
    applyFilterUI(filterBubblesHome, window.currentHomeCategoryFilter); renderExpenseList(false);
  }));

  window.currentChartView = 'monthly';
  document.getElementById('btn-view-month').addEventListener('click', () => { window.currentChartView = 'monthly'; document.getElementById('slider-bg').classList.remove('translate-x-full'); document.getElementById('btn-view-month').classList.replace('text-gray-400', 'text-gray-900'); document.getElementById('btn-view-day').classList.replace('text-gray-900', 'text-gray-400'); updateAnalytics(false); });
  document.getElementById('btn-view-day').addEventListener('click', () => { window.currentChartView = 'daily'; document.getElementById('slider-bg').classList.add('translate-x-full'); document.getElementById('btn-view-day').classList.replace('text-gray-400', 'text-gray-900'); document.getElementById('btn-view-month').classList.replace('text-gray-900', 'text-gray-400'); updateAnalytics(false); });

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
});