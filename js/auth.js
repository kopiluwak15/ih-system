/**
 * Supabase Authentication Module
 * CEO Dashboard Auth Management
 */

// Supabase Configuration
const SUPABASE_URL = 'https://jbgqwdyvqpajbavbxems.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiZ3F3ZHl2cXBhamJhdmJ4ZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjYyMTQsImV4cCI6MjA5NDI0MjIxNH0.-lqYwJSj4jMDcQAZCzNMu3Nbk_AOhTvKVRzL3Sisuyg';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.initSupabaseAuth();
  }

  initSupabaseAuth() {
    // Check if user is already logged in
    const savedAuth = localStorage.getItem('authUser');
    if (savedAuth) {
      try {
        this.currentUser = JSON.parse(savedAuth);
        this.showDashboard();
      } catch (e) {
        this.showLogin();
      }
    } else {
      this.showLogin();
    }
  }

  showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  }

  showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
  }

  async handleLogin(email, password) {
    const loginError = document.getElementById('loginError');
    loginError.style.display = 'none';

    try {
      // Validate credentials against staff database
      const staffList = JSON.parse(localStorage.getItem('staff')) || [];
      const staff = staffList.find(s => s.email === email);

      if (!staff) {
        loginError.textContent = 'メールアドレスが見つかりません。管理者に確認してください。';
        loginError.style.display = 'block';
        return false;
      }

      // Check password (in production, this should be done server-side)
      if (staff.tempPassword !== password && staff.password !== password) {
        loginError.textContent = 'パスワードが正しくありません。';
        loginError.style.display = 'block';
        return false;
      }

      // Check if password needs to be changed
      if (staff.tempPassword === password) {
        // First login - require password change
        this.showPasswordChangeDialog(staff);
        return false;
      }

      // Login successful
      this.currentUser = {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        store: staff.store,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('authUser', JSON.stringify(this.currentUser));
      localStorage.setItem('currentOrgId', staff.organization_id || 'default');

      this.showDashboard();

      // Initialize dashboard
      if (window.ceoDashboard) {
        window.ceoDashboard.onPageChanged('dashboard');
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      loginError.textContent = 'ログイン処理でエラーが発生しました。';
      loginError.style.display = 'block';
      return false;
    }
  }

  showPasswordChangeDialog(staff) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    dialog.innerHTML = `
      <div style="background: white; padding: 32px; border-radius: 8px; max-width: 400px; width: 90%;">
        <h2 style="margin: 0 0 16px 0; color: #333;">パスワード変更</h2>
        <p style="margin: 0 0 24px 0; color: #666; font-size: 14px;">初回ログインのため、パスワードを変更してください。</p>

        <form id="passwordChangeForm" style="display: grid; gap: 16px;">
          <div>
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">新しいパスワード</label>
            <input type="password" id="newPassword" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; width: 100%; box-sizing: border-box;" required>
          </div>

          <div>
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">パスワード確認</label>
            <input type="password" id="confirmPassword" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; width: 100%; box-sizing: border-box;" required>
          </div>

          <button type="submit" style="padding: 10px; background: #667eea; color: white; border: none; border-radius: 4px; font-weight: 500; cursor: pointer;">パスワード変更</button>
        </form>
      </div>
    `;

    document.body.appendChild(dialog);

    document.getElementById('passwordChangeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const newPass = document.getElementById('newPassword').value;
      const confirmPass = document.getElementById('confirmPassword').value;

      if (newPass !== confirmPass) {
        alert('パスワードが一致しません。');
        return;
      }

      if (newPass.length < 8) {
        alert('パスワードは8文字以上にしてください。');
        return;
      }

      // Update staff password
      const staffList = JSON.parse(localStorage.getItem('staff')) || [];
      const staffIndex = staffList.findIndex(s => s.id === staff.id);
      if (staffIndex !== -1) {
        staffList[staffIndex].password = newPass;
        staffList[staffIndex].tempPassword = null;
        localStorage.setItem('staff', JSON.stringify(staffList));
      }

      dialog.remove();

      // Now proceed with login
      this.currentUser = {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        store: staff.store,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('authUser', JSON.stringify(this.currentUser));
      this.showDashboard();

      if (window.ceoDashboard) {
        window.ceoDashboard.onPageChanged('dashboard');
      }
    });
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('authUser');
    this.showLogin();
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();

  // Setup login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      await window.authManager.handleLogin(email, password);
    });
  }
});
