// Auth Pages
const AuthPage = {
  renderLogin(container) {
    container.innerHTML = `
      <div class="auth-container fade-in">
        <div class="auth-card">
          <div style="text-align:center;margin-bottom:2rem">
            <img src="/tryout_pintar_banner1.png" alt="TryOut Pintar" style="width:auto;max-width:100%;height:auto;margin-bottom:-3rem">
            <p>Masuk ke akun Anda</p>
          </div>
          <form id="login-form">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="login-email" placeholder="email@example.com" required>
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" class="form-input" id="login-password" placeholder="Minimal 6 karakter" required>
            </div>
            <div id="login-error" style="color:var(--danger);font-size:0.875rem;margin-bottom:1rem;text-align:center;min-height:1.25rem;font-weight:600"></div>
            <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:0.5rem">Masuk</button>
          </form>
          <p style="text-align:center;margin-top:1.5rem;color:var(--text-muted);font-size:0.875rem">
            Belum punya akun? <a href="#register" style="color:var(--primary-light);text-decoration:none;font-weight:600">Daftar</a>
          </p>
        </div>
      </div>
    `;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const loginErr = document.getElementById('login-error');
      loginErr.textContent = '';

      const btn = e.target.querySelector('button');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Memproses...';

      const data = await App.api('/api/auth/login', {
        method: 'POST',
        ignoreAuthError: true,
        body: JSON.stringify({
          email: document.getElementById('login-email').value,
          password: document.getElementById('login-password').value
        })
      });

      if (data) {
        if (data.error) {
          loginErr.textContent = data.error;
        } else if (data.errors) {
          loginErr.textContent = data.errors[0].msg;
        } else {
          App.setAuth(data.token, data.user);
          Toast.success('Login berhasil!');
          App.navigate('dashboard');
        }
      }
      btn.disabled = false;
      btn.textContent = 'Masuk';
    });
  },

  renderRegister(container) {
    container.innerHTML = `
      <div class="auth-container fade-in">
        <div class="auth-card">
          <div style="text-align:center;margin-bottom:2rem">
            <img src="/tryout_pintar_banner1.png" alt="TryOut Pintar" style="width:auto;max-width:100%;height:auto;margin-bottom:-3rem">
            <h1>Daftar Akun</h1>
            <p>Buat akun TryOut Pintar</p>
          </div>
          <form id="register-form">
            <div class="form-group">
              <label class="form-label">Nama Lengkap</label>
              <input type="text" class="form-input" id="reg-name" placeholder="Nama lengkap" required>
              <div class="field-error" id="err-name"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="reg-email" placeholder="email@example.com" required>
              <div class="field-error" id="err-email"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" class="form-input" id="reg-password" placeholder="Minimal 6 karakter" required minlength="6">
              <div class="field-error" id="err-password"></div>
            </div>
            <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:0.5rem">Daftar</button>
          </form>
          <p style="text-align:center;margin-top:1.5rem;color:var(--text-muted);font-size:0.875rem">
            Sudah punya akun? <a href="#login" style="color:var(--primary-light);text-decoration:none;font-weight:600">Masuk</a>
          </p>
        </div>
      </div>
    `;
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear errors
      document.querySelectorAll('.field-error').forEach(el => el.textContent = '');

      const btn = e.target.querySelector('button');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Memproses...';

      const res = await App.api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('reg-name').value,
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-password').value
        })
      });

      if (res) {
        if (res.errors) {
          res.errors.forEach(err => {
            const el = document.getElementById(`err-${err.path || err.param}`);
            if (el) el.textContent = err.msg;
          });
        } else {
          App.setAuth(res.token, res.user);
          Toast.success('Registrasi berhasil!');
          App.navigate('dashboard');
        }
      }
      btn.disabled = false;
      btn.textContent = 'Daftar';
    });
  }
};
