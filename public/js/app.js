// TryOut Pintar - Main App Router & Utilities

const App = {
  token: localStorage.getItem('tp_token'),
  user: JSON.parse(localStorage.getItem('tp_user') || 'null'),

  // API Helper
  async api(url, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    try {
      const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
      const data = await res.json();
      if (res.status === 401 && !options.ignoreAuthError) { this.logout(); return null; }
      if (!res.ok) {
        if ((res.status === 400 || res.status === 401) && (data.errors || data.error)) return data;
        Toast.error(data.error || 'Terjadi kesalahan');
        return null;
      }
      return data;
    } catch (err) {
      console.error('API Error:', err);
      Toast.error('Koneksi gagal');
      return null;
    }
  },

  // Auth
  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('tp_token', token);
    localStorage.setItem('tp_user', JSON.stringify(user));
  },

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('tp_token');
    localStorage.removeItem('tp_user');
    this.navigate('login');
  },

  isLoggedIn() { return !!this.token; },
  isAdmin() { return this.user && this.user.role === 'admin'; },

  // Router
  navigate(page, params = {}) {
    const hash = params && Object.keys(params).length > 0
      ? `#${page}?${new URLSearchParams(params).toString()}`
      : `#${page}`;
    window.location.hash = hash;
  },

  getRoute() {
    const hash = window.location.hash.slice(1) || '';
    const [page, queryString] = hash.split('?');
    const params = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((v, k) => params[k] = v);
    }
    return { page: page || (this.isLoggedIn() ? 'dashboard' : 'login'), params };
  },

  // Render
  render() {
    const { page, params } = this.getRoute();
    const app = document.getElementById('app');

    // Auth pages (no navbar)
    if (!this.isLoggedIn() && page !== 'register') {
      AuthPage.renderLogin(app);
      return;
    }
    if (page === 'register') {
      AuthPage.renderRegister(app);
      return;
    }
    if (page === 'login') {
      AuthPage.renderLogin(app);
      return;
    }

    // Protected pages with navbar
    const isExam = page === 'exam';
    const mainContent = document.createElement('div');
    mainContent.className = 'main';
    if (isExam) mainContent.style.paddingTop = '0'; // Exam header handles its own padding

    switch (page) {
      case 'dashboard': DashboardPage.render(mainContent); break;
      case 'quiz': QuizPage.render(mainContent); break;
      case 'tryout': TryoutPage.render(mainContent); break;
      case 'tryout-details': TryoutDetailsPage.render(mainContent, params); break;
      case 'exam': ExamPage.render(mainContent, params); break;
      case 'results': ResultsPage.render(mainContent, params); break;
      case 'leaderboard': LeaderboardPage.render(mainContent); break;
      case 'payment': PaymentPage.render(mainContent, params); break;
      case 'admin': AdminPage.render(mainContent); break;
      default: DashboardPage.render(mainContent);
    }

    app.innerHTML = '';
    if (!isExam) app.appendChild(this.renderNavbar());
    app.appendChild(mainContent);
  },

  renderNavbar() {
    const nav = document.createElement('nav');
    nav.className = 'navbar';
    const isAdmin = this.isAdmin();
    nav.innerHTML = `
      <a href="#dashboard" class="navbar-brand"><img src="/tryout_pintar_banner1.png" alt="Logo" style="height:135px;width:auto"></a>
      <button class="menu-toggle" onclick="document.querySelector('.navbar-nav').classList.toggle('open')">☰</button>
      <div class="navbar-nav">
        <a href="#dashboard" class="${this.getRoute().page === 'dashboard' ? 'active' : ''}">Dashboard</a>
        <a href="#quiz" class="${this.getRoute().page === 'quiz' ? 'active' : ''}">Quiz</a>
        <a href="#tryout" class="${this.getRoute().page === 'tryout' ? 'active' : ''}">Try Out</a>
        <a href="#leaderboard" class="${this.getRoute().page === 'leaderboard' ? 'active' : ''}">Ranking</a>
        <a href="#payment" class="nav-credits">💰 Kredit</a>
        ${isAdmin ? '<a href="#admin" class="' + (this.getRoute().page === 'admin' ? 'active' : '') + '">⚙️ Admin</a>' : ''}
        <button onclick="App.logout()">Logout</button>
      </div>
    `;
    return nav;
  },

  // Refresh user data
  async refreshUser() {
    const data = await this.api('/api/auth/me');
    if (data) {
      this.user = { ...this.user, ...data.user };
      localStorage.setItem('tp_user', JSON.stringify(this.user));
    }
  },

  init() {
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }
};

// Toast notifications
const Toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); }
};

// Modal
const Modal = {
  show(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('active');
  },
  hide() {
    document.getElementById('modal-overlay').classList.remove('active');
  }
};

// Utility
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Init
document.addEventListener('DOMContentLoaded', () => App.init());
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) Modal.hide();
});
