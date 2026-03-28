import './style.css'
import { createIcons, Home, PlusCircle, PieChart, Trash2, Calendar, Tags, Utensils, Car, Gamepad2, Receipt, Package, Wallet, LogOut, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, User, ChevronDown, TrendingDown, TrendingUp, Minus, Bell, Calculator, Check } from 'lucide'
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

  // --- [BARU] LOGIKA PENGELOMPOKAN BERDASARKAN TANGGAL ---
  const groupedExpenses =[];
  let currentDateLabel = null;
  let currentGroup = null;

  // Karena data sudah urut dari yang terbaru, kita tinggal memecahnya
  expenses.forEach(exp => {
    const label = formatDate(exp.date); // Menghasilkan "Hari ini", "Kemarin", atau "27 Mar 2026"
    
    if (label !== currentDateLabel) {
      currentDateLabel = label;
      currentGroup = { label: label, items:[] };
      groupedExpenses.push(currentGroup);
    }
    currentGroup.items.push(exp);
  });

  // --- [BARU] RENDER HTML BERDASARKAN KELOMPOK ---
  let htmlContent = '';

  groupedExpenses.forEach(group => {
    // 1. Render Judul Tanggal (Header)
    htmlContent += `
      <h4 class="text-xs sm:text-sm font-bold text-slate-400 mt-6 mb-3 ml-2 uppercase tracking-wider">
        ${group.label}
      </h4>
      <div class="space-y-3">
    `;

    // 2. Render Item Pengeluaran di bawah tanggal tersebut
    group.items.forEach(exp => {
      htmlContent += `
        <div class="flex items-center justify-between p-4 bg-white rounded-[1.25rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-black/5 group transition-all">
          <div class="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0" style="background-color: ${appleColors[exp.category] || '#ccc'}">
              <i data-lucide="${categoryIcons[exp.category] || 'package'}" class="w-6 h-6 text-white drop-shadow-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-slate-800 tracking-tight capitalize truncate">${exp.name}</h4>
              <!-- Tanggal dihapus dari sini, hanya menyisakan Kategori -->
              <p class="text-[11px] sm:text-xs text-slate-400 font-bold mt-0.5 truncate">${exp.category}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 sm:gap-4 pl-2 flex-shrink-0">
            <!-- Ditambahkan tanda minus (-) di depan nominal agar persis seperti Apple Wallet -->
            <span class="font-bold text-slate-800 text-sm sm:text-base">- ${formatRupiah(exp.amount)}</span>
            <button onclick="window.deleteItem('${exp.id}')" class="text-gray-300 hover:text-[#FF3B30] p-1.5 sm:p-2 rounded-full hover:bg-red-50 transition-colors">
              <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
          </div>
        </div>
      `;
    });

    htmlContent += `</div>`; // Tutup div space-y-3
  });

  listContainer.innerHTML = htmlContent;
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

