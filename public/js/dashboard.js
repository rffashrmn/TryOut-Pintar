// Dashboard Page
const DashboardPage = {
  async render(container) {
    const userName = App.user ? App.user.name : 'Pengguna';
    container.innerHTML = `
      <div class="container fade-in">
        <div style="margin-bottom:2rem">
          <h1>Halo, ${userName}! 👋</h1>
          <p style="color:var(--text-muted)">Siap berlatih hari ini?</p>
        </div>
        <div class="grid grid-4" style="margin-bottom:2rem">
          <div class="card skeleton skeleton-card" style="height:120px"></div>
          <div class="card skeleton skeleton-card" style="height:120px"></div>
          <div class="card skeleton skeleton-card" style="height:120px"></div>
          <div class="card skeleton skeleton-card" style="height:120px"></div>
        </div>
        <div class="grid grid-2" style="margin-bottom:2rem">
          <div class="card skeleton skeleton-card" style="height:300px"></div>
          <div class="card skeleton skeleton-card" style="height:300px"></div>
        </div>
      </div>
    `;

    await App.refreshUser();
    const data = await App.api('/api/dashboard');
    if (!data) return;

    const perf = data.performance || [];
    const chartBars = perf.map(p => {
      const color = p.accuracy >= 80 ? 'var(--success)' : p.accuracy >= 60 ? 'var(--accent)' : 'var(--danger)';
      const sName = (p.subtest || 'Lainnya');
      const shortName = sName.replace('Pengetahuan & Pemahaman Umum', 'PPU')
        .replace('Pemahaman Bacaan & Menulis', 'PBM')
        .replace('Penalaran Umum', 'PU')
        .replace('Pengetahuan Kuantitatif', 'PK')
        .replace('Literasi Bahasa Indonesia', 'LBI')
        .replace('Literasi Bahasa Inggris', 'LBE')
        .replace('Penalaran Matematika', 'PM') || sName;
      return `<div class="chart-bar-item">
        <div class="chart-bar-value" style="color:${color}">${p.accuracy || 0}%</div>
        <div class="chart-bar" style="height:${Math.max(p.accuracy || 0, 5)}%;background:${color}"></div>
        <div class="chart-bar-label" title="${sName}">${shortName}</div>
      </div>`;
    }).join('');

    const rankInfo = data.latest_rank
      ? `<div class="stat-card"><div class="stat-value">#${data.latest_rank.rank_position}</div><div class="stat-label">Ranking (Paket ${data.latest_rank.package_number})</div></div>`
      : `<div class="stat-card"><div class="stat-value">-</div><div class="stat-label">Ranking</div></div>`;

    container.innerHTML = `
      <div class="container fade-in">
        <div style="margin-bottom:2rem">
          <h1>Halo, ${data.user.name}! 👋</h1>
          <p style="color:var(--text-muted)">Siap berlatih hari ini?</p>
        </div>

        <div class="grid grid-4" style="margin-bottom:2rem">
          <div class="stat-card">
            <div class="stat-value">${App.user.credit_balance || 0}</div>
            <div class="stat-label">Kredit</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.stats.completed || 0}</div>
            <div class="stat-label">Selesai Dikerjakan</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.stats.avg_tryout_score || 0}</div>
            <div class="stat-label">Rata-rata Skor TryOut</div>
          </div>
          ${rankInfo}
        </div>

        <div class="grid grid-2" style="margin-bottom:2rem">
          <div class="card">
            <h2 style="margin-bottom:1rem">📊 Performa per Subtes</h2>
            ${perf.length > 0 ? `<div class="chart-bar-container">${chartBars}</div>` : '<p style="color:var(--text-muted);text-align:center;padding:2rem">Belum ada data performa. Mulai try out untuk melihat analisis.</p>'}
          </div>
          <div class="card">
            <h2 style="margin-bottom:1rem">🚀 Mulai Latihan</h2>
            <div style="display:flex;flex-direction:column;gap:0.75rem;padding:1rem 0">
              <a href="#quiz" class="btn btn-primary btn-lg" style="text-decoration:none">📝 Latihan Quiz</a>
              <a href="#tryout" class="btn btn-success btn-lg" style="text-decoration:none">🎯 Simulasi Try Out</a>
              <a href="#leaderboard" class="btn btn-outline btn-lg" style="text-decoration:none">🏆 Lihat Ranking</a>
              <a href="#payment" class="btn btn-warning btn-lg" style="text-decoration:none">💰 Beli Kredit</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
