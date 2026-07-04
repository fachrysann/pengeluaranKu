import './style.css'
import { createClient } from '@supabase/supabase-js'
import { 
  createIcons, Home, PlusCircle, Trash2, Calendar, Utensils, Car, Gamepad2, 
  Receipt, Package, Wallet, LogOut, Mail, Lock, Eye, EyeOff, AlertCircle, 
  ArrowLeft, User, ChevronDown, TrendingDown, TrendingUp, Minus, Bell, 
  Calculator, Check, ChevronLeft, ChevronRight, Search, Settings, Pencil, 
  Plus, X, CheckCircle, Trophy, SlidersHorizontal, CalendarCheck, Shield, 
  Settings2, HelpCircle 
} from 'lucide'

// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey)

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
    if (error) { console.error("Error fetching data:", error); return []; }
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
export const db = new ExpenseManager();

// ==========================================
// 3. UTILITIES & CONFIG
// ==========================================
export const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
};

export const getTodayDate = () => new Date().toISOString().split('T')[0];

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hari ini';
  if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const appleColors = { Makanan: '#FF6B6B', Transportasi: '#5AC8FA', Hiburan: '#D7BDE2', Tagihan: '#FFA07A', Lainnya: '#81C784' };
export const categoryIcons = { Makanan: 'utensils', Transportasi: 'car', Hiburan: 'gamepad-2', Tagihan: 'receipt', Lainnya: 'package' };

export const avatarsMap = {
  '1': 'https://api.dicebear.com/9.x/dylan/svg?seed=Felix&backgroundColor=transparent',
  '2': 'https://api.dicebear.com/9.x/dylan/svg?seed=Aneka&backgroundColor=transparent',
  '3': 'https://api.dicebear.com/9.x/dylan/svg?seed=Mimi&backgroundColor=transparent',
  '4': 'https://api.dicebear.com/9.x/dylan/svg?seed=Oreo&backgroundColor=transparent',
  '5': 'https://api.dicebear.com/9.x/dylan/svg?seed=Leo&backgroundColor=transparent'
};

// ==========================================
// 4. UI INITIALIZATION & COMMON ACTIONS
// ==========================================
export const initIcons = () => {
  createIcons({
    icons: {
      Home, PlusCircle, Trash2, Calendar, Utensils, Car, Gamepad2, Receipt, Package, Wallet, LogOut, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, User, ChevronDown, TrendingDown, TrendingUp, Minus, Bell, Calculator, Check, ChevronLeft, ChevronRight, Search, Settings, Pencil, Plus, X, CheckCircle, Trophy, SlidersHorizontal, CalendarCheck, Shield, Settings2, HelpCircle
    }
  });
};

export const updateGreetingUI = (user) => {
  const userName = user.user_metadata?.full_name || 'Pengguna';
  const avatarId = user.user_metadata?.avatar_url || '1';

  const greetingMobile = document.getElementById('greeting-text-mobile');
  const greetingDesktop = document.getElementById('greeting-text-desktop');
  
  if (greetingMobile) greetingMobile.innerText = `Halo, ${userName} 👋`;
  if (greetingDesktop) greetingDesktop.innerText = `Halo, ${userName} 👋`;

  const mobIcon = document.getElementById('mobile-avatar-icon');
  const mobImg = document.getElementById('mobile-avatar-img');
  const deskIcon = document.getElementById('desktop-avatar-icon');
  const deskImg = document.getElementById('desktop-avatar-img');

  if (avatarId && avatarsMap[avatarId]) {
    if (mobImg) { mobImg.src = avatarsMap[avatarId]; mobImg.classList.remove('hidden'); }
    if (mobIcon) mobIcon.classList.add('hidden');
    if (deskImg) { deskImg.src = avatarsMap[avatarId]; deskImg.classList.remove('hidden'); }
    if (deskIcon) deskIcon.classList.add('hidden');
  } else {
    if (mobImg) mobImg.classList.add('hidden');
    if (mobIcon) mobIcon.classList.remove('hidden');
    if (deskImg) deskImg.classList.add('hidden');
    if (deskIcon) deskIcon.classList.remove('hidden');
  }
};

export const highlightNavigation = () => {
  const pathname = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    const pathNormalized = pathname === '/' ? '/index.html' : pathname;
    const hrefNormalized = href === '/' ? '/index.html' : href;
    const isMatch = pathNormalized.endsWith(hrefNormalized);
    if (isMatch) {
      link.classList.add('text-[#2896FF]', 'bg-[#2896FF]/10'); 
      link.classList.remove('text-gray-500'); 
    } else { 
      link.classList.remove('text-[#2896FF]', 'bg-[#2896FF]/10'); 
      link.classList.add('text-gray-500'); 
    }
  });
};

export const showLoader = () => {
  let loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.remove('opacity-0', 'pointer-events-none');
  } else {
    loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-[#F5F5F7]/80 backdrop-blur-md transition-opacity duration-300';
    loader.innerHTML = `
      <div class="flex flex-col items-center gap-4">
        <div class="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[#2896FF] animate-spin"></div>
        <p class="text-xs font-semibold text-slate-400 tracking-widest animate-pulse">Memuat...</p>
      </div>
    `;
    document.body.appendChild(loader);
  }
};

export const hideLoader = () => {
  if (window.isRedirecting) return;
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      loader.remove();
    }, 300);
  }
};

