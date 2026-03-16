// Payment Page
const PaymentPage = {
  async render(container) {
    container.innerHTML = `
      <div class="container fade-in">
        <div style="margin-bottom:2rem">
          <h1 class="section-title">💰 Kredit & Pembayaran</h1>
          <p class="section-subtitle">Beli kredit untuk membuka paket quiz dan try out</p>
        </div>
        <div class="grid grid-2" style="margin-bottom:2rem">
          <div class="card skeleton skeleton-card" style="height:250px"></div>
          <div class="skeleton-wrapper">
             <div class="skeleton skeleton-text" style="height:3.5rem"></div>
             <div class="skeleton skeleton-text" style="height:3.5rem"></div>
             <div class="skeleton skeleton-text" style="height:3.5rem"></div>
          </div>
        </div>
        <div class="card skeleton skeleton-card" style="height:300px"></div>
      </div>
    `;

    await App.refreshUser();
    try {
      // Sync balance with Mayar on page load
      const syncResult = await App.api('/api/payments/sync-balance', { method: 'POST' });
      if (syncResult && syncResult.synced) {
        App.user.credit_balance = syncResult.balance;
      }
    } catch (e) { console.warn('Sync balance failed:', e); }

    const historyData = await App.api('/api/payments/history');
    const payments = historyData ? historyData.payments : [];

    container.innerHTML = `
      <div class="container fade-in">
        <div style="margin-bottom:2rem">
          <h1 class="section-title">💰 Kredit & Pembayaran</h1>
          <p class="section-subtitle">Beli kredit untuk membuka paket quiz dan try out</p>
        </div>

        <div class="grid grid-2" style="margin-bottom:2rem">
          <div class="card" style="text-align:center;border-color:rgba(245,158,11,0.3)">
            <div style="font-size:3rem;margin-bottom:0.5rem">💰</div>
            <div style="font-size:2.5rem;font-weight:800;color:var(--accent)">${App.user.credit_balance || 0}</div>
            <div style="color:var(--text-muted);margin-bottom:1.5rem">Saldo Kredit Anda</div>
            <button class="btn btn-warning btn-lg" style="width:100%" onclick="PaymentPage.buyCredits()">
              Beli Kredit
            </button>
          </div>

          <div class="card">
              <div style="background:var(--bg-dark);border-radius:0.75rem;padding:1rem;display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600">Quiz (per paket)</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">Akses selamanya</div>
                </div>
                <span class="badge badge-info">250 kredit</span>
              </div>
              <div style="background:var(--bg-dark);border-radius:0.75rem;padding:1rem;display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600">Try Out (per paket)</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">Akses selamanya</div>
                </div>
                <span class="badge badge-info">1.000 kredit</span>
              </div>
              <div style="background:var(--bg-dark);border-radius:0.75rem;padding:1rem;display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600">Nilai Kredit</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">Konversi saldo rupiah ke kredit</div>
                </div>
                <span class="badge badge-success">Rp 1 = 1 kredit</span>
              </div>
            </div>
            <div style="margin-top:1.5rem;padding:1rem;background:rgba(245,158,11,0.1);border-radius:0.75rem;border:1px dashed var(--accent)">
              <div style="font-size:0.8125rem;font-weight:700;color:var(--accent);margin-bottom:0.25rem">ℹ️ Minimal Pembelian</div>
              <div style="font-size:0.75rem;color:var(--text-secondary)">Minimal top-up adalah <strong>1.000 kredit</strong> (Rp 1.000) per transaksi.</div>
            </div>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:1rem">* Paket yang sudah dibeli terbuka selamanya, tidak perlu beli ulang.</p>
          </div>
        </div>

        <div class="card">
          <h2 style="margin-bottom:1rem">📜 Riwayat Transaksi</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Tanggal</th><th>Deskripsi</th><th>Jumlah</th><th>Kredit</th><th>Status</th></tr></thead>
              <tbody>
                ${payments.length > 0 ? payments.map(p => {
                  const isDebit = p.transaction_type === 'debit';
                  return `
                    <tr>
                      <td>${formatDate(p.created_at)}</td>
                      <td>
                        <div style="font-weight:600">${p.description || (isDebit ? 'Pembelian Paket' : 'Top-up Kredit')}</div>
                        ${p.payment_id ? `<div style="font-size:0.7rem;color:var(--text-muted)">ID: ${p.payment_id.substring(0, 16)}...</div>` : ''}
                      </td>
                      <td style="color:var(--text-muted)">${p.amount > 0 ? `Rp ${Number(p.amount).toLocaleString('id-ID')}` : '-'}</td>
                      <td>
                        <span class="badge ${isDebit ? 'badge-warning' : 'badge-success'}">
                          ${isDebit ? '-' : '+'}${p.credits_added}
                        </span>
                      </td>
                      <td><span class="badge badge-success">Success</span></td>
                    </tr>
                  `;
                }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">Belum ada riwayat transaksi</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  async buyCredits() {
    const data = await App.api('/api/payments/buy-credits');
    if (data && data.payment_url) {
      window.open(data.payment_url, '_blank');
      Toast.success('Halaman pembayaran Mayar dibuka di tab baru');
    }
  }
};
