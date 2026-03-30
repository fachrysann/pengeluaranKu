import './style.css'
import { createIcons, Home, PlusCircle, PieChart, Trash2, Calendar, Tags, Utensils, Car, Gamepad2, Receipt, Package, Wallet, LogOut, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, User, ChevronDown, TrendingDown, TrendingUp, Minus, Bell, Calculator, Check, ChevronLeft, ChevronRight, Search, Settings, Pencil, Plus, X, CheckCircle, Trophy, SlidersHorizontal, CalendarCheck, Shield, Settings2, HelpCircle } from 'lucide'
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
// 4. ROUTER & EVENT LISTENERS
// ==========================================
const handleRoute = () => {
  const hash = window.location.hash || '#/';
  const pageHome = document.getElementById('page-home'); 
  const pageAnalytics = document.getElementById('page-analytics'); 
  const pageSettings = document.getElementById('page-settings');
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

  if (hash === '#/input') { 
    pageAnalytics.classList.add('hidden'); 
    pageSettings?.classList.add('hidden'); 
    pageHome.classList.remove('hidden'); 
    renderExpenseList(false); 
  } else if (hash === '#/settings') {
    pageAnalytics.classList.add('hidden'); 
    pageHome.classList.add('hidden'); 
    pageSettings?.classList.remove('hidden');
    if(window.loadProfileData) window.loadProfileData();
  } else { 
    pageHome.classList.add('hidden'); 
    pageSettings?.classList.add('hidden'); 
    pageAnalytics.classList.remove('hidden'); 
    updateAnalytics(false); 
  }

  //[BARU] Otomatis scroll perlahan ke paling atas halaman setiap kali pindah tab/section
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==========================================
// 5. DOM MANIPULATION (ASYNC RENDER)
// ==========================================
let cachedExpenses =[]; 
window.currentHistoryPage = 1;
const ITEMS_PER_PAGE = 7; 

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

  const searchInput = document.getElementById('search-history');
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
  
  if (searchQuery) {
    expenses = expenses.filter(exp => exp.name.toLowerCase().includes(searchQuery));
  }

  // ==========================================
  // [BARU] LOGIKA FILTER LANJUTAN
  // ==========================================
  if (window.advFilters) {
    if (window.advFilters.minAmount > 0) {
      expenses = expenses.filter(exp => Number(exp.amount) >= window.advFilters.minAmount);
    }
    if (window.advFilters.maxAmount > 0) {
      expenses = expenses.filter(exp => Number(exp.amount) <= window.advFilters.maxAmount);
    }
    if (window.advFilters.startDate) {
      expenses = expenses.filter(exp => exp.date >= window.advFilters.startDate);
    }
    if (window.advFilters.endDate) {
      expenses = expenses.filter(exp => exp.date <= window.advFilters.endDate);
    }
  }

  if (expenses.length === 0) {
    let emptyMsg = `Belum ada pengeluaran${catFilter !== 'Semua' ? ' di kategori ini' : ''}.`;
    
    // Cek apakah ada filter lanjutan yang sedang aktif
    const isFilterActive = window.advFilters && (window.advFilters.minAmount > 0 || window.advFilters.maxAmount > 0 || window.advFilters.startDate || window.advFilters.endDate);
    
    if (searchQuery) {
      emptyMsg = `Pencarian "${searchQuery}" tidak ditemukan.`;
    } else if (isFilterActive) {
      emptyMsg = `Tidak ada pengeluaran yang sesuai dengan filter.`;
    }
    
    listContainer.innerHTML = `<p class="text-gray-400 text-center py-6 font-bold">${emptyMsg}</p>`;
    createIcons({ icons: { Trash2 } }); return;
  }

  const totalItems = expenses.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  if (window.currentHistoryPage > totalPages) window.currentHistoryPage = totalPages;
  if (window.currentHistoryPage < 1) window.currentHistoryPage = 1;

  const startIndex = (window.currentHistoryPage - 1) * ITEMS_PER_PAGE;
  const paginatedExpenses = expenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const groupedExpenses =[];
  let currentDateLabel = null;
  let currentGroup = null;

  paginatedExpenses.forEach(exp => {
    const label = formatDate(exp.date); 
    
    if (label !== currentDateLabel) {
      currentDateLabel = label;
      currentGroup = { label: label, items:[] };
      groupedExpenses.push(currentGroup);
    }
    currentGroup.items.push(exp);
  });

  let htmlContent = '';

  groupedExpenses.forEach(group => {
    htmlContent += `
      <h4 class="text-xs sm:text-sm font-bold text-slate-400 mt-6 mb-3 ml-2 uppercase tracking-wider">
        ${group.label}
      </h4>
      <div class="space-y-3">
    `;

    group.items.forEach(exp => {
      htmlContent += `
        <div class="flex items-center justify-between p-4 bg-white rounded-[1.25rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-black/5 group transition-all">
          <div class="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0" style="background-color: ${appleColors[exp.category] || '#ccc'}">
              <i data-lucide="${categoryIcons[exp.category] || 'package'}" class="w-6 h-6 text-white drop-shadow-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-slate-800 tracking-tight capitalize truncate">${exp.name}</h4>
              <p class="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate">${exp.category}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 sm:gap-4 pl-2 flex-shrink-0">
            <span class="font-bold text-slate-800 text-sm sm:text-base">- ${formatRupiah(exp.amount)}</span>
            <button onclick="window.deleteItem('${exp.id}')" class="text-gray-300 hover:text-[#FF3B30] p-1.5 sm:p-2 rounded-full hover:bg-red-50 transition-colors">
              <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
          </div>
        </div>
      `;
    });
    htmlContent += `</div>`; 
  });

  if (totalPages > 1) {
    const isFirstPage = window.currentHistoryPage === 1;
    const isLastPage = window.currentHistoryPage === totalPages;

    htmlContent += `
      <div class="flex justify-end items-center gap-3 sm:gap-4 mt-6 pt-4 border-t border-black/5">
        
        <span class="text-[11px] sm:text-xs font-bold text-slate-400">
          Hal <span class="text-slate-700">${window.currentHistoryPage}</span> dari ${totalPages}
        </span>
        
        <div class="flex bg-white shadow-[0_4px_12px_rgb(0,0,0,0.04)] border border-black/5 rounded-xl overflow-hidden">
          
          <button onclick="window.changeHistoryPage(-1)" 
                  class="px-4 py-2 text-slate-400 hover:text-[#2896FF] hover:bg-slate-50 active:bg-slate-100 border-r border-black/5 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed" 
                  ${isFirstPage ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          
          <button onclick="window.changeHistoryPage(1)" 
                  class="px-4 py-2 text-slate-400 hover:text-[#2896FF] hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed" 
                  ${isLastPage ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>

        </div>
      </div>
    `;
  }

  listContainer.innerHTML = htmlContent;
  createIcons({ icons: { Trash2, Utensils, Car, Gamepad2, Receipt, Package, ChevronLeft, ChevronRight } });
};

