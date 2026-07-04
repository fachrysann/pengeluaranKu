import { 
  db, avatarsMap, initIcons, setupAuth, highlightNavigation, supabase, updateGreetingUI
} from './common.js'

let cachedExpenses = [];
let selectedAvatar = '1';

const selectAvatar = (avatarId) => {
  selectedAvatar = avatarId;
  const avatarButtons = document.querySelectorAll('.avatar-btn');
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

const loadProfileData = async () => {
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

  // HITUNG STATISTIK AKTIVITAS USER
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

  // 2. Isi Mode Edit (Form Mode)
  document.getElementById('profile-name').value = currentFullName;
  selectAvatar(currentAvatar);
};

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  highlightNavigation();

  // Setup Avatar Selection Buttons
  const avatarButtons = document.querySelectorAll('.avatar-btn');
  avatarButtons.forEach(btn => {
    btn.addEventListener('click', () => selectAvatar(btn.getAttribute('data-avatar')));
  });

  // Toggle masuk Mode Edit
  const btnEditProfileMode = document.getElementById('btn-edit-profile-mode');
  if (btnEditProfileMode) {
    btnEditProfileMode.addEventListener('click', () => {
      document.getElementById('profile-view-mode').classList.add('hidden');
      document.getElementById('profile-form').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Toggle Batal Edit (Kembali ke Mode Lihat)
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', () => {
      document.getElementById('profile-form').classList.add('hidden');
      document.getElementById('profile-view-mode').classList.remove('hidden');
      loadProfileData(); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Submit Form Profile
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
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
        updateGreetingUI(data.user);
        loadProfileData(); 
        
        document.getElementById('profile-form').classList.add('hidden');
        document.getElementById('profile-view-mode').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Gagal memperbarui profil: ' + error.message);
      }
    });
  }

  // Setup Auth state listener
  setupAuth(
    // onLoginSuccess
    () => {
      loadProfileData();
    },
    // onLogoutSuccess
    () => {
      cachedExpenses = [];
    }
  );
});
