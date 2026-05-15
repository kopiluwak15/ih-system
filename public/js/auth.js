/**
 * Authentication Module
 * IH-SYSTEM v2
 */

class Auth {
  constructor() {
    this.currentUser = null;
  }

  async init() {
    const saved = localStorage.getItem('ih_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        await this.showApp();
        return;
      } catch (e) {
        localStorage.removeItem('ih_user');
      }
    }
    this.showLogin();
  }

  showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }

  async showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'grid';
    this.renderUserInfo();
    this.applyRolePermissions();
    if (window.App) {
      await window.App.init();
    }
  }

  renderUserInfo() {
    const u = this.currentUser;
    document.getElementById('userName').textContent = u.name;
    document.getElementById('userRole').textContent = this.roleLabel(u.role);
    document.getElementById('userAvatar').textContent = u.name.charAt(0);
  }

  roleLabel(role) {
    return { ceo: 'CEO', manager: 'マネージャー', staff: 'スタッフ' }[role] || role;
  }

  applyRolePermissions() {
    const isCEO = this.currentUser.role === 'ceo';
    document.querySelectorAll('[data-ceo-only]').forEach(el => {
      el.style.display = isCEO ? '' : 'none';
    });
    document.querySelectorAll('[data-non-ceo]').forEach(el => {
      el.style.display = isCEO ? 'none' : '';
    });

    // 役割によってメニュー・タイトルを変更
    const logsNavLabel = document.querySelector('[data-page="logs"] span:not(.icon):not(.badge)');
    if (logsNavLabel) logsNavLabel.textContent = isCEO ? '日報履歴' : '日報作成';

    const logsTitle = document.querySelector('#logs .page-title');
    if (logsTitle) logsTitle.textContent = isCEO ? '📝 日報履歴' : '📝 日報作成';

    const logsSubtitle = document.querySelector('#logs .page-subtitle');
    if (logsSubtitle) logsSubtitle.textContent = isCEO
      ? '提出された日報を閲覧（読み取り専用）'
      : '本日の業務報告を作成・提出（プロジェクト進捗・課題・タスク・ルーティン）';
  }

  async login(email, password) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    try {
      const staff = await db.getStaffByEmail(email);
      if (!staff) {
        errorEl.textContent = 'メールアドレスが見つかりません';
        return;
      }
      if (staff.password_hash !== password) {
        errorEl.textContent = 'パスワードが正しくありません';
        return;
      }
      if (!staff.is_active) {
        errorEl.textContent = 'このアカウントは無効化されています';
        return;
      }

      if (staff.is_first_login) {
        await this.handleFirstLogin(staff);
        return;
      }

      this.currentUser = {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role
      };
      localStorage.setItem('ih_user', JSON.stringify(this.currentUser));
      await this.showApp();
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'ログインエラー: ' + err.message;
    }
  }

  async handleFirstLogin(staff) {
    const newPass = prompt('初回ログインです。新しいパスワードを設定してください（8文字以上）:');
    if (!newPass) return;
    if (newPass.length < 8) {
      alert('パスワードは8文字以上にしてください');
      return;
    }
    const confirm = prompt('もう一度入力してください:');
    if (newPass !== confirm) {
      alert('パスワードが一致しません');
      return;
    }
    await db.updateStaff(staff.id, {
      password_hash: newPass,
      is_first_login: false
    });
    alert('パスワードを変更しました。再度ログインしてください。');
    document.getElementById('loginPassword').value = '';
  }

  logout() {
    localStorage.removeItem('ih_user');
    this.currentUser = null;
    location.reload();
  }

  isCEO() {
    return this.currentUser?.role === 'ceo';
  }
}

const auth = new Auth();

document.addEventListener('DOMContentLoaded', () => {
  // Login form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    await auth.login(email, password);
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('ログアウトしますか？')) auth.logout();
  });

  // Init
  auth.init();
});
