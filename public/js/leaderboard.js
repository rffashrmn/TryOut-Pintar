// Leaderboard Page
const LeaderboardPage = {
  async render(container) {
    container.innerHTML = `<div class="container fade-in"><div style="text-align:center;padding:4rem 0"><span class="spinner"></span><p style="color:var(--text-muted);margin-top:1rem">Memuat ranking...</p></div></div>`;

    const data = await App.api('/api/leaderboard/global');
    if (!data) return;

    const medals = ['🥇', '🥈', '🥉'];

    container.innerHTML = `
      <div class="container fade-in">
        <div style="margin-bottom:2rem">
          <h1 class="section-title">🏆 Leaderboard Try Out</h1>
          <p class="section-subtitle">Peringkat peserta berdasarkan skor try out tertinggi</p>
        </div>

        ${data.user_ranks && data.user_ranks.length > 0 ? `
          <div class="card" style="margin-bottom:2rem;border-color:rgba(245,158,11,0.3)">
            <h2 style="margin-bottom:1rem">📍 Ranking Anda</h2>
            <div class="grid grid-3" style="gap:0.75rem">
              ${data.user_ranks.map(r => `
                <div style="background:var(--bg-dark);border-radius:0.75rem;padding:1rem;text-align:center">
                  <div style="font-size:1.5rem;font-weight:800;color:var(--accent)">#${r.rank_position || '-'}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">Paket ${r.package_number}</div>
                  <div style="font-size:0.875rem;font-weight:600;margin-top:0.25rem">${Math.round(r.score)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="card">
          <h2 style="margin-bottom:1rem">🌍 Top 10 Global</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th style="width:60px">Rank</th><th>Nama</th><th>Paket</th><th>Skor</th><th>Waktu</th></tr></thead>
              <tbody>
                ${data.leaderboard.length > 0 ? data.leaderboard.slice(0, 10).map((entry, i) => `
                  <tr style="${entry.user_id === App.user.id ? 'background:rgba(99,102,241,0.08)' : ''}">
                    <td style="font-weight:800;font-size:1.125rem">${i < 3 ? medals[i] : `#${i + 1}`}</td>
                    <td style="font-weight:600">${entry.name}${entry.user_id === App.user.id ? ' <span class="badge badge-info">Anda</span>' : ''}</td>
                    <td>Paket ${entry.package_number}</td>
                    <td style="font-weight:700;color:var(--primary-light)">${Math.round(entry.score)}</td>
                    <td style="color:var(--text-muted)">${formatTime(entry.total_time_seconds)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">Belum ada data leaderboard</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
};
