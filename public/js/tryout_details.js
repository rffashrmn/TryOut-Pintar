// Tryout Details Page (Subtest Selection)
const TryoutDetailsPage = {
  timer: null,
  attempt: null,
  subtests: [],
  progress: [],

  async render(container, params) {
    const attemptId = params.attempt;
    container.innerHTML = `<div class="container fade-in" style="text-align:center;padding:6rem 0"><span class="spinner"></span><p style="color:var(--text-muted);margin-top:1rem">Memuat daftar subtes...</p></div>`;

    const data = await App.api(`/api/tryout/attempt/${attemptId}`);
    if (!data) return;

    this.attempt = data.attempt;
    this.subtests = data.subtests;
    this.progress = data.progress;

    if (this.attempt.status === 'completed') {
      App.navigate('results', { type: 'tryout', attempt: attemptId });
      return;
    }

    this.renderDetails(container);
    this.startTimers();
  },

  renderDetails(container) {
    const activeSub = this.progress.find(p => p.status && p.status.toString().toLowerCase() === 'in_progress');
    
    container.innerHTML = `
      <div class="container fade-in">
        <div style="margin-bottom:2rem;display:flex;justify-content:space-between;align-items:start">
          <div style="display:flex;flex-direction:column;gap:0.75rem">
            <button class="btn btn-outline btn-sm" style="width:fit-content" onclick="App.navigate('tryout')">← Kembali</button>
            <div>
              <h1 class="section-title">📝 Daftar Subtes</h1>
              <p class="section-subtitle">Pilih subtes yang ingin dikerjakan. Urutan bebas.</p>
            </div>
          </div>
          <button class="btn btn-danger" onclick="TryoutDetailsPage.handleFinalSubmit()">Submit Final Try Out</button>
        </div>

        ${activeSub ? `
          <div class="card" style="margin-bottom:1.5rem;background:rgba(239,68,68,0.1);border:2px solid var(--danger);display:flex;align-items:center;gap:1rem;animation:pulse 2s infinite">
            <span style="font-size:2rem">⏳</span>
            <div>
              <p style="font-weight:800;font-size:1.125rem;color:var(--danger)">Subtes Sedang Berjalan: ${activeSub.subtest_name}</p>
              <p style="font-size:0.875rem;color:var(--text-main)">Anda harus menyelesaikan subtes ini terlebih dahulu sebelum dapat membuka subtes lainnya.</p>
              <button class="btn btn-warning btn-sm" style="margin-top:0.75rem" onclick="App.navigate('exam', { type: 'tryout', attempt: ${this.attempt.id}, subtest: '${activeSub.subtest_name}' })">Lanjutkan Sekarang →</button>
            </div>
          </div>
        ` : ''}

        <div class="card" style="margin-bottom:2rem;background:rgba(255,255,255,0.03)">
          <div style="display:flex;align-items:center;gap:1rem">
            <div style="font-size:3rem">🎯</div>
            <div>
              <h2 style="font-weight:700">Try Out Paket ${this.attempt.package_id}</h2>
              <p style="color:var(--text-muted)">Selesaikan semua subtes untuk mendapatkan skor UTBK dan analisis AI.</p>
            </div>
          </div>
        </div>

        <div class="grid grid-2">
          ${this.subtests.map(sub => {
            const p = this.progress.find(pg => pg.subtest_name === sub.subtest);
            const status = p ? p.status : 'pending';
            const elapsed = p ? (p.elapsed || 0) : 0;
            const remaining = p ? Math.max(0, p.time_remaining_seconds - (status === 'in_progress' ? elapsed : 0)) : (sub.time_minutes * 60);

            let statusBadge = '';
            let actionBtn = '';

            if (status === 'completed') {
              statusBadge = '<span class="badge badge-success">Selesai</span>';
              actionBtn = '<button class="btn btn-outline btn-sm" disabled>Sudah Selesai</button>';
            } else if (status === 'in_progress') {
              statusBadge = '<span class="badge badge-warning">Sedang Dikerjakan</span>';
              actionBtn = `<button class="btn btn-warning btn-sm" onclick="App.navigate('exam', { type: 'tryout', attempt: ${this.attempt.id}, subtest: '${sub.subtest}' })">▶ Lanjutkan</button>`;
            } else {
              statusBadge = '<span class="badge badge-info">Belum Mulai</span>';
              const isLocked = !!activeSub;
              actionBtn = `<button class="btn btn-primary btn-sm" ${isLocked ? 'disabled style="opacity:0.4"' : ''} onclick="TryoutDetailsPage.warnStart('${sub.subtest}')">
                ${isLocked ? '🔒 Terkunci' : 'Mulai Subtes'}
              </button>`;
            }

            return `
              <div class="card" style="display:flex;flex-direction:column;gap:1rem; ${status === 'pending' && activeSub ? 'opacity:0.7' : ''}">
                <div style="display:flex;justify-content:space-between;align-items:start">
                  <div>
                    <h3 style="font-weight:700;font-size:1rem">${sub.subtest}</h3>
                    <p style="color:var(--text-muted);font-size:0.8125rem">${sub.total_questions} soal · ${sub.time_minutes} menit</p>
                  </div>
                  ${statusBadge}
                </div>
                
                <div style="flex-grow:1;display:flex;align-items:center;gap:0.75rem">
                  <span style="font-size:0.75rem;color:var(--text-muted)">⏳ Estimasi Waktu:</span>
                  <span class="subtest-timer" data-subtest="${sub.subtest}" data-seconds="${remaining}" data-status="${status}" 
                        style="font-family:monospace;font-weight:700;font-size:1.125rem;color:${remaining < 60 && status !== 'pending' ? 'var(--danger)' : 'var(--text-main)'}">
                    ${formatTime(remaining)}
                  </span>
                </div>

                <div style="margin-top:0.5rem">
                  ${actionBtn}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  warnStart(subtestName) {
    Modal.show(`
      <h3>⚠️ Perhatian!</h3>
      <div style="padding:1rem 0;color:var(--text-muted);line-height:1.6">
        <p>Anda akan memulai subtes <strong>${subtestName}</strong>.</p>
        <p style="margin-top:0.5rem"><strong>Penting:</strong> Setelah Anda menekan "Mulai Sekarang", timer akan terus berjalan di server secara real-time meskipun Anda menutup browser atau keluar dari halaman ini.</p>
        <p style="color:var(--warning);margin-top:0.5rem">Pastikan koneksi internet stabil dan Anda siap mengerjakan!</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="Modal.hide()">Batal</button>
        <button class="btn btn-primary" onclick="Modal.hide();TryoutDetailsPage.startSubtest('${subtestName}')">Mulai Sekarang</button>
      </div>
    `);
  },


  async startSubtest(subtestName) {
    const res = await App.api('/api/tryout/subtest/start', {
      method: 'POST',
      body: JSON.stringify({ attempt_id: this.attempt.id, subtest: subtestName })
    });
    if (res) {
      App.navigate('exam', { type: 'tryout', attempt: this.attempt.id, subtest: subtestName });
    }
  },

  startTimers() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      const timers = document.querySelectorAll('.subtest-timer');
      if (timers.length === 0) { clearInterval(this.timer); return; }

      timers.forEach(el => {
        const status = el.dataset.status;
        if (status !== 'in_progress') return;

        let sec = parseInt(el.dataset.seconds);
        if (sec > 0) {
          sec--;
          el.dataset.seconds = sec;
          el.textContent = formatTime(sec);
          if (sec < 60) el.style.color = 'var(--danger)';
        } else {
          el.textContent = '00:00';
          el.style.color = 'var(--danger)';
          // Auto-submit logic could be here, but server handles it on fetch/answer too
        }
      });
    }, 1000);
  },

  handleFinalSubmit() {
    const answered = this.progress.filter(p => p.status === 'completed').length;
    const total = this.subtests.length;

    Modal.show(`
      <h3>Submit Final Try Out?</h3>
      <div style="padding:1rem 0;color:var(--text-muted);line-height:1.6">
        <p>Anda telah menyelesaikan <strong>${answered} dari ${total}</strong> subtes.</p>
        ${answered < total ? '<p style="color:var(--danger);margin-top:0.5rem">⚠️ Anda belum menyelesaikan semua subtes! Nilai subtes yang kosong akan dianggap nol.</p>' : '<p>Semua subtes telah selesai dikerjakan.</p>'}
        <p style="margin-top:0.5rem">Apakah Anda yakin ingin mengakhiri Try Out ini secara permanen?</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="Modal.hide()">Kembali</button>
        <button class="btn btn-danger" onclick="Modal.hide();TryoutDetailsPage.finalSubmit()">Ya, Submit Final</button>
      </div>
    `);
  },

  async finalSubmit() {
    const res = await App.api(`/api/tryout/submit/${this.attempt.id}`, { 
      method: 'POST',
      body: JSON.stringify({ total_time: 0 })
    });
    if (res) {
      Toast.success('Try out berhasil disubmit!');
      App.navigate('results', { type: 'tryout', attempt: this.attempt.id });
    }
  },

  cleanup() {
    if (this.timer) clearInterval(this.timer);
  }
};