// 1. Hitung Total Bulan Ini
  const totalMonth = monthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  document.getElementById('total-month').innerText = formatRupiah(totalMonth);

  // --- [BARU] Hitung Rata-rata Harian (Berdasarkan hari yang terisi) ---
  // Menggunakan Set() untuk mengambil tanggal unik (menghilangkan duplikat jika 1 hari ada 3 pengeluaran)
  const uniqueDays = new Set(monthExpenses.map(exp => exp.date)).size;
  
  // Jika belum ada hari terisi, rata-rata 0. Jika ada, bagi total dengan jumlah hari terisi.
  const dailyAvg = uniqueDays === 0 ? 0 : totalMonth / uniqueDays;
  
  const dailyAvgEl = document.getElementById('daily-avg');
  const daysFilledEl = document.getElementById('days-filled');
  if (dailyAvgEl) dailyAvgEl.innerText = formatRupiah(dailyAvg);
  if (daysFilledEl) daysFilledEl.innerText = uniqueDays;
  // ---------------------------------------------------------------------

  // 2. Hitung Total Bulan Lalu (Untuk Perbandingan)
  let lastMonth = selMonth - 1;
  let lastMonthYear = selYear;
  if (lastMonth === 0) {
    lastMonth = 12;
    lastMonthYear -= 1;
  }

  const lastMonthExpenses = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getFullYear() === lastMonthYear && (d.getMonth() + 1) === lastMonth && (catFilter === 'Semua' || exp.category === catFilter);
  });
  const totalLastMonth = lastMonthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // 3. Render Teks Tren Perbandingan
  const trendContainer = document.getElementById('trend-comparison');
  const diff = totalMonth - totalLastMonth;

  if (totalLastMonth === 0 && totalMonth === 0) {
    trendContainer.innerHTML = `<i data-lucide="minus" class="w-4 h-4"></i><span>Belum ada data</span>`;
  } else if (diff > 0) {
    // Jika lebih boros (Merah)
    trendContainer.innerHTML = `<i data-lucide="trending-up" class="w-4 h-4 text-red-500"></i><span>${formatRupiah(diff)} lebih banyak dari bulan lalu</span>`;
  } else if (diff < 0) {
    // Jika lebih hemat (Hijau)
    trendContainer.innerHTML = `<i data-lucide="trending-down" class="w-4 h-4 text-green-500"></i><span>${formatRupiah(Math.abs(diff))} lebih sedikit dari bulan lalu</span>`;
  } else {
    // Jika sama persis
    trendContainer.innerHTML = `<i data-lucide="minus" class="w-4 h-4 text-slate-400"></i><span>Sama persis dengan bulan lalu</span>`;
  }
  
  // Render icon baru yang disuntikkan
  createIcons({ icons: { TrendingDown, TrendingUp, Minus } });

  const categoryData = {};
  monthExpenses.forEach(exp => { categoryData[exp.category] = (categoryData[exp.category] || 0) + Number(exp.amount); });

  // [BARU] Tambahkan kembali variabel 'now' di sini!
  const now = new Date();

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
  renderCharts(categoryData, trendData, trendLabels, dailyData, dailyLabels, uniqueDays);
  
  if (window.location.hash !== '#/analytics') renderExpenseList(false); // Update list beranda juga
};

const renderCharts = (categoryData, trendData, trendLabels, dailyData, dailyLabels, uniqueDays) => {
  
  const ctxCat = document.getElementById('categoryChart').getContext('2d');
  if (categoryChartInstance) categoryChartInstance.destroy();

  // --- [BARU] CUSTOM PLUGIN UNTUK TEKS DI TENGAH LINGKARAN ---
  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: function(chart) {
      const ctx = chart.ctx;
      // Dapatkan titik tengah dari area grafik (mengabaikan legend di sebelah kanan)
      const { top, left, bottom, right } = chart.chartArea;
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Baris 1: Tulisan "Total" (Kecil, Abu-abu)
      ctx.font = `bold 11px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#9CA3AF'; // text-gray-400
      ctx.fillText('Total', centerX, centerY - 10);
      
      // Baris 2: Tulisan "X Hari" (Besar, Gelap)
      ctx.font = `bold 16px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#1E293B'; // text-slate-800
      ctx.fillText(`${uniqueDays || 0} Hari`, centerX, centerY + 10);
      
      ctx.restore();
    }
  };

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
      plugins: { 
        legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 10, boxPadding: 10, padding: 15, font: { weight: 'bold' } } }, 
        tooltip: { enabled: Object.keys(categoryData).length > 0 } 
      }
    },
    // [BARU] Daftarkan plugin teks tengah ke dalam chart ini
    plugins: [centerTextPlugin]
  });

