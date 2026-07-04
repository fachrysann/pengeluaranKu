import { 
  db, formatRupiah, appleColors, initIcons, setupAuth, highlightNavigation, supabase, hideLoader
} from './common.js'
import Chart from 'chart.js/auto'
import { TrendingDown, TrendingUp, Minus } from 'lucide'

// Set chart defaults
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
Chart.defaults.color = '#9CA3AF';

let cachedExpenses = [];
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

  const categoryChartEl = document.getElementById('categoryChart');
  if (categoryChartEl) {
    const ctxCat = categoryChartEl.getContext('2d');
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
        labels: Object.keys(categoryData).length ? Object.keys(categoryData) : ['Belum ada data'],
        datasets: [{
          data: Object.values(categoryData).length ? Object.values(categoryData) : [1],
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
      plugins: [centerTextPlugin]
    });
  }

  const trendChartEl = document.getElementById('trendChart');
  if (trendChartEl) {
    const ctxTrend = trendChartEl.getContext('2d');
    if (trendChartInstance) trendChartInstance.destroy();
    
    const gradientBar = ctxTrend.createLinearGradient(0, 0, 0, 200);
    gradientBar.addColorStop(0, '#55E1FF'); gradientBar.addColorStop(1, '#2896FF');
    
    trendChartInstance = new Chart(ctxTrend, {
      type: 'bar',
      data: { labels: trendLabels, datasets: [{ data: trendData, backgroundColor: gradientBar, borderRadius: 4 }] },
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
  }
  
  const dailyChartEl = document.getElementById('dailyChart');
  if (dailyChartEl) {
    const ctxDaily = dailyChartEl.getContext('2d');
    if (dailyChartInstance) dailyChartInstance.destroy();
    
    const gradientLine = ctxDaily.createLinearGradient(0, 0, 800, 0);
    gradientLine.addColorStop(0, '#55E1FF'); gradientLine.addColorStop(1, '#2896FF');
    const gradientDailyBg = ctxDaily.createLinearGradient(0, 0, 0, 300);
    gradientDailyBg.addColorStop(0, 'rgba(85, 225, 255, 0.4)'); gradientDailyBg.addColorStop(1, 'rgba(40, 150, 255, 0.0)');
    
    dailyChartInstance = new Chart(ctxDaily, {
      type: 'line',
      data: { 
        labels: dailyLabels, 
        datasets: [{ 
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
  }
};

const updateAnalytics = async (forceFetch = false) => {
  try {
    if (forceFetch || cachedExpenses.length === 0) {
      cachedExpenses = await db.getExpenses();
    }
  const expenses = cachedExpenses;
  
  const filterInputVal = document.getElementById('filter-month').value;
  const [selYear, selMonth] = filterInputVal.split('-').map(Number);
  const catFilter = window.currentCategoryFilter || 'Semua';

  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
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
  
  // Reimport/recreate dynamic icons
  const { createIcons } = await import('lucide');
  createIcons({ icons: { TrendingDown, TrendingUp, Minus } });

  const categoryData = {};
  monthExpenses.forEach(exp => { categoryData[exp.category] = (categoryData[exp.category] || 0) + Number(exp.amount); });

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
  for (const [date, amount] of Object.entries(dailySums)) {
    if (amount > maxAmount) {
      maxAmount = amount;
      highestDate = date;
    }
  }

  let highestDayText = "-";
  if (highestDate) {
    const d = new Date(highestDate);
    highestDayText = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); 
  }

  const highestDayEl = document.getElementById('highest-day');
  if (highestDayEl) highestDayEl.innerText = highestDayText;

  const now = new Date();
  let endDate = (selYear === now.getFullYear() && selMonth === (now.getMonth() + 1)) ? new Date() : new Date(selYear, selMonth, 0); 
  const last7Days = Array.from({length: 7}, (_, i) => { const d = new Date(endDate); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse();

  const trendData = last7Days.map(date => expenses.filter(exp => exp.date === date && (catFilter === 'Semua' || exp.category === catFilter)).reduce((sum, exp) => sum + Number(exp.amount), 0));
  const trendLabels = last7Days.map(d => d.substring(5).replace('-', '/'));

  let dailyLabels = [], dailyData = [], chartTitle = '';
  if (window.currentChartView === 'monthly') {
    dailyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    dailyData = Array(12).fill(0);
    expenses.filter(exp => new Date(exp.date).getFullYear() === selYear && (catFilter === 'Semua' || exp.category === catFilter))
            .forEach(exp => dailyData[new Date(exp.date).getMonth()] += Number(exp.amount));
    chartTitle = `Tahun ${selYear}`;
  } else {
    const totalDaysInMonth = new Date(selYear, selMonth, 0).getDate();
    dailyLabels = Array.from({length: totalDaysInMonth}, (_, i) => i + 1);
    dailyData = Array(totalDaysInMonth).fill(0);
    monthExpenses.forEach(exp => dailyData[new Date(exp.date).getDate() - 1] += Number(exp.amount));
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    chartTitle = `${monthNames[selMonth-1]} ${selYear}`;
  }

  const chartTitleEl = document.getElementById('daily-chart-title');
  if (chartTitleEl) {
    chartTitleEl.innerText = chartTitle + (catFilter === 'Semua' ? '' : ` - ${catFilter}`);
  }
  
  const totalDaysInMonthHeatmap = new Date(selYear, selMonth, 0).getDate();
  const heatmapData = Array(totalDaysInMonthHeatmap).fill(0);
  monthExpenses.forEach(exp => heatmapData[new Date(exp.date).getDate() - 1] += Number(exp.amount));
  
  renderHeatmap(selYear, selMonth, heatmapData);
  renderCharts(categoryData, trendData, trendLabels, dailyData, dailyLabels, uniqueDays);
  
  if (window.updateChartNavButtons) {
    setTimeout(() => window.updateChartNavButtons(), 100);
  }
  } finally {
    hideLoader();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  highlightNavigation();

  // Setup Month Filter default value
  const monthInput = document.getElementById('filter-month');
  if (monthInput) {
    monthInput.value = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    monthInput.addEventListener('change', () => updateAnalytics(true));
  }

  // Set default view variable
  window.currentChartView = 'monthly';

  // Bulanan vs Harian Toggle
  const btnViewMonth = document.getElementById('btn-view-month');
  const btnViewDay = document.getElementById('btn-view-day');
  const sliderBg = document.getElementById('slider-bg');

  if (btnViewMonth && btnViewDay) {
    btnViewMonth.addEventListener('click', () => { 
      window.currentChartView = 'monthly'; 
      if (sliderBg) sliderBg.classList.remove('translate-x-full'); 
      btnViewMonth.classList.replace('text-gray-400', 'text-white'); 
      btnViewDay.classList.replace('text-white', 'text-gray-400'); 
      updateAnalytics(false); 
    });

    btnViewDay.addEventListener('click', () => { 
      window.currentChartView = 'daily'; 
      if (sliderBg) sliderBg.classList.add('translate-x-full'); 
      btnViewDay.classList.replace('text-gray-400', 'text-white'); 
      btnViewMonth.classList.replace('text-white', 'text-gray-400'); 
      updateAnalytics(false); 
    });
  }

  // Category Bubbles Filtering
  const applyFilterUI = (buttons, targetCategory) => {
    buttons.forEach(b => b.className = 'filter-bubble px-5 py-2 sm:py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-[0_2px_8px_rgb(0,0,0,0.04)] bg-white text-gray-500 hover:text-gray-900 ring-1 ring-inset ring-black/5');
    const activeBtn = Array.from(buttons).find(b => b.getAttribute('data-category') === targetCategory);
    if(activeBtn) activeBtn.className = 'filter-bubble px-5 py-2 sm:py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-[0_4px_12px_rgba(40,150,255,0.3)] bg-gradient-to-b from-[#55E1FF] to-[#2896FF] text-white';
  };

  const filterBubbles = document.querySelectorAll('.filter-bubble');
  filterBubbles.forEach(btn => btn.addEventListener('click', (e) => {
    window.currentCategoryFilter = e.currentTarget.getAttribute('data-category');
    applyFilterUI(filterBubbles, window.currentCategoryFilter); 
    updateAnalytics(false);
  }));

  // Chart Navigation Buttons (for scroll behavior)
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

  // Setup shared authentication behavior
  setupAuth(
    // onLoginSuccess
    (user) => {
      updateAnalytics(true);
    },
    // onLogoutSuccess
    () => {
      cachedExpenses = [];
    }
  );
});
