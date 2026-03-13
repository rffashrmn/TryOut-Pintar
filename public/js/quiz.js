// Quiz Page
const QuizPage = {
  async render(container) {
    container.innerHTML = `<div class="container fade-in"><div style="text-align:center;padding:4rem 0"><span class="spinner"></span><p style="color:var(--text-muted);margin-top:1rem">Memuat paket quiz...</p></div></div>`;

    const data = await App.api('/api/quiz/packages');
    if (!data) return;

    await App.refreshUser();
    const subtests = Object.keys(data.packages);
    const activeSubtest = subtests[0] || '';

    container.innerHTML = `
      <div class="container fade-in">
        <div style="margin-bottom:2rem">
          <h1 class="section-title">📝 Latihan Quiz</h1>
          <p class="section-subtitle">Pilih subtes dan paket untuk mulai latihan</p>
        </div>
        <div class="subtest-tabs" id="quiz-tabs"></div>
        <div id="quiz-packages" class="grid grid-3"></div>
      </div>
    `;

    const tabsEl = document.getElementById('quiz-tabs');
    const pkgEl = document.getElementById('quiz-packages');

    const renderPackages = (subtest) => {
      const pkgs = data.packages[subtest] || [];
      pkgEl.innerHTML = pkgs.map(pkg => {
        const isCompleted = !!pkg.completed_attempt_id;
        
        let actionBtn = '';
        if (isCompleted) {
          actionBtn = `<button class="btn btn-outline btn-sm" style="width:100%" onclick="App.navigate('results', { type: 'quiz', attempt: ${pkg.completed_attempt_id} })">📊 Lihat Hasil</button>`;
        } else if (pkg.in_progress) {
          actionBtn = `<button class="btn btn-warning btn-sm" style="width:100%" onclick="QuizPage.startQuiz(${pkg.id})">▶ Lanjutkan</button>`;
        } else if (pkg.purchased) {
          actionBtn = `<button class="btn btn-success btn-sm" style="width:100%" onclick="QuizPage.startQuiz(${pkg.id})">▶ Mulai</button>`;
        } else {
          actionBtn = `<button class="btn btn-primary btn-sm" style="width:100%" onclick="QuizPage.handleStart(${pkg.id}, false, '${pkg.subtest.replace(/'/g, "\\'")}', ${pkg.package_number}, ${pkg.total_questions}, ${pkg.price_credit}, false)">
            ${parseInt(pkg.price_credit) === 0 ? '🎁 Beli Gratis & Mulai' : '🔒 Beli & Mulai'}
          </button>`;
        }

        return `
          <div class="pkg-card ${pkg.purchased || isCompleted ? 'purchased' : ''} ${isCompleted ? 'completed' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.75rem">
              <div>
                <h3 style="font-weight:700;font-size:1rem">Paket ${pkg.package_number}</h3>
                <p style="color:var(--text-muted);font-size:0.8125rem;margin-top:0.25rem">${pkg.total_questions} soal · ${pkg.time_minutes} menit</p>
              </div>
              ${isCompleted ? '<span class="badge badge-success">🔒 Selesai & Terkunci</span>' : 
                (pkg.purchased ? '<span class="badge badge-info">✓ Dibeli</span>' : 
                (pkg.price_credit === 0 ? '<span class="badge badge-accent">Gratis</span>' : `<span class="badge badge-info">${pkg.price_credit} kredit</span>`))}
            </div>
            ${actionBtn}
          </div>
        `;
      }).join('');
    };

    tabsEl.innerHTML = subtests.map(s => {
      const shortName = s.replace('Pengetahuan & Pemahaman Umum', 'PPU')
        .replace('Pemahaman Bacaan & Menulis', 'PBM').replace('Penalaran Umum', 'PU')
        .replace('Pengetahuan Kuantitatif', 'PK').replace('Literasi Bahasa Indonesia', 'LBI')
        .replace('Literasi Bahasa Inggris', 'LBE').replace('Penalaran Matematika', 'PM');
      return `<button class="subtest-tab ${s === activeSubtest ? 'active' : ''}" data-subtest="${s}">${shortName}</button>`;
    }).join('');

    tabsEl.querySelectorAll('.subtest-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabsEl.querySelectorAll('.subtest-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderPackages(tab.dataset.subtest);
      });
    });

    renderPackages(activeSubtest);
  },

  handleStart(pkgId, purchased, subtest, pkgNum, totalQ, price, inProgress) {
    if (purchased || inProgress) {
      this.startQuiz(pkgId);
      return;
    }
    Modal.show(`
      <h3>Beli Paket Quiz?</h3>
      <div style="background:var(--bg-dark);border-radius:0.75rem;padding:1rem;margin-bottom:1rem">
        <p style="font-weight:600">${subtest} - Paket ${pkgNum}</p>
        <p style="color:var(--text-muted);font-size:0.875rem;margin-top:0.25rem">${totalQ} soal</p>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <span style="color:var(--text-muted)">Harga</span>
        <span style="font-weight:700;color:var(--accent)">${price === 0 ? 'Gratis' : price + ' kredit'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text-muted)">Saldo Anda</span>
        <span style="font-weight:700">${App.user.credit_balance || 0} kredit</span>
      </div>
      ${(App.user.credit_balance || 0) < price ? '<p style="color:var(--danger);font-size:0.8125rem;margin-top:0.75rem">⚠ Kredit tidak cukup. <a href="#payment" style="color:var(--primary-light)" onclick="Modal.hide()">Beli kredit</a></p>' : ''}
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="Modal.hide()">Batal</button>
        <button class="btn btn-primary" ${(App.user.credit_balance || 0) < price ? 'disabled' : ''} onclick="QuizPage.confirmPurchase(${pkgId})">Konfirmasi Beli & Mulai</button>
      </div>
    `);
  },

  async confirmPurchase(pkgId) {
    Modal.hide();
    const data = await App.api(`/api/quiz/purchase/${pkgId}`, { method: 'POST' });
    if (data) {
      Toast.success('Paket berhasil dibeli!');
      await App.refreshUser();
      this.startQuiz(pkgId);
    }
  },

  async startQuiz(pkgId) {
    const data = await App.api(`/api/quiz/start/${pkgId}`, { 
      method: 'POST',
      body: JSON.stringify({})
    });
    if (data) {
      App.navigate('exam', { type: 'quiz', attempt: data.attempt_id });
    }
  }
};