window.changeHistoryPage = (direction) => {
  window.currentHistoryPage += direction;
  renderExpenseList(false);
  document.getElementById('expense-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteItem = async (id) => {
  await db.deleteExpense(id);
  await updateAnalytics(true);
};

// ==========================================
// 6. ANALYTICS & CHARTS
// ==========================================
let categoryChartInstance = null;
let trendChartInstance = null;
let dailyChartInstance = null;

const renderHeatmap = (year, month, data) => {
  const container = document.getElementById('heatmap-container');
  if (!container) return;
  container.innerHTML = '';

  const startDay = new Date(year, month - 1, 1).getDay(); 
  const daysInMonth = new Date(year, month, 0).getDate(); 
  const maxExpense = Math.max(...data) || 1; 

  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'w-full h-5 sm:h-6 rounded-[4px] bg-transparent';
    container.appendChild(empty);
  }

  for (let i = 0; i < daysInMonth; i++) {
    const amount = data[i];
    const square = document.createElement('div');
    
    let colorClass = 'bg-slate-100'; 
    if (amount > 0) {
      const ratio = amount / maxExpense;
      if (ratio <= 0.25) colorClass = 'bg-[#2896FF]/30';
      else if (ratio <= 0.5) colorClass = 'bg-[#2896FF]/50';
      else if (ratio <= 0.75) colorClass = 'bg-[#2896FF]/75';
      else colorClass = 'bg-[#2896FF]';
    }

    square.tabIndex = 0;
    square.className = `w-full h-5 sm:h-6 rounded-[4px] ${colorClass} cursor-pointer transition-all hover:scale-105 hover:ring-2 hover:ring-[#2896FF]/50 focus:scale-105 focus:ring-2 focus:ring-[#2896FF]/50 relative group outline-none hover:z-50 focus:z-50`;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:block group-focus:block z-[100] pointer-events-none';
    tooltip.innerHTML = `
      <div class="bg-white border border-black/5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] rounded-xl p-3 whitespace-nowrap text-left min-w-max relative">
        <div class="text-[11px] font-semibold text-slate-400 mb-0.5">Tanggal ${i + 1}</div>
        <div class="text-[13px] font-bold text-slate-800">${formatRupiah(amount)}</div>
        <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-black/5 rotate-45 rounded-sm"></div>
      </div>
    `;
    
    square.appendChild(tooltip);
    container.appendChild(square);
  }
};