// --------------------------------------------------------
  // Chart 2: Tren 7 Hari Terakhir (Bar Chart)
  // --------------------------------------------------------
  const ctxTrend = document.getElementById('trendChart').getContext('2d');
  if (trendChartInstance) trendChartInstance.destroy();
  
  const gradientBar = ctxTrend.createLinearGradient(0, 0, 0, 200);
  gradientBar.addColorStop(0, '#55E1FF'); 
  gradientBar.addColorStop(1, '#2896FF');
  
  trendChartInstance = new Chart(ctxTrend, {
    type: 'bar',
    data: { 
      labels: trendLabels, 
      datasets:[{ 
        data: trendData, 
        backgroundColor: gradientBar, 
        borderRadius: 4 
      }] 
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      plugins: { 
        legend: { display: false },
        // [BARU] Format Tooltip Rupiah saat batang disentuh
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatRupiah(context.raw); 
            }
          }
        }
      }, 
      scales: { 
        y: { 
          beginAtZero: true,
          // Garis horizontal tetap menyala (warna abu-abu halus)
          grid: { color: '#f3f4f6', drawBorder: false }, 
          border: { display: false },
          ticks: { 
            maxTicksLimit: 5, 
            padding: 10,
            callback: function(value) {
              if (value >= 1000000000000) return (value / 1000000000000) + ' T'; 
              if (value >= 1000000000) return (value / 1000000000) + ' M';       
              if (value >= 1000000) return (value / 1000000) + ' jt';             
              if (value >= 1000) return (value / 1000) + ' rb';                   
              return value;                                                       
            }
          }
        }, 
        x: { 
          // [UBAH] Matikan garis vertikal di sini (display: false)
          grid: { display: false, drawBorder: false }, 
          border: { display: false }, 
          ticks: { font: { weight: 'bold' }, padding: 10 } 
        } 
      }
    }
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
  const pageHome = document.getElementById('page-home'); // Ini sekarang halaman Input
  const pageAnalytics = document.getElementById('page-analytics'); // Ini sekarang Dashboard
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    if (link.getAttribute('href') === hash) { 
      link.classList.add('text-[#2896FF]', 'bg-[#2896FF]/10'); 
      link.classList.remove('text-gray-500'); 
    } else { 
      link.classList.remove('text-[#2896FF]', 'bg-[#2896FF]/10'); 
      link.classList.add('text-gray-500'); 
    }
  });

  // Jika URL adalah #/input, tampilkan form Input
  if (hash === '#/input') { 
    pageAnalytics.classList.add('hidden'); 
    pageHome.classList.remove('hidden'); 
    renderExpenseList(false); 
  } 
  // Jika URL adalah #/ (Default), tampilkan Dashboard Analytics
  else { 
    pageHome.classList.add('hidden'); 
    pageAnalytics.classList.remove('hidden'); 
    updateAnalytics(false); 
  }
};

document.addEventListener('DOMContentLoaded', () => {
  createIcons({ icons: { PlusCircle, PieChart, Home, Trash2, Calendar, Tags, Utensils, Car, Gamepad2, Receipt, Package, Wallet, LogOut, Eye, EyeOff } });

  // --- SUPABASE AUTH STATE LISTENER ---
  const authContainer = document.getElementById('auth-container');
  
  // [UBAH] Targetkan 'app-wrapper' yang baru kita buat, bukan 'app-container'
  const appWrapper = document.getElementById('app-wrapper'); 
  
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      // User is logged in
      authContainer.classList.add('hidden');
      appWrapper.classList.remove('hidden'); // [UBAH]
      
      const userName = session.user.user_metadata?.full_name || 'Pengguna';
      const greetingMobile = document.getElementById('greeting-text-mobile');
      const greetingDesktop = document.getElementById('greeting-text-desktop');
      
      if(greetingMobile) greetingMobile.innerText = `Halo, ${userName} 👋`;
      if(greetingDesktop) greetingDesktop.innerText = `Halo, ${userName} 👋`;

      updateAnalytics(true); 
    } else {
      // User is logged out
      authContainer.classList.remove('hidden');
      appWrapper.classList.add('hidden'); // [UBAH]
      
      // Kosongkan data lokal demi keamanan
      cachedExpenses =[]; 
    }
  });

  // --- LOGIN / REGISTER LOGIC ---