// ==========================================
// 5. COMMON AUTH LOGIC
// ==========================================
export const setupAuth = (onLoginSuccess, onLogoutSuccess) => {
  const authContainer = document.getElementById('auth-container');
  const appWrapper = document.getElementById('app-wrapper'); 

  // Toggle mode Masuk / Daftar
  let isLoginMode = true;
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authErrorBox = document.getElementById('auth-error-box');
  const authErrorText = document.getElementById('auth-error-text');
  const authSuccessBox = document.getElementById('auth-success-box');
  const authSuccessText = document.getElementById('auth-success-text');
  
  const authNameContainer = document.getElementById('auth-name-container');
  const authNameInput = document.getElementById('auth-name');
  const btnModeLogin = document.getElementById('btn-mode-login');
  const btnModeRegister = document.getElementById('btn-mode-register');
  const authSliderBg = document.getElementById('auth-slider-bg');

  const showError = (message) => {
    if (authErrorText && authErrorBox) {
      authErrorText.innerText = message;
      authErrorBox.classList.remove('hidden');
    }
    if (authSuccessBox) authSuccessBox.classList.add('hidden');
  };

  const showSuccess = (message) => {
    if (authSuccessText && authSuccessBox) {
      authSuccessText.innerText = message;
      authSuccessBox.classList.remove('hidden');
    }
    if (authErrorBox) authErrorBox.classList.add('hidden');
  };

  if (btnModeLogin) {
    btnModeLogin.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLoginMode) return; 
      isLoginMode = true;
      if (authErrorBox) authErrorBox.classList.add('hidden');
      if (authSuccessBox) authSuccessBox.classList.add('hidden');
      
      document.getElementById('auth-email').value = '';
      document.getElementById('auth-password').value = '';
      if (authNameInput) authNameInput.value = '';
      
      if (authSliderBg) authSliderBg.classList.remove('translate-x-full');
      btnModeLogin.classList.replace('text-gray-400', 'text-slate-900');
      if (btnModeRegister) btnModeRegister.classList.replace('text-slate-900', 'text-gray-400');
      
      if (authSubmitBtn) authSubmitBtn.innerHTML = '<span>Masuk</span>';
      if (authNameContainer) {
        authNameContainer.classList.remove('flex');
        authNameContainer.classList.add('hidden');
      }
      if (authNameInput) authNameInput.removeAttribute('required');
    });
  }

  if (btnModeRegister) {
    btnModeRegister.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isLoginMode) return; 
      isLoginMode = false;
      if (authErrorBox) authErrorBox.classList.add('hidden');
      if (authSuccessBox) authSuccessBox.classList.add('hidden');
      
      document.getElementById('auth-email').value = '';
      document.getElementById('auth-password').value = '';
      if (authNameInput) authNameInput.value = '';
      
      if (authSliderBg) authSliderBg.classList.add('translate-x-full');
      btnModeRegister.classList.replace('text-gray-400', 'text-slate-900');
      if (btnModeLogin) btnModeLogin.classList.replace('text-slate-900', 'text-gray-400');
      
      if (authSubmitBtn) authSubmitBtn.innerHTML = '<span>Daftar Sekarang</span>';
      if (authNameContainer) {
        authNameContainer.classList.remove('hidden');
        authNameContainer.classList.add('flex');
      }
      if (authNameInput) authNameInput.setAttribute('required', 'true');
    });
  }

  const passwordInput = document.getElementById('auth-password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePasswordBtn.innerHTML = type === 'password' 
        ? '<i data-lucide="eye" class="w-5 h-5"></i>' 
        : '<i data-lucide="eye-off" class="w-5 h-5 text-[#2896FF]"></i>';
      createIcons({ icons: { Eye, EyeOff } });
    });
  }

  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (authErrorBox) authErrorBox.classList.add('hidden'); 
      if (authSuccessBox) authSuccessBox.classList.add('hidden'); 
      
      const email = document.getElementById('auth-email').value;
      const password = passwordInput.value;
      const fullName = authNameInput ? authNameInput.value : ''; 
      
      if (password.length < 6) {
        showError("Kata sandi minimal 6 karakter.");
        return;
      }

      if (authSubmitBtn) {
        authSubmitBtn.innerHTML = '<span class="animate-pulse">Mohon Tunggu...</span>';
        authSubmitBtn.disabled = true;
      }
      
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          showError(error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : error.message);
        } else {
          window.isRedirecting = true;
          showLoader();
          window.location.href = '/index.html';
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, password, options: { data: { full_name: fullName, avatar_url: '1' } }
        });
        
        if (error) {
          showError(error.message === 'User already registered' ? 'Email ini sudah terdaftar.' : error.message);
        } 
        else if (data && data.user && data.user.identities && data.user.identities.length === 0) {
          showError('Email ini sudah terdaftar.');
        } 
        else {
          if (btnModeLogin) btnModeLogin.click(); 
          if (passwordInput) passwordInput.value = ''; 
          showSuccess("Berhasil mendaftar! Silakan konfirmasi email untuk login.");
        }
      }
      
      if (authSubmitBtn) {
        authSubmitBtn.disabled = false;
        authSubmitBtn.innerHTML = isLoginMode ? '<span>Masuk</span>' : '<span>Daftar Sekarang</span>';
      }
    });
  }

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await supabase.auth.signOut();
    });
  }

  // Monitor auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    const preloadStyle = document.getElementById('auth-preload-style');
    if (preloadStyle) preloadStyle.remove();

    if (session) {
      if (authContainer) authContainer.classList.add('hidden');
      if (appWrapper) appWrapper.classList.remove('hidden');
      
      updateGreetingUI(session.user);
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(session.user);
      }
    } else {
      if (authContainer) authContainer.classList.remove('hidden');
      if (appWrapper) appWrapper.classList.add('hidden');
      
      hideLoader();
      
      if (typeof onLogoutSuccess === 'function') {
        onLogoutSuccess();
      }
    }
  });
};