const updateAnalytics = async (forceFetch = false) => {
  if (forceFetch || cachedExpenses.length === 0) {
    cachedExpenses = await db.getExpenses();
  }
  const expenses = cachedExpenses;
  
  const filterInput = document.getElementById('filter-month').value;
  const[selYear, selMonth] = filterInput.split('-').map(Number);
  const catFilter = window.currentCategoryFilter || 'Semua';

  const namaBulan =["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const heatmapTitleEl = document.getElementById('heatmap-title');
  if (heatmapTitleEl) {
    heatmapTitleEl.innerText = `Aktivitas Bulan ${namaBulan[selMonth - 1]}`;
  }

  const monthExpenses = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getFullYear() === selYear && (d.getMonth() + 1) === selMonth && (catFilter === 'Semua' || exp.category === catFilter);
  });

  const totalMonth = monthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  document.getElementById('total-month').innerText = formatRupiah(totalMonth);

  const uniqueDays = new Set(monthExpenses.map(exp => exp.date)).size;
  const dailyAvg = uniqueDays === 0 ? 0 : totalMonth / uniqueDays;
  
  const dailyAvgEl = document.getElementById('daily-avg');
  const daysFilledEl = document.getElementById('days-filled');
  if (dailyAvgEl) dailyAvgEl.innerText = formatRupiah(dailyAvg);
  if (daysFilledEl) daysFilledEl.innerText = uniqueDays;

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

  const trendContainer = document.getElementById('trend-comparison');
  const diff = totalMonth - totalLastMonth;

  if (totalLastMonth === 0 && totalMonth === 0) {
    trendContainer.innerHTML = `<i data-lucide="minus" class="w-4 h-4"></i><span>Belum ada data</span>`;
  } else if (diff > 0) {
    trendContainer.innerHTML = `<i data-lucide="trending-up" class="w-4 h-4 text-red-500"></i><span>${formatRupiah(diff)} lebih banyak dari bulan lalu</span>`;
  } else if (diff < 0) {
    trendContainer.innerHTML = `<i data-lucide="trending-down" class="w-4 h-4 text-green-500"></i><span>${formatRupiah(Math.abs(diff))} lebih sedikit dari bulan lalu</span>`;
  } else {
    trendContainer.innerHTML = `<i data-lucide="minus" class="w-4 h-4 text-slate-400"></i><span>Sama persis dengan bulan lalu</span>`;
  }
  
  createIcons({ icons: { TrendingDown, TrendingUp, Minus } });

  const categoryData = {};
  monthExpenses.forEach(exp => { categoryData[exp.category] = (categoryData[exp.category] || 0) + Number(exp.amount); });

  // ==========================================
  // [BARU] Hitung Kategori Teratas & Hari Tertinggi
  // ==========================================
  const catEmojis = { Makanan: '🍔', Transportasi: '🚗', Hiburan: '🎮', Tagihan: '🧾', Lainnya: '📦' };
  let topCatText = "-";

  if (Object.keys(categoryData).length > 0) {
    const topCat = Object.keys(categoryData).reduce((a, b) => categoryData[a] > categoryData[b] ? a : b);
    topCatText = `${topCat} ${catEmojis[topCat] || ''}`;
  }

  const topCatEl = document.getElementById('top-category');
  if (topCatEl) topCatEl.innerText = topCatText;

  const dailySums = {};
  monthExpenses.forEach(exp => {
    dailySums[exp.date] = (dailySums[exp.date] || 0) + Number(exp.amount);
  });

  let highestDate = null;
  let maxAmount = 0;
  for (const[date, amount] of Object.entries(dailySums)) {
    if (amount > maxAmount) {
      maxAmount = amount;
      highestDate = date;
    }
  }

  let highestDayText = "-";
  if (highestDate) {
    const d = new Date(highestDate);
    // Akan merender format tanggal seperti "12 Mar"
    highestDayText = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); 
  }

  const highestDayEl = document.getElementById('highest-day');
  if (highestDayEl) highestDayEl.innerText = highestDayText;

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
  
  const totalDaysInMonthHeatmap = new Date(selYear, selMonth, 0).getDate();
  const heatmapData = Array(totalDaysInMonthHeatmap).fill(0);
  monthExpenses.forEach(exp => heatmapData[new Date(exp.date).getDate() - 1] += Number(exp.amount));
  
  renderHeatmap(selYear, selMonth, heatmapData);
  renderCharts(categoryData, trendData, trendLabels, dailyData, dailyLabels, uniqueDays);
  
  if (window.updateChartNavButtons) {
    setTimeout(() => window.updateChartNavButtons(), 100);
  }
  
  if (window.location.hash !== '#/analytics') renderExpenseList(false);
};

const renderCharts = (categoryData, trendData, trendLabels, dailyData, dailyLabels, uniqueDays) => {
  const modernTooltipBase = {
    backgroundColor: '#ffffff',
    titleColor: '#94a3b8', 
    bodyColor: '#1e293b',  
    titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' },
    bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 'bold' },
    padding: 12,
    cornerRadius: 12,
    borderColor: 'rgba(0,0,0,0.08)', 
    borderWidth: 1,
    caretSize: 6,
    caretPadding: 10, 
  };

  const ctxCat = document.getElementById('categoryChart').getContext('2d');
  if (categoryChartInstance) categoryChartInstance.destroy();

  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: function(chart) {
      const ctx = chart.ctx;
      const { top, left, bottom, right } = chart.chartArea;
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.font = `bold 11px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#9CA3AF'; 
      ctx.fillText('Total', centerX, centerY - 10);
      
      ctx.font = `bold 16px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#1E293B'; 
      ctx.fillText(`${uniqueDays || 0} Hari`, centerX, centerY + 10);
      
      ctx.restore();
    }
  };

  categoryChartInstance = new Chart(ctxCat, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categoryData).length ? Object.keys(categoryData) :['Belum ada data'],
      datasets:[{
        data: Object.values(categoryData).length ? Object.values(categoryData) :[1],
        backgroundColor: Object.values(categoryData).length ? Object.keys(categoryData).map(k => appleColors[k]) : ['#f3f4f6'],
        borderWidth: 0, hoverOffset: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '75%',
      plugins: { 
        legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 10, boxPadding: 10, padding: 15, font: { weight: 'bold' } } }, 
        tooltip: { 
          ...modernTooltipBase,
          enabled: Object.keys(categoryData).length > 0,
          displayColors: true,
          usePointStyle: true,
          boxPadding: 8,
          callbacks: {
            label: function(context) { return ' ' + formatRupiah(context.raw); }
          }
        } 
      }
    },
    plugins:[centerTextPlugin]
  });

  const ctxTrend = document.getElementById('trendChart').getContext('2d');
  if (trendChartInstance) trendChartInstance.destroy();
  
  const gradientBar = ctxTrend.createLinearGradient(0, 0, 0, 200);
  gradientBar.addColorStop(0, '#55E1FF'); gradientBar.addColorStop(1, '#2896FF');
  
  trendChartInstance = new Chart(ctxTrend, {
    type: 'bar',
    data: { labels: trendLabels, datasets:[{ data: trendData, backgroundColor: gradientBar, borderRadius: 4 }] },
    options: { 
      responsive: true, maintainAspectRatio: false, 
      plugins: { 
        legend: { display: false },
        tooltip: {
          ...modernTooltipBase,
          displayColors: false,
          callbacks: {
            title: function(context) { return context[0].label; },
            label: function(context) { return formatRupiah(context.raw); }
          }
        }
      }, 
      scales: { 
        y: { 
          beginAtZero: true, grid: { color: '#f3f4f6', drawBorder: false }, border: { display: false },
          ticks: { 
            maxTicksLimit: 5, padding: 10,
            callback: function(value) {
              if (value >= 1000000000000) return (value / 1000000000000) + ' T'; 
              if (value >= 1000000000) return (value / 1000000000) + ' M';       
              if (value >= 1000000) return (value / 1000000) + ' jt';             
              if (value >= 1000) return (value / 1000) + ' rb';                   
              return value;                                                       
            }
          }
        }, 
        x: { grid: { display: false, drawBorder: false }, border: { display: false }, ticks: { font: { weight: 'bold' }, padding: 10 } } 
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
    data: { 
      labels: dailyLabels, 
      datasets:[{ 
        data: dailyData, borderColor: gradientLine, backgroundColor: gradientDailyBg, 
        borderWidth: 3, tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6, 
        pointBackgroundColor: '#FFF', pointBorderColor: '#2896FF', pointBorderWidth: 3 
      }] 
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { 
        legend: { display: false }, 
        tooltip: { 
          ...modernTooltipBase,
          displayColors: false,
          callbacks: { 
            title: function(context) { return window.currentChartView === 'monthly' ? 'Bulan ' + context[0].label : 'Tanggal ' + context[0].label; },
            label: function(context) { return formatRupiah(context.raw); } 
          } 
        } 
      },
      scales: {
        y: { 
          beginAtZero: true, grid: { color: '#f3f4f6', drawBorder: false }, border: { display: false }, 
          ticks: { 
            maxTicksLimit: 5, padding: 10, 
            callback: function(value) { 
              if (value >= 1000000000000) return (value / 1000000000000) + ' T'; 
              if (value >= 1000000000) return (value / 1000000000) + ' M'; 
              if (value >= 1000000) return (value / 1000000) + ' jt'; 
              if (value >= 1000) return (value / 1000) + ' k'; 
              return value; 
            } 
          } 
        },
        x: { grid: { display: false }, border: { display: false }, ticks: { font: { weight: 'bold' }, padding: 10 } }
      }
    }
  });
};

// ==========================================
// 7. INITIALIZATION (DOM CONTENT LOADED)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  createIcons({ icons: { PlusCircle, PieChart, Home, Trash2, Calendar, Tags, Utensils, Car, Gamepad2, Receipt, Package, Wallet, LogOut, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, User, ChevronDown, TrendingDown, TrendingUp, Minus, Bell, Calculator, Check, ChevronLeft, ChevronRight, Search, Settings, Pencil, Plus, X, CheckCircle, Trophy, SlidersHorizontal, CalendarCheck, Shield, Settings2, HelpCircle } });
  // --- SETTINGS (AVATAR & NAMA) LOGIC ---
  const avatarsMap = {
    '1': 'https://api.dicebear.com/9.x/dylan/svg?seed=Felix&backgroundColor=transparent',
    '2': 'https://api.dicebear.com/9.x/dylan/svg?seed=Aneka&backgroundColor=transparent',
    '3': 'https://api.dicebear.com/9.x/dylan/svg?seed=Mimi&backgroundColor=transparent',
    '4': 'https://api.dicebear.com/9.x/dylan/svg?seed=Oreo&backgroundColor=transparent',
    '5': 'https://api.dicebear.com/9.x/dylan/svg?seed=Leo&backgroundColor=transparent'
  };

  window.updateGreetingUI = (user) => {
    const userName = user.user_metadata?.full_name || 'Pengguna';
    const avatarId = user.user_metadata?.avatar_url || '1';

    const greetingMobile = document.getElementById('greeting-text-mobile');
    const greetingDesktop = document.getElementById('greeting-text-desktop');
    
    if(greetingMobile) greetingMobile.innerText = `Halo, ${userName} 👋`;
    if(greetingDesktop) greetingDesktop.innerText = `Halo, ${userName} 👋`;

    const mobIcon = document.getElementById('mobile-avatar-icon');
    const mobImg = document.getElementById('mobile-avatar-img');
    const deskIcon = document.getElementById('desktop-avatar-icon');
    const deskImg = document.getElementById('desktop-avatar-img');

    if (avatarId && avatarsMap[avatarId]) {
      if(mobImg) { mobImg.src = avatarsMap[avatarId]; mobImg.classList.remove('hidden'); }
      if(mobIcon) mobIcon.classList.add('hidden');
      if(deskImg) { deskImg.src = avatarsMap[avatarId]; deskImg.classList.remove('hidden'); }
      if(deskIcon) deskIcon.classList.add('hidden');
    } else {
      if(mobImg) mobImg.classList.add('hidden');
      if(mobIcon) mobIcon.classList.remove('hidden');
      if(deskImg) deskImg.classList.add('hidden');
      if(deskIcon) deskIcon.classList.remove('hidden');
    }
  };

  let selectedAvatar = '1';
  const avatarButtons = document.querySelectorAll('.avatar-btn');
  
  const selectAvatar = (avatarId) => {
    selectedAvatar = avatarId;
    avatarButtons.forEach(btn => {
      if (btn.getAttribute('data-avatar') === avatarId) {
        btn.classList.add('border-[#2896FF]');
        btn.classList.remove('border-transparent');
      } else {
        btn.classList.remove('border-[#2896FF]');
        btn.classList.add('border-transparent');
      }
    });
  };

  avatarButtons.forEach(btn => {
    btn.addEventListener('click', () => selectAvatar(btn.getAttribute('data-avatar')));
  });

window.loadProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const metadata = user.user_metadata || {};
    
    const currentFullName = metadata.full_name || 'Pengguna';
    const currentEmail = user.email || 'Tidak ada email';
    const currentAvatar = metadata.avatar_url || '1';

    // 1. Isi Mode Lihat (View Mode)
    document.getElementById('display-profile-name').innerText = currentFullName;
    document.getElementById('display-profile-email').innerText = currentEmail;
    const displayAvatarEl = document.getElementById('display-profile-avatar');
    if (displayAvatarEl && avatarsMap[currentAvatar]) {
      displayAvatarEl.src = avatarsMap[currentAvatar];
    }

    // ==========================================
    // [BARU] HITUNG STATISTIK AKTIVITAS USER
    // ==========================================
    // Pastikan data sudah ter-fetch
    if (cachedExpenses.length === 0) {
      cachedExpenses = await db.getExpenses();
    }
    
    // Hitung Total Catatan
    const totalEntries = cachedExpenses.length;
    
    // Hitung Hari Aktif (Tanggal Unik)
    const uniqueActiveDays = new Set(cachedExpenses.map(exp => exp.date)).size;

    // Tampilkan ke UI
    const statEntriesEl = document.getElementById('stat-total-entries');
    const statDaysEl = document.getElementById('stat-active-days');
    
    if (statEntriesEl) statEntriesEl.innerText = totalEntries;
    if (statDaysEl) statDaysEl.innerText = uniqueActiveDays;
    // ==========================================

    // 2. Isi Mode Edit (Form Mode)
    document.getElementById('profile-name').value = currentFullName;
    selectAvatar(currentAvatar);
  };

  // Toggle masuk Mode Edit
  document.getElementById('btn-edit-profile-mode').addEventListener('click', () => {
    document.getElementById('profile-view-mode').classList.add('hidden');
    document.getElementById('profile-form').classList.remove('hidden');
    // [BARU] Scroll perlahan ke paling atas halaman
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Toggle Batal Edit (Kembali ke Mode Lihat)
  document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    document.getElementById('profile-form').classList.add('hidden');
    document.getElementById('profile-view-mode').classList.remove('hidden');
    window.loadProfileData(); // Reset form ke kondisi semula
    // [BARU] Scroll perlahan ke paling atas halaman
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Submit Form Profile
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-name').value;
    const btn = document.getElementById('btn-save-profile');
    btn.innerHTML = '<span class="animate-pulse">Menyimpan...</span>';
    btn.disabled = true;

    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: name, avatar_url: selectedAvatar }
    });

    btn.innerHTML = '<span>Simpan Perubahan</span>';
    btn.disabled = false;
    
    if (!error) {
      window.updateGreetingUI(data.user);
      window.loadProfileData(); // Reload UI data profil
      
      // Berhasil simpan, kembalikan tampilan ke Mode Lihat
      document.getElementById('profile-form').classList.add('hidden');
      document.getElementById('profile-view-mode').classList.remove('hidden');
      // [BARU] Scroll perlahan ke paling atas halaman
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert('Gagal memperbarui profil: ' + error.message);
    }
  });

  // --- SUPABASE AUTH STATE LISTENER ---
  const authContainer = document.getElementById('auth-container');
  const appWrapper = document.getElementById('app-wrapper'); 
  
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      authContainer.classList.add('hidden');
      appWrapper.classList.remove('hidden');
      
      if(window.updateGreetingUI) window.updateGreetingUI(session.user);
      updateAnalytics(true); 
    } else {
      authContainer.classList.remove('hidden');
      appWrapper.classList.add('hidden');
      cachedExpenses =[]; 
      
      // [BARU] Reset hash ke Beranda saat logout
      window.location.hash = '#/'; 
    }
  });

  const searchInputEl = document.getElementById('search-history');
  if (searchInputEl) {
    searchInputEl.addEventListener('input', () => {
      window.currentHistoryPage = 1; 
      renderExpenseList(false);      
    });
  }

  // ==========================================
  // [BARU] EVENT LISTENER FILTER LANJUTAN
  // ==========================================
  const advPanel = document.getElementById('advanced-filter-panel');
  const btnAdvToggle = document.getElementById('btn-advanced-filter');
  
  const formatInputNumeric = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    e.target.value = val ? val.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
  };
  const minAmountEl = document.getElementById('filter-min-amount');
  const maxAmountEl = document.getElementById('filter-max-amount');
  if(minAmountEl) minAmountEl.addEventListener('input', formatInputNumeric);
  if(maxAmountEl) maxAmountEl.addEventListener('input', formatInputNumeric);

  if(btnAdvToggle) {
      btnAdvToggle.addEventListener('click', () => {
        advPanel.classList.toggle('hidden');
        if(!advPanel.classList.contains('hidden')){
          btnAdvToggle.classList.add('text-[#2896FF]', 'ring-2', 'ring-[#2896FF]/50');
        } else {
          btnAdvToggle.classList.remove('text-[#2896FF]', 'ring-2', 'ring-[#2896FF]/50');
        }
      });
  }

  const btnApplyFilter = document.getElementById('btn-apply-filter');
  if(btnApplyFilter) {
      btnApplyFilter.addEventListener('click', () => {
        window.advFilters = {
          minAmount: parseInt(document.getElementById('filter-min-amount').value.replace(/\./g, '')) || 0,
          maxAmount: parseInt(document.getElementById('filter-max-amount').value.replace(/\./g, '')) || 0,
          startDate: document.getElementById('filter-start-date').value,
          endDate: document.getElementById('filter-end-date').value
        };
        advPanel.classList.add('hidden');
        btnAdvToggle.classList.remove('text-[#2896FF]', 'ring-2', 'ring-[#2896FF]/50');
        window.currentHistoryPage = 1;
        renderExpenseList(false);
      });
  }

  const btnResetFilter = document.getElementById('btn-reset-filter');
  if(btnResetFilter) {
      btnResetFilter.addEventListener('click', () => {
        document.getElementById('filter-min-amount').value = '';
        document.getElementById('filter-max-amount').value = '';
        document.getElementById('filter-start-date').value = '';
        document.getElementById('filter-end-date').value = '';
        
        window.advFilters = { minAmount: 0, maxAmount: 0, startDate: '', endDate: '' };
        advPanel.classList.add('hidden');
        btnAdvToggle.classList.remove('text-[#2896FF]', 'ring-2', 'ring-[#2896FF]/50');
        window.currentHistoryPage = 1;
        renderExpenseList(false);
      });
  }


  const chartScrollContainer = document.getElementById('charts-scroll-container');
  const btnChartPrev = document.getElementById('btn-chart-prev');
  const btnChartNext = document.getElementById('btn-chart-next');

  window.updateChartNavButtons = () => {
    if (!chartScrollContainer || !btnChartPrev || !btnChartNext) return;
    if (chartScrollContainer.scrollWidth === 0) return;

    if (chartScrollContainer.scrollLeft <= 5) {
      btnChartPrev.disabled = true;
    } else {
      btnChartPrev.disabled = false;
    }

    if (Math.ceil(chartScrollContainer.scrollLeft + chartScrollContainer.clientWidth) >= chartScrollContainer.scrollWidth - 20) {
      btnChartNext.disabled = true;
    } else {
      btnChartNext.disabled = false;
    }
  };

  if (chartScrollContainer && btnChartPrev && btnChartNext) {
    chartScrollContainer.addEventListener('scroll', window.updateChartNavButtons);

    btnChartPrev.addEventListener('click', () => {
      const scrollDistance = chartScrollContainer.firstElementChild.offsetWidth + 16;
      chartScrollContainer.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
    });

    btnChartNext.addEventListener('click', () => {
      const scrollDistance = chartScrollContainer.firstElementChild.offsetWidth + 16;
      chartScrollContainer.scrollBy({ left: scrollDistance, behavior: 'smooth' });
    });
  }