// --- LOGIN / REGISTER LOGIC ---
  createIcons({ icons: { PlusCircle, PieChart, Home, Trash2, Calendar, Tags, Utensils, Car, Gamepad2, Receipt, Package, Wallet, LogOut, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, User, ChevronDown, Bell, Calculator, Check } });

  let isLoginMode = true;
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const forgotPwLink = document.getElementById('forgot-password-link');
  const authErrorBox = document.getElementById('auth-error-box');
  const authErrorText = document.getElementById('auth-error-text');
  
  // Element Input Nama
  const authNameContainer = document.getElementById('auth-name-container');
  const authNameInput = document.getElementById('auth-name');

  // Element Toggle Baru
  const btnModeLogin = document.getElementById('btn-mode-login');
  const btnModeRegister = document.getElementById('btn-mode-register');
  const authSliderBg = document.getElementById('auth-slider-bg');

  const showError = (message) => {
    authErrorText.innerText = message;
    authErrorBox.classList.remove('hidden');
  };

  // Logika Klik Tombol "Masuk" (Toggle Kiri)
  btnModeLogin.addEventListener('click', (e) => {
    e.preventDefault();
    if (isLoginMode) return; // Jika sudah di mode login, abaikan
    isLoginMode = true;
    authErrorBox.classList.add('hidden');
    
    // Animasi Slider
    authSliderBg.classList.remove('translate-x-full');
    btnModeLogin.classList.replace('text-gray-400', 'text-slate-900');
    btnModeRegister.classList.replace('text-slate-900', 'text-gray-400');
    
    // Ubah UI Form
    authSubmitBtn.innerHTML = '<span>Masuk</span>';
    forgotPwLink.classList.remove('hidden'); 
    authNameContainer.classList.remove('flex');
    authNameContainer.classList.add('hidden');
    authNameInput.removeAttribute('required');
  });

  // Logika Klik Tombol "Daftar" (Toggle Kanan)
  btnModeRegister.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isLoginMode) return; // Jika sudah di mode daftar, abaikan
    isLoginMode = false;
    authErrorBox.classList.add('hidden');
    
    // Animasi Slider
    authSliderBg.classList.add('translate-x-full');
    btnModeRegister.classList.replace('text-gray-400', 'text-slate-900');
    btnModeLogin.classList.replace('text-slate-900', 'text-gray-400');
    
    // Ubah UI Form
    authSubmitBtn.innerHTML = '<span>Daftar Sekarang</span>';
    forgotPwLink.classList.add('hidden'); 
    authNameContainer.classList.remove('hidden');
    authNameContainer.classList.add('flex');
    authNameInput.setAttribute('required', 'true');
  });

  // Logika Intip Password (Show/Hide)
  const passwordInput = document.getElementById('auth-password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  
  togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePasswordBtn.innerHTML = type === 'password' 
      ? '<i data-lucide="eye" class="w-5 h-5"></i>' 
      : '<i data-lucide="eye-off" class="w-5 h-5 text-[#2896FF]"></i>';
    createIcons({ icons: { Eye, EyeOff } });
  });

  // Logika Submit Autentikasi
  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    authErrorBox.classList.add('hidden'); 
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const fullName = authNameInput.value; 
    
    if(password.length < 6) {
      showError("Kata sandi minimal 6 karakter.");
      return;
    }

    authSubmitBtn.innerHTML = '<span class="animate-pulse">Mohon Tunggu...</span>';
    authSubmitBtn.disabled = true;
    
    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) showError(error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : error.message);
    } else {
      const { error } = await supabase.auth.signUp({ 
        email, password, options: { data: { full_name: fullName } }
      });
      
      if (error) {
        showError(error.message === 'User already registered' ? 'Email ini sudah terdaftar.' : error.message);
      } else {
        alert("Berhasil mendaftar! Silakan masuk dengan akun baru Anda.");
        btnModeLogin.click(); // Otomatis geser kembali ke mode Login
        document.getElementById('auth-password').value = ''; 
      }
    }
    
    authSubmitBtn.disabled = false;
    authSubmitBtn.innerHTML = isLoginMode ? '<span>Masuk</span>' : '<span>Daftar Sekarang</span>';
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
      name: document.getElementById('exp-name').value, 
      category: document.getElementById('exp-category').value,
      amount: document.getElementById('exp-amount').value.replace(/\./g, ''), 
      date: document.getElementById('exp-date').value
    });
    
    e.target.reset(); 
    document.getElementById('exp-date').value = getTodayDate();
    submitBtn.innerText = "Simpan Pengeluaran";
    
    // [BARU] Tambahkan await di sini agar UI langsung ter-refresh seketika!
    await updateAnalytics(true);
    await renderExpenseList(false);
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
  document.getElementById('btn-view-month').addEventListener('click', () => { window.currentChartView = 'monthly'; document.getElementById('slider-bg').classList.remove('translate-x-full'); document.getElementById('btn-view-month').classList.replace('text-gray-400', 'text-white'); document.getElementById('btn-view-day').classList.replace('text-white', 'text-gray-400'); updateAnalytics(false); });
  document.getElementById('btn-view-day').addEventListener('click', () => { window.currentChartView = 'daily'; document.getElementById('slider-bg').classList.add('translate-x-full'); document.getElementById('btn-view-day').classList.replace('text-gray-400', 'text-white'); document.getElementById('btn-view-month').classList.replace('text-white', 'text-gray-400'); updateAnalytics(false); });

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
});