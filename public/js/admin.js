// Admin Page
const AdminPage = {
  currentTab: 'stats',

  async render(container) {
    if (!App.isAdmin()) {
      container.innerHTML = '<div class="container" style="text-align:center;padding:4rem"><h2>⛔ Akses Ditolak</h2><p style="color:var(--text-muted)">Halaman ini hanya untuk admin.</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="container fade-in">
        <div style="margin-bottom:2rem">
          <h1 class="section-title">⚙️ Admin Panel</h1>
          <p class="section-subtitle">Kelola soal, paket, dan data pengguna</p>
        </div>
        <div class="subtest-tabs" style="margin-bottom:1.5rem">
          <button class="subtest-tab ${this.currentTab === 'stats' ? 'active' : ''}" onclick="AdminPage.switchTab('stats')">📊 Statistik</button>
          <button class="subtest-tab ${this.currentTab === 'questions' ? 'active' : ''}" onclick="AdminPage.switchTab('questions')">📝 Soal</button>
          <button class="subtest-tab ${this.currentTab === 'users' ? 'active' : ''}" onclick="AdminPage.switchTab('users')">👤 Users</button>
          <button class="subtest-tab ${this.currentTab === 'payments' ? 'active' : ''}" onclick="AdminPage.switchTab('payments')">💳 Pembayaran</button>
        </div>
        <div id="admin-content"></div>
      </div>
    `;
    this.loadTab();
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.subtest-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    this.loadTab();
  },

  async loadTab() {
    const el = document.getElementById('admin-content');
    el.innerHTML = '<div style="text-align:center;padding:2rem"><span class="spinner"></span></div>';

    switch (this.currentTab) {
      case 'stats': await this.loadStats(el); break;
      case 'questions': await this.loadQuestions(el); break;
      case 'users': await this.loadUsers(el); break;
      case 'payments': await this.loadPayments(el); break;
    }
  },

  async loadStats(el) {
    const data = await App.api('/api/admin/stats');
    if (!data) return;
    el.innerHTML = `
      <div class="grid grid-4" style="margin-bottom:2rem">
        <div class="stat-card"><div class="stat-value">${data.total_users}</div><div class="stat-label">Total Users</div></div>
        <div class="stat-card"><div class="stat-value">${data.total_questions}</div><div class="stat-label">Total Soal</div></div>
        <div class="stat-card"><div class="stat-value">${data.total_attempts}</div><div class="stat-label">Attempts Selesai</div></div>
        <div class="stat-card"><div class="stat-value">Rp ${Number(data.total_revenue).toLocaleString('id-ID')}</div><div class="stat-label">Total Revenue</div></div>
      </div>
      <div class="card">
        <h2 style="margin-bottom:1rem">👤 User Terbaru</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nama</th><th>Email</th><th>Kredit</th><th>Daftar</th></tr></thead>
            <tbody>
              ${(data.recent_users || []).map(u => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.credit_balance}</td><td>${formatDate(u.created_at)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  questionsPage: 1,
  questionsFilter: {},

  async loadQuestions(el) {
    const params = new URLSearchParams({ page: this.questionsPage, limit: 10, ...this.questionsFilter });
    const data = await App.api(`/api/admin/questions?${params}`);
    if (!data) return;

    const subtests = ['Penalaran Umum', 'Pengetahuan & Pemahaman Umum', 'Pemahaman Bacaan & Menulis',
      'Pengetahuan Kuantitatif', 'Literasi Bahasa Indonesia', 'Literasi Bahasa Inggris', 'Penalaran Matematika'];

    el.innerHTML = `
      <div class="card" style="margin-bottom:1.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <h2>📝 Soal (${data.total} total)</h2>
          <button class="btn btn-primary btn-sm" onclick="AdminPage.showAddQuestion()">+ Tambah Soal</button>
        </div>
        <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">
          <select class="form-input" style="width:auto;padding:0.375rem 0.75rem;font-size:0.8125rem" onchange="AdminPage.questionsFilter.subtest=this.value;AdminPage.questionsPage=1;AdminPage.loadTab()">
            <option value="">Semua Subtes</option>
            ${subtests.map(s => `<option value="${s}" ${this.questionsFilter.subtest === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <select class="form-input" style="width:auto;padding:0.375rem 0.75rem;font-size:0.8125rem" onchange="AdminPage.questionsFilter.package_number=this.value;AdminPage.questionsPage=1;AdminPage.loadTab()">
            <option value="">Semua Paket</option>
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${this.questionsFilter.package_number == n ? 'selected' : ''}>Paket ${n}</option>`).join('')}
          </select>
          <select class="form-input" style="width:auto;padding:0.375rem 0.75rem;font-size:0.8125rem" onchange="AdminPage.questionsFilter.question_type=this.value;AdminPage.questionsPage=1;AdminPage.loadTab()">
            <option value="">Semua Tipe</option>
            <option value="quiz" ${this.questionsFilter.question_type === 'quiz' ? 'selected' : ''}>Quiz Only</option>
            <option value="tryout" ${this.questionsFilter.question_type === 'tryout' ? 'selected' : ''}>Tryout Only</option>
            <option value="both" ${this.questionsFilter.question_type === 'both' ? 'selected' : ''}>Keduanya (Both)</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th style="width:40px">ID</th><th>Soal</th><th>Subtes</th><th>Pkt</th><th>Jwb</th><th style="width:100px">Aksi</th></tr></thead>
            <tbody>
              ${data.questions.map(q => `<tr>
                <td>${q.id}</td>
                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.question_text}</td>
                <td style="font-size:0.75rem">${q.subtest}</td>
                <td>${q.package_number}</td>
                <td><span class="badge ${q.question_type === 'quiz' ? 'badge-info' : q.question_type === 'tryout' ? 'badge-warning' : 'badge-accent'}">${q.question_type}</span></td>
                <td><span class="badge badge-success">${q.correct_answer}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="AdminPage.editQuestion(${q.id})" style="padding:0.25rem 0.5rem;font-size:0.75rem">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="AdminPage.deleteQuestion(${q.id})" style="padding:0.25rem 0.5rem;font-size:0.75rem">Hapus</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="display:flex;justify-content:center;gap:0.5rem;margin-top:1rem">
          <button class="btn btn-outline btn-sm" ${this.questionsPage <= 1 ? 'disabled' : ''} onclick="AdminPage.questionsPage--;AdminPage.loadTab()">←</button>
          <span style="padding:0.375rem 0.75rem;font-size:0.875rem">Hal ${data.page} / ${Math.ceil(data.total / data.limit)}</span>
          <button class="btn btn-outline btn-sm" ${this.questionsPage >= Math.ceil(data.total / data.limit) ? 'disabled' : ''} onclick="AdminPage.questionsPage++;AdminPage.loadTab()">→</button>
        </div>
      </div>
    `;
  },

  showAddQuestion() {
    const subtests = ['Penalaran Umum', 'Pengetahuan & Pemahaman Umum', 'Pemahaman Bacaan & Menulis',
      'Pengetahuan Kuantitatif', 'Literasi Bahasa Indonesia', 'Literasi Bahasa Inggris', 'Penalaran Matematika'];

    Modal.show(`
      <h3>Tambah Soal Baru</h3>
      <form id="add-question-form" style="max-height:60vh;overflow-y:auto">
        <div class="form-group"><label class="form-label">Subtes</label>
          <select class="form-input" id="aq-subtest" required>${subtests.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Paket</label>
          <select class="form-input" id="aq-package" required>${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}">Paket ${n}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Pertanyaan</label><textarea class="form-input" id="aq-text" required></textarea></div>
        <div class="form-group"><label class="form-label">Opsi A</label><input class="form-input" id="aq-a" required></div>
        <div class="form-group"><label class="form-label">Opsi B</label><input class="form-input" id="aq-b" required></div>
        <div class="form-group"><label class="form-label">Opsi C</label><input class="form-input" id="aq-c" required></div>
        <div class="form-group"><label class="form-label">Opsi D</label><input class="form-input" id="aq-d" required></div>
        <div class="form-group"><label class="form-label">Opsi E</label><input class="form-input" id="aq-e" required></div>
        <div class="form-group"><label class="form-label">Jawaban</label>
          <select class="form-input" id="aq-answer" required>${['A','B','C','D','E'].map(a => `<option value="${a}">${a}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Kategori</label><input class="form-input" id="aq-category" placeholder="Opsional"></div>
        <div class="form-group"><label class="form-label">Tipe Soal</label>
          <select class="form-input" id="aq-type">
            <option value="quiz">Quiz Only</option>
            <option value="tryout">Tryout Only</option>
            <option value="both" selected>Keduanya (Both)</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Kesulitan</label>
          <select class="form-input" id="aq-difficulty"><option value="easy">Mudah</option><option value="medium" selected>Sedang</option><option value="hard">Sulit</option></select>
        </div>
        <div class="form-group"><label class="form-label">URL Gambar (Attachment)</label><input class="form-input" id="aq-image" placeholder="https://example.com/image.png"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="Modal.hide()">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div>
      </form>
    `);

    document.getElementById('add-question-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = await App.api('/api/admin/questions', {
        method: 'POST',
        body: JSON.stringify({
          subtest: document.getElementById('aq-subtest').value,
          package_number: parseInt(document.getElementById('aq-package').value),
          question_text: document.getElementById('aq-text').value,
          option_a: document.getElementById('aq-a').value,
          option_b: document.getElementById('aq-b').value,
          option_c: document.getElementById('aq-c').value,
          option_d: document.getElementById('aq-d').value,
          option_e: document.getElementById('aq-e').value,
          correct_answer: document.getElementById('aq-answer').value,
          category: document.getElementById('aq-category').value || null,
          difficulty: document.getElementById('aq-difficulty').value,
          question_type: document.getElementById('aq-type').value,
          image_url: document.getElementById('aq-image').value || null
        })
      });
      if (data) {
        Modal.hide();
        Toast.success('Soal berhasil ditambahkan!');
        this.loadTab();
      }
    });
  },

  async editQuestion(id) {
    const params = new URLSearchParams({ page: 1, limit: 1000 });
    const data = await App.api(`/api/admin/questions?${params}`);
    if (!data) return;
    const q = data.questions.find(qq => qq.id === id);
    if (!q) return Toast.error('Soal tidak ditemukan');

    const subtests = ['Penalaran Umum', 'Pengetahuan & Pemahaman Umum', 'Pemahaman Bacaan & Menulis',
      'Pengetahuan Kuantitatif', 'Literasi Bahasa Indonesia', 'Literasi Bahasa Inggris', 'Penalaran Matematika'];

    Modal.show(`
      <h3>Edit Soal #${id}</h3>
      <form id="edit-question-form" style="max-height:60vh;overflow-y:auto">
        <div class="form-group"><label class="form-label">Subtes</label>
          <select class="form-input" id="eq-subtest">${subtests.map(s => `<option value="${s}" ${q.subtest === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Paket</label>
          <select class="form-input" id="eq-package">${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${q.package_number === n ? 'selected' : ''}>Paket ${n}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Pertanyaan</label><textarea class="form-input" id="eq-text">${q.question_text}</textarea></div>
        <div class="form-group"><label class="form-label">Opsi A</label><input class="form-input" id="eq-a" value="${q.option_a}"></div>
        <div class="form-group"><label class="form-label">Opsi B</label><input class="form-input" id="eq-b" value="${q.option_b}"></div>
        <div class="form-group"><label class="form-label">Opsi C</label><input class="form-input" id="eq-c" value="${q.option_c}"></div>
        <div class="form-group"><label class="form-label">Opsi D</label><input class="form-input" id="eq-d" value="${q.option_d}"></div>
        <div class="form-group"><label class="form-label">Opsi E</label><input class="form-input" id="eq-e" value="${q.option_e}"></div>
        <div class="form-group"><label class="form-label">Jawaban</label>
          <select class="form-input" id="eq-answer">${['A','B','C','D','E'].map(a => `<option value="${a}" ${q.correct_answer === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Kategori</label><input class="form-input" id="eq-category" value="${q.category || ''}"></div>
        <div class="form-group"><label class="form-label">Tipe Soal</label>
          <select class="form-input" id="eq-type">
            <option value="quiz" ${q.question_type==='quiz'?'selected':''}>Quiz Only</option>
            <option value="tryout" ${q.question_type==='tryout'?'selected':''}>Tryout Only</option>
            <option value="both" ${q.question_type==='both'?'selected':''}>Keduanya (Both)</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Kesulitan</label>
          <select class="form-input" id="eq-difficulty"><option value="easy" ${q.difficulty==='easy'?'selected':''}>Mudah</option><option value="medium" ${q.difficulty==='medium'?'selected':''}>Sedang</option><option value="hard" ${q.difficulty==='hard'?'selected':''}>Sulit</option></select>
        </div>
        <div class="form-group"><label class="form-label">URL Gambar (Attachment)</label><input class="form-input" id="eq-image" value="${q.image_url || ''}" placeholder="https://example.com/image.png"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="Modal.hide()">Batal</button>
          <button type="submit" class="btn btn-primary">Update</button>
        </div>
      </form>
    `);

    document.getElementById('edit-question-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const result = await App.api(`/api/admin/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          subtest: document.getElementById('eq-subtest').value,
          package_number: parseInt(document.getElementById('eq-package').value),
          question_text: document.getElementById('eq-text').value,
          option_a: document.getElementById('eq-a').value,
          option_b: document.getElementById('eq-b').value,
          option_c: document.getElementById('eq-c').value,
          option_d: document.getElementById('eq-d').value,
          option_e: document.getElementById('eq-e').value,
          correct_answer: document.getElementById('eq-answer').value,
          category: document.getElementById('eq-category').value || null,
          difficulty: document.getElementById('eq-difficulty').value,
          question_type: document.getElementById('eq-type').value,
          image_url: document.getElementById('eq-image').value || null
        })
      });
      if (result) {
        Modal.hide();
        Toast.success('Soal berhasil diupdate!');
        this.loadTab();
      }
    });
  },

  async deleteQuestion(id) {
    Modal.show(`
      <h3>Hapus Soal?</h3>
      <p style="color:var(--text-muted);margin-bottom:1rem">Soal #${id} akan dihapus permanen.</p>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="Modal.hide()">Batal</button>
        <button class="btn btn-danger" onclick="AdminPage.confirmDelete(${id})">Hapus</button>
      </div>
    `);
  },

  async confirmDelete(id) {
    Modal.hide();
    const data = await App.api(`/api/admin/questions/${id}`, { method: 'DELETE' });
    if (data) { Toast.success('Soal berhasil dihapus'); this.loadTab(); }
  },

  async loadUsers(el) {
    const data = await App.api('/api/admin/users');
    if (!data) return;
    el.innerHTML = `
      <div class="card">
        <h2 style="margin-bottom:1rem">👤 Daftar User (${data.users.length})</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Nama</th><th>Email</th><th>Role</th><th>Kredit</th><th>Attempts</th><th>Daftar</th></tr></thead>
            <tbody>
              ${data.users.map(u => `<tr>
                <td>${u.id}</td><td>${u.name}</td><td>${u.email}</td>
                <td><span class="badge ${u.role==='admin'?'badge-danger':'badge-info'}">${u.role}</span></td>
                <td>${u.credit_balance}</td><td>${u.total_attempts}</td><td>${formatDate(u.created_at)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async loadPayments(el) {
    const data = await App.api('/api/admin/payments');
    if (!data) return;
    el.innerHTML = `
      <div class="card">
        <h2 style="margin-bottom:1rem">💳 Riwayat Pembayaran</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>User</th><th>Jumlah</th><th>Kredit</th><th>Status</th></tr></thead>
            <tbody>
              ${data.payments.length > 0 ? data.payments.map(p => `<tr>
                <td>${formatDate(p.created_at)}</td><td>${p.name} (${p.email})</td>
                <td style="font-weight:600">Rp ${Number(p.amount).toLocaleString('id-ID')}</td>
                <td><span class="badge badge-success">+${p.credits_added}</span></td>
                <td><span class="badge ${p.status==='success'?'badge-success':'badge-warning'}">${p.status}</span></td>
              </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">Belum ada pembayaran</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