// --- LOGIN / REGISTER LOGIC ---
  let isLoginMode = true;
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authErrorBox = document.getElementById('auth-error-box');
  const authErrorText = document.getElementById('auth-error-text');
  
  //[BARU] Variabel untuk kotak sukses
  const authSuccessBox = document.getElementById('auth-success-box');
  const authSuccessText = document.getElementById('auth-success-text');
  
  const authNameContainer = document.getElementById('auth-name-container');
  const authNameInput = document.getElementById('auth-name');
  const btnModeLogin = document.getElementById('btn-mode-login');
  const btnModeRegister = document.getElementById('btn-mode-register');
  const authSliderBg = document.getElementById('auth-slider-bg');

  const showError = (message) => {
    authErrorText.innerText = message;
    authErrorBox.classList.remove('hidden');
    if (authSuccessBox) authSuccessBox.classList.add('hidden'); // Sembunyikan sukses jika ada error
  };

  //[BARU] Fungsi memunculkan notif sukses
  const showSuccess = (message) => {
    authSuccessText.innerText = message;
    authSuccessBox.classList.remove('hidden');
    authErrorBox.classList.add('hidden'); // Sembunyikan error jika ada sukses
  };
  
  btnModeLogin.addEventListener('click', (e) => {
    e.preventDefault();
    if (isLoginMode) return; 
    isLoginMode = true;
    authErrorBox.classList.add('hidden');
    if (authSuccessBox) authSuccessBox.classList.add('hidden');
    
    // [BARU] Kosongkan semua input form saat pindah ke mode Masuk
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    authNameInput.value = '';
    
    authSliderBg.classList.remove('translate-x-full');
    btnModeLogin.classList.replace('text-gray-400', 'text-slate-900');
    btnModeRegister.classList.replace('text-slate-900', 'text-gray-400');
    
    authSubmitBtn.innerHTML = '<span>Masuk</span>';
    authNameContainer.classList.remove('flex');
    authNameContainer.classList.add('hidden');
    authNameInput.removeAttribute('required');
  });

  btnModeRegister.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isLoginMode) return; 
    isLoginMode = false;
    authErrorBox.classList.add('hidden');
    if (authSuccessBox) authSuccessBox.classList.add('hidden');
    
    // [BARU] Kosongkan semua input form saat pindah ke mode Daftar
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    authNameInput.value = '';
    
    authSliderBg.classList.add('translate-x-full');
    btnModeRegister.classList.replace('text-gray-400', 'text-slate-900');
    btnModeLogin.classList.replace('text-slate-900', 'text-gray-400');
    
    authSubmitBtn.innerHTML = '<span>Daftar Sekarang</span>';
    authNameContainer.classList.remove('hidden');
    authNameContainer.classList.add('flex');
    authNameInput.setAttribute('required', 'true');
  });

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

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    authErrorBox.classList.add('hidden'); 
    if (authSuccessBox) authSuccessBox.classList.add('hidden'); 
    
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
      
      if (error) {
        showError(error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : error.message);
      } else {
        window.location.hash = '#/';
      }
      
    } else {
      // [UBAH] Ambil "data" dari respon Supabase untuk dicek
      const { data, error } = await supabase.auth.signUp({ 
        email, password, options: { data: { full_name: fullName, avatar_url: '1' } }
      });
      
      if (error) {
        showError(error.message === 'User already registered' ? 'Email ini sudah terdaftar.' : error.message);
      } 
      // [BARU] Deteksi jika Supabase mengembalikan identities kosong (Artinya email sudah ada)
      else if (data && data.user && data.user.identities && data.user.identities.length === 0) {
        showError('Email ini sudah terdaftar.');
      } 
      else {
        btnModeLogin.click(); 
        document.getElementById('auth-password').value = ''; 
        showSuccess("Berhasil mendaftar! Silakan konfirmasi email untuk login.");
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
    
    await updateAnalytics(true);
    await renderExpenseList(false);
  });

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
      applyFilterUI(filterBubblesHome, window.currentHomeCategoryFilter); 
      window.currentHistoryPage = 1; 
      renderExpenseList(false);
  }));

  window.currentChartView = 'monthly';
  document.getElementById('btn-view-month').addEventListener('click', () => { window.currentChartView = 'monthly'; document.getElementById('slider-bg').classList.remove('translate-x-full'); document.getElementById('btn-view-month').classList.replace('text-gray-400', 'text-white'); document.getElementById('btn-view-day').classList.replace('text-white', 'text-gray-400'); updateAnalytics(false); });
  document.getElementById('btn-view-day').addEventListener('click', () => { window.currentChartView = 'daily'; document.getElementById('slider-bg').classList.add('translate-x-full'); document.getElementById('btn-view-day').classList.replace('text-gray-400', 'text-white'); document.getElementById('btn-view-month').classList.replace('text-white', 'text-gray-400'); updateAnalytics(false); });

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
});