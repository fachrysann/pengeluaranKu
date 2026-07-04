import { 
  db, formatRupiah, formatDate, getTodayDate, appleColors, categoryIcons, 
  initIcons, setupAuth, highlightNavigation, supabase, hideLoader
} from './common.js'
import { 
  Trash2, Utensils, Car, Gamepad2, Receipt, Package, ChevronLeft, ChevronRight 
} from 'lucide'

let cachedExpenses = []; 
window.currentHistoryPage = 1;
const ITEMS_PER_PAGE = 7; 

const renderExpenseList = async (forceFetch = false) => {
  try {
    const listContainer = document.getElementById('expense-list');
    if (!listContainer) return;
  
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

  // LOGIKA FILTER LANJUTAN
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
    const isFilterActive = window.advFilters && (window.advFilters.minAmount > 0 || window.advFilters.maxAmount > 0 || window.advFilters.startDate || window.advFilters.endDate);
    
    if (searchQuery) {
      emptyMsg = `Pencarian "${searchQuery}" tidak ditemukan.`;
    } else if (isFilterActive) {
      emptyMsg = `Tidak ada pengeluaran yang sesuai dengan filter.`;
    }
    
    listContainer.innerHTML = `<p class="text-gray-400 text-center py-6 font-bold">${emptyMsg}</p>`;
    return;
  }

  const totalItems = expenses.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  if (window.currentHistoryPage > totalPages) window.currentHistoryPage = totalPages;
  if (window.currentHistoryPage < 1) window.currentHistoryPage = 1;

  const startIndex = (window.currentHistoryPage - 1) * ITEMS_PER_PAGE;
  const paginatedExpenses = expenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const groupedExpenses = [];
  let currentDateLabel = null;
  let currentGroup = null;

  paginatedExpenses.forEach(exp => {
    const label = formatDate(exp.date); 
    
    if (label !== currentDateLabel) {
      currentDateLabel = label;
      currentGroup = { label: label, items: [] };
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
  
  // Re-create icons dynamically
  const { createIcons } = await import('lucide');
  createIcons({ icons: { Trash2, Utensils, Car, Gamepad2, Receipt, Package, ChevronLeft, ChevronRight } });
  } finally {
    hideLoader();
  }
};

window.changeHistoryPage = (direction) => {
  window.currentHistoryPage += direction;
  renderExpenseList(false);
  document.getElementById('expense-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteItem = async (id) => {
  await db.deleteExpense(id);
  renderExpenseList(true);
};

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  highlightNavigation();

  // Set default values for form input
  const expDateEl = document.getElementById('exp-date');
  if (expDateEl) {
    expDateEl.value = getTodayDate();
  }

  // Format amount input as numeric with thousand separator
  const expAmountEl = document.getElementById('exp-amount');
  if (expAmountEl) {
    expAmountEl.addEventListener('input', function(e) {
      let value = this.value.replace(/[^0-9]/g, '');
      this.value = value ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
    });
  }

  // Submit expense form handler
  const expenseForm = document.getElementById('expense-form');
  if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-expense');
      if (submitBtn) submitBtn.innerText = "Menyimpan data...";
      
      await db.addExpense({
        name: document.getElementById('exp-name').value, 
        category: document.getElementById('exp-category').value,
        amount: document.getElementById('exp-amount').value.replace(/\./g, ''), 
        date: document.getElementById('exp-date').value
      });
      
      e.target.reset(); 
      if (expDateEl) expDateEl.value = getTodayDate();
      if (submitBtn) submitBtn.innerText = "Simpan Pengeluaran";
      
      await renderExpenseList(true);
    });
  }

  // Search filter
  const searchInputEl = document.getElementById('search-history');
  if (searchInputEl) {
    searchInputEl.addEventListener('input', () => {
      window.currentHistoryPage = 1; 
      renderExpenseList(false);      
    });
  }

  // Category bubble filters for home
  const applyFilterUI = (buttons, targetCategory) => {
    buttons.forEach(b => b.className = 'filter-bubble-home px-5 py-2 sm:py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-[0_2px_8px_rgb(0,0,0,0.04)] bg-white text-gray-500 hover:text-gray-900 ring-1 ring-inset ring-black/5');
    const activeBtn = Array.from(buttons).find(b => b.getAttribute('data-category') === targetCategory);
    if(activeBtn) activeBtn.className = 'filter-bubble-home px-5 py-2 sm:py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-[0_4px_12px_rgba(40,150,255,0.3)] bg-gradient-to-b from-[#55E1FF] to-[#2896FF] text-white';
  };

  const filterBubblesHome = document.querySelectorAll('.filter-bubble-home');
  filterBubblesHome.forEach(btn => btn.addEventListener('click', (e) => {
    window.currentHomeCategoryFilter = e.currentTarget.getAttribute('data-category');
    applyFilterUI(filterBubblesHome, window.currentHomeCategoryFilter); 
    window.currentHistoryPage = 1; 
    renderExpenseList(false);
  }));

  // ADVANCED FILTER LOGIC
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

  if(btnAdvToggle && advPanel) {
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
      if (advPanel) advPanel.classList.add('hidden');
      if (btnAdvToggle) btnAdvToggle.classList.remove('text-[#2896FF]', 'ring-2', 'ring-[#2896FF]/50');
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
      if (advPanel) advPanel.classList.add('hidden');
      if (btnAdvToggle) btnAdvToggle.classList.remove('text-[#2896FF]', 'ring-2', 'ring-[#2896FF]/50');
      window.currentHistoryPage = 1;
      renderExpenseList(false);
    });
  }

  // Setup Auth state listener
  setupAuth(
    // onLoginSuccess
    () => {
      renderExpenseList(true);
    },
    // onLogoutSuccess
    () => {
      cachedExpenses = [];
    }
  );
});
