// Tryout Page
const TryoutPage = {
  async render(container) {
    container.innerHTML = `
      <div class="container fade-in">
        <div style="margin-bottom:2rem">
          <h1 class="section-title">🎯 Simulasi Try Out UTBK</h1>
          <p class="section-subtitle">Pilih paket try out untuk simulasi ujian sesungguhnya</p>
        </div>
        <div class="grid grid-3">
          <div class="card skeleton skeleton-card" style="height:220px"></div>
          <div class="card skeleton skeleton-card" style="height:220px"></div>
          <div class="card skeleton skeleton-card" style="height:220px"></div>
        </div>
      </div>
    `;

    const data = await App.api('/api/tryout/packages');
    if (!data) return;

    await App.refreshUser();

    container.innerHTML = `
      <div class="container fade-in">
        <div style="margin-bottom:2rem">
          <h1 class="section-title">🎯 Simulasi Try Out UTBK</h1>
          <p class="section-subtitle">Pilih paket try out untuk simulasi ujian sesungguhnya</p>
        </div>

        <div class="card" style="background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.2); margin-bottom:1.5rem; display:flex; align-items:center; gap:1.25rem; padding:1.25rem">
          <div style="font-size:2rem">🛠️</div>
          <div>
            <h4 style="color:var(--accent); margin-bottom:0.25rem; font-weight:700">Tahap Pengembangan</h4>
            <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.5">Kami sedang dalam proses menambahkan konten soal. Untuk saat ini, soal hanya tersedia pada <strong>Paket 1</strong>. Selamat belajar!</p>
          </div>
        </div>
        <div class="grid grid-3" id="tryout-packages">
          ${data.packages.map(pkg => `
            <div class="pkg-card ${pkg.purchased ? 'purchased' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem">
                <div>
                  <h3 style="font-weight:700;font-size:1.125rem">Try Out Paket ${pkg.package_number}</h3>
                  <p style="color:var(--text-muted);font-size:0.8125rem;margin-top:0.25rem">7 subtes · 160 soal · ~195 menit</p>
                </div>
                ${pkg.purchased ? '<span class="badge badge-success">✓ Dibeli</span>' : (pkg.price_credit === 0 ? '<span class="badge badge-accent">Gratis</span>' : `<span class="badge badge-info">${pkg.price_credit} kredit</span>`)}
              </div>
              ${pkg.in_progress && pkg.time_remaining_seconds !== null ? `
                <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:0.5rem;padding:0.5rem;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center">
                  <span style="font-size:0.75rem;font-weight:600;color:var(--accent)">⏳ Sisa Waktu Subtes</span>
                  <span class="timer-display" data-seconds="${pkg.time_remaining_seconds}" style="font-weight:800;color:white;font-variant-numeric:tabular-nums">${formatTime(pkg.time_remaining_seconds)}</span>
                </div>
              ` : ''}
              <div style="margin-bottom:1rem">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.375rem;font-size:0.75rem;color:var(--text-muted)">
                  <span>• PU: 30 soal</span><span>• PPU: 20 soal</span>
                  <span>• PBM: 20 soal</span><span>• PK: 20 soal</span>
                  <span>• LBI: 30 soal</span><span>• LBE: 20 soal</span>
                  <span>• PM: 20 soal</span>
                </div>
              </div>
              <button class="btn ${pkg.completed_attempt_id ? 'btn-success' : (pkg.in_progress ? 'btn-warning' : (pkg.purchased ? 'btn-success' : 'btn-primary'))} btn-sm" style="width:100%"
                onclick="${pkg.completed_attempt_id ? `App.navigate('results', { type: 'tryout', attempt: ${pkg.completed_attempt_id} })` : `TryoutPage.handleStart(${pkg.id}, ${pkg.purchased}, ${pkg.package_number}, ${pkg.price_credit}, ${pkg.in_progress})`}">
                ${pkg.completed_attempt_id ? '📊 Lihat Hasil' : (pkg.in_progress ? '▶ Lanjutkan' : (pkg.purchased ? '▶ Mulai Try Out' : (parseInt(pkg.price_credit) === 0 ? '🎁 Beli Gratis & Mulai' : '🔒 Beli & Mulai')))}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Start local list countdown
    if (this.listTimer) clearInterval(this.listTimer);
    this.listTimer = setInterval(() => {
      const displays = document.querySelectorAll('.timer-display');
      if (displays.length === 0) { clearInterval(this.listTimer); return; }
      displays.forEach(el => {
        let sec = parseInt(el.dataset.seconds);
        if (sec > 0) {
          sec--;
          el.dataset.seconds = sec;
          el.textContent = formatTime(sec);
          if (sec < 60) el.style.color = 'var(--danger)';
        } else {
          el.textContent = '00:00';
          el.style.color = 'var(--danger)';
        }
      });
    }, 1000);
  },

  handleStart(pkgId, purchased, pkgNum, price, inProgress) {
    if (purchased || inProgress) {
      this.startTryout(pkgId);
      return;
    }
    Modal.show(`
      <h3>Beli Paket Try Out?</h3>
      <div style="background:var(--bg-dark);border-radius:0.75rem;padding:1rem;margin-bottom:1rem">
        <p style="font-weight:600">Try Out Paket ${pkgNum}</p>
        <p style="color:var(--text-muted);font-size:0.875rem;margin-top:0.25rem">7 subtes · 160 soal · ~195 menit</p>
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
        <button class="btn btn-primary" ${(App.user.credit_balance || 0) < price ? 'disabled' : ''} onclick="TryoutPage.confirmPurchase(${pkgId})">Konfirmasi Beli</button>
      </div>
    `);
  },

  async confirmPurchase(pkgId) {
    Modal.hide();
    const data = await App.api(`/api/tryout/purchase/${pkgId}`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (data) {
      Toast.success('Paket berhasil dibeli!');
      await App.refreshUser();
      this.startTryout(pkgId);
    }
  },

  async startTryout(pkgId) {
    const data = await App.api(`/api/tryout/start/${pkgId}`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (data) {
      App.navigate('tryout-details', { attempt: data.attempt_id });
    }
  }
};
