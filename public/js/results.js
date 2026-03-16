// Results Page
const ResultsPage = {
  async render(container, params) {
    const type = params.type || 'quiz';
    const attemptId = params.attempt;
    container.innerHTML = `
      <div class="container fade-in">
        <div style="text-align:center;margin-bottom:2rem">
          <h1 class="section-title">Hasil ${type === 'tryout' ? 'Try Out' : 'Quiz'}</h1>
          <p class="section-subtitle">Memuat detail hasil...</p>
        </div>
        <div class="grid grid-4" style="margin-bottom:2rem">
          <div class="card skeleton skeleton-card" style="height:120px"></div>
          <div class="card skeleton skeleton-card" style="height:120px"></div>
          <div class="card skeleton skeleton-card" style="height:120px"></div>
          <div class="card skeleton skeleton-card" style="height:120px"></div>
        </div>
        <div class="card skeleton skeleton-card" style="height:300px;margin-bottom:1.5rem"></div>
        <div class="card skeleton skeleton-card" style="height:300px"></div>
      </div>
    `;

    const endpoint = type === 'quiz' ? `/api/quiz/results/${attemptId}` : `/api/tryout/results/${attemptId}`;
    const data = await App.api(endpoint);
    if (!data) return;

    const attempt = data.attempt;
    const score = Math.round(attempt.score || 0);
    const scoreColor = score >= 700 ? 'var(--success)' : score >= 500 ? 'var(--accent)' : 'var(--danger)';

    // Subtest analysis (tryout)
    let subtestHTML = '';
    if (data.subtest_results && data.subtest_results.length > 0) {
      subtestHTML = `
        <div class="card" style="margin-bottom:1.5rem">
          <h2 style="margin-bottom:1rem">📊 Skor per Subtes</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Subtes</th><th>Benar</th><th>Total</th><th>Akurasi</th><th>Skor</th></tr></thead>
              <tbody>
                ${data.subtest_results.map(s => {
                  const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                  const sc = s.total > 0 ? Math.round((s.correct / s.total) * 1000) : 0;
                  return `<tr><td>${s.subtest}</td><td>${s.correct}</td><td>${s.total}</td>
                    <td><span class="badge ${acc >= 80 ? 'badge-success' : acc >= 60 ? 'badge-warning' : 'badge-danger'}">${acc}%</span></td>
                    <td style="font-weight:700">${sc}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    }

    // Performance Analysis (Subtest based)
    let analysisHTML = '';
    const analysisData = data.analysis;
    
    if (analysisData && analysisData.subtestAnalysis) {
      const subs = analysisData.subtestAnalysis;
      
      analysisHTML = `
        <div class="card" style="margin-bottom:1.5rem">
          <h2 style="margin-bottom:1rem">🧠 Analisis Performa per Subtes</h2>
          
          <div class="chart-bar-container" style="height:160px;margin-bottom:2rem">
            ${subs.map(s => {
              const color = s.accuracy >= 80 ? 'var(--success)' : s.accuracy >= 60 ? 'var(--accent)' : 'var(--danger)';
              const sName = (s.subtest || 'Lainnya');
              const shortName = sName.replace('Pengetahuan & Pemahaman Umum', 'PPU')
                .replace('Pemahaman Bacaan & Menulis', 'PBM')
                .replace('Penalaran Umum', 'PU')
                .replace('Pengetahuan Kuantitatif', 'PK')
                .replace('Literasi Bahasa Indonesia', 'LBI')
                .replace('Literasi Bahasa Inggris', 'LBE')
                .replace('Penalaran Matematika', 'PM') || sName;
              return `<div class="chart-bar-item">
                <div class="chart-bar-value" style="color:${color}">${s.accuracy || 0}%</div>
                <div class="chart-bar" style="height:${Math.max(s.accuracy || 0, 5)}%;background:${color}"></div>
                <div class="chart-bar-label" title="${sName}">${shortName}</div>
              </div>`;
            }).join('')}
          </div>

          <h3 style="margin-bottom:1rem;font-size:1.1rem">🔍 Area Perlu Peningkatan</h3>
          <div class="grid grid-2" style="gap:1rem">
            ${subs.map(s => {
              const weakCats = s.categoryDetails.filter(c => c.is_weak);
              if (weakCats.length === 0) return '';
              
              return `
              <div style="background:rgba(255,255,255,0.03);border-radius:0.75rem;padding:1rem;border-left:3px solid var(--danger)">
                <h4 style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:0.5rem">${s.subtest}</h4>
                <div style="display:flex;flex-wrap:wrap;gap:0.4rem">
                  ${weakCats.map(c => `<span class="badge badge-danger" style="font-size:0.7rem">${c.name} (${c.accuracy}%)</span>`).join('')}
                </div>
              </div>`;
            }).join('')}
            ${subs.every(s => s.categoryDetails.every(c => !c.is_weak)) ? '<p style="color:var(--success);grid-column: span 2;text-align:center">Luar biasa! Tidak ada kategori yang perlu peningkatan signifikan.</p>' : ''}
          </div>
        </div>`;
    }

    // Rank info (tryout only)
    let rankHTML = '';
    if (type === 'tryout' && data.rank) {
      rankHTML = `<div class="stat-card" style="border-color:rgba(245,158,11,0.3)"><div class="stat-value">#${data.rank}</div><div class="stat-label">Ranking Anda</div></div>`;
    }

    // Answer review
    const answers = data.answers || [];
    let reviewHTML = `
      <div class="card" style="margin-bottom:2rem">
        <h2 style="margin-bottom:1rem">📋 Pembahasan Soal</h2>
        <div id="review-questions">
          ${answers.slice(0, 10).map((a, i) => `
            <div style="padding:1rem 0;${i > 0 ? 'border-top:1px solid var(--border)' : ''}">
              <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem">
                <span style="font-weight:700;color:var(--text-muted)">${i + 1}.</span>
                ${a.is_correct ? '<span class="badge badge-success">Benar</span>' : '<span class="badge badge-danger">Salah</span>'}
                ${!a.user_answer ? '<span class="badge badge-warning">Tidak Dijawab</span>' : ''}
              </div>
              <p style="margin-bottom:0.75rem;line-height:1.6;white-space:pre-wrap;">${a.question_text}</p>
              ${['A','B','C','D','E'].map(opt => {
                const optKey = `option_${opt.toLowerCase()}`;
                const isUser = a.user_answer === opt;
                const isCorrect = a.correct_answer === opt;
                let cls = '';
                if (isCorrect) cls = 'correct';
                else if (isUser && !a.is_correct) cls = 'wrong';
                return `<div class="option-btn ${cls}" style="padding:0.5rem 0.75rem;margin-bottom:0.25rem;cursor:default;font-size:0.8125rem">
                  <span class="option-label">${opt}.</span><span style="white-space:pre-wrap;text-align:left;line-height:1.5;">${a[optKey]}</span>
                  ${isCorrect ? ' ✓' : ''}${isUser && !a.is_correct ? ' ✗' : ''}
                </div>`;
              }).join('')}
            </div>
          `).join('')}
          ${answers.length > 10 ? `<button class="btn btn-outline" style="width:100%;margin-top:1rem" onclick="ResultsPage.showAllAnswers()">Lihat Semua ${answers.length} Soal</button>` : ''}
        </div>
      </div>`;

    container.innerHTML = `
      <div class="container fade-in">
        <div style="text-align:center;margin-bottom:2rem">
          <h1 class="section-title">Hasil ${type === 'tryout' ? 'Try Out' : 'Quiz'}</h1>
          <p class="section-subtitle">Selesai pada ${formatDate(attempt.completed_at)}</p>
        </div>

        <div class="grid ${type === 'tryout' ? 'grid-4' : 'grid-3'}" style="margin-bottom:2rem">
          <div class="stat-card" style="border-color:${scoreColor}30">
            <div class="stat-value" style="background:linear-gradient(135deg,${scoreColor},${scoreColor});-webkit-background-clip:text">${score}</div>
            <div class="stat-label">Skor (0-1000)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${attempt.correct_count}/${attempt.correct_count + attempt.wrong_count + attempt.unanswered_count}</div>
            <div class="stat-label">Jawaban Benar</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatTime(attempt.total_time_seconds || 0)}</div>
            <div class="stat-label">Waktu Pengerjaan</div>
          </div>
          ${rankHTML}
        </div>

        ${subtestHTML}
        ${analysisHTML}
        ${reviewHTML}

        <div style="text-align:center;margin-bottom:3rem">
          <a href="#${type === 'tryout' ? 'tryout' : 'quiz'}" class="btn btn-primary btn-lg" style="text-decoration:none">← Kembali</a>
          ${type === 'tryout' ? '<a href="#leaderboard" class="btn btn-outline btn-lg" style="text-decoration:none;margin-left:0.75rem">🏆 Lihat Ranking</a>' : ''}
        </div>
      </div>
    `;

    this._allAnswers = answers;
  },

  showAllAnswers() {
    const answers = this._allAnswers || [];
    const el = document.getElementById('review-questions');
    if (!el) return;
    el.innerHTML = answers.map((a, i) => `
      <div style="padding:1rem 0;${i > 0 ? 'border-top:1px solid var(--border)' : ''}">
        <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem">
          <span style="font-weight:700;color:var(--text-muted)">${i + 1}.</span>
          ${a.is_correct ? '<span class="badge badge-success">Benar</span>' : '<span class="badge badge-danger">Salah</span>'}
          ${!a.user_answer ? '<span class="badge badge-warning">Tidak Dijawab</span>' : ''}
        </div>
        <p style="margin-bottom:0.75rem;line-height:1.6;white-space:pre-wrap;">${a.question_text}</p>
        ${['A','B','C','D','E'].map(opt => {
          const optKey = `option_${opt.toLowerCase()}`;
          const isUser = a.user_answer === opt;
          const isCorrect = a.correct_answer === opt;
          let cls = '';
          if (isCorrect) cls = 'correct';
          else if (isUser && !a.is_correct) cls = 'wrong';
          return `<div class="option-btn ${cls}" style="padding:0.5rem 0.75rem;margin-bottom:0.25rem;cursor:default;font-size:0.8125rem">
            <span class="option-label">${opt}.</span><span style="white-space:pre-wrap;text-align:left;line-height:1.5;">${a[optKey]}</span>
            ${isCorrect ? ' ✓' : ''}${isUser && !a.is_correct ? ' ✗' : ''}
          </div>`;
        }).join('')}
      </div>
    `).join('');
  }
};
