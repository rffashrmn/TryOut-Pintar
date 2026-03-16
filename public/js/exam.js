// Exam Execution Page (shared for quiz & tryout)
const ExamPage = {
  timer: null,
  timeRemaining: 0,
  currentIndex: 0,
  questions: [],
  attempt: null,
  subtests: [],
  currentSubtestIndex: 0,
  type: 'quiz',
  totalElapsed: 0,
  elapsedTimer: null,

  async render(container, params) {
    this.type = params.type || 'quiz';
    const attemptId = params.attempt;
    const subtest = params.subtest;
    container.innerHTML = `
      <div class="container fade-in" style="padding-top:4rem">
        <div style="max-width:900px;margin:0 auto;padding:0 1.5rem">
          <div style="margin-bottom:2rem">
            <div style="font-weight:700;font-size:1.25rem;color:var(--text-muted)">Mempersiapkan Soal...</div>
          </div>
          <div class="skeleton" style="width:100%;height:8px;border-radius:4px;margin-bottom:1.5rem"></div>
          <div class="card skeleton skeleton-card" style="height:250px;margin-bottom:1.5rem"></div>
          <div class="skeleton-wrapper">
             <div class="skeleton skeleton-btn" style="height:3.5rem"></div>
             <div class="skeleton skeleton-btn" style="height:3.5rem"></div>
             <div class="skeleton skeleton-btn" style="height:3.5rem"></div>
             <div class="skeleton skeleton-btn" style="height:3.5rem"></div>
             <div class="skeleton skeleton-btn" style="height:3.5rem"></div>
          </div>
        </div>
      </div>
    `;

    let endpoint = this.type === 'quiz' ? `/api/quiz/attempt/${attemptId}` : `/api/tryout/attempt/${attemptId}`;
    if (this.type === 'tryout' && subtest) endpoint += `?subtest=${encodeURIComponent(subtest)}`;
    
    const data = await App.api(endpoint);
    if (!data) return;

    this.attempt = data.attempt;
    this.subtests = data.subtests || [];
    this.questions = data.questions || [];
    this.currentIndex = 0;
    this.totalElapsed = 0;

    if (this.attempt.status === 'completed') {
      App.navigate('results', { type: this.type, attempt: attemptId });
      return;
    }

    if (this.type === 'tryout' && this.subtests.length > 0) {
      const activeSubName = subtest || this.attempt.current_subtest;
      this.currentSubtestIndex = this.subtests.findIndex(s => s.subtest === activeSubName);
      if (this.currentSubtestIndex < 0) this.currentSubtestIndex = 0;
    }

    if (this.type === 'tryout') {
      const p = data.progress.find(pg => pg.subtest_name === subtest);
      if (p) {
        this.timeRemaining = Math.max(0, p.time_remaining_seconds - (p.elapsed || 0));
      } else {
        this.timeRemaining = 0;
      }
    } else {
      this.timeRemaining = this.attempt.time_remaining_seconds || 0;
      if (this.timeRemaining <= 0 && this.type === 'quiz') {
        const pkg = this.questions.length;
        this.timeRemaining = pkg * 60;
      }
    }

    this.renderExam(container);
    if (this.type === 'tryout') {
      this.startTimer();
    }
    this.startElapsedTimer();
  },

  getCurrentQuestions() {
    return this.questions;
  },

  renderExam(container) {
    const questions = this.getCurrentQuestions();
    if (questions.length === 0) {
      container.innerHTML = `
        <div class="container fade-in" style="padding:10rem 0;text-align:center">
          <div style="font-size:4rem;margin-bottom:1.5rem">📂</div>
          <h2 style="font-weight:700;margin-bottom:0.5rem">Tidak ada soal tersedia.</h2>
          <p style="color:var(--text-muted);margin-bottom:2rem">Paket soal ini sedang diperbarui atau belum memiliki pertanyaan.</p>
          <button class="btn btn-primary" onclick="App.navigate('${this.type === 'tryout' ? 'tryout' : 'quiz'}')">← Kembali ke Daftar</button>
        </div>
      `;
      return;
    }

    const q = questions[this.currentIndex] || questions[0];
    const subtestInfo = this.type === 'tryout' && this.subtests.length > 0
      ? `<div style="font-size:0.8125rem;color:var(--text-muted)">${this.subtests[this.currentSubtestIndex]?.subtest || ''} (${this.currentSubtestIndex + 1}/${this.subtests.length})</div>`
      : '';

    container.innerHTML = `
      ${this.type === 'tryout' ? `
      <div class="timer-container" id="premium-timer">
        <span class="timer-icon">⏳</span>
        <div style="display:flex;flex-direction:column;line-height:1.2">
          <span class="timer-subtest-info" id="timer-subtest-name">${this.subtests[this.currentSubtestIndex]?.subtest || 'UTBK'}</span>
          <span class="timer-value" id="exam-timer-val">${formatTime(this.timeRemaining)}</span>
        </div>
      </div>
      ` : ''}

      <div class="exam-header">
        <div style="display:flex;align-items:center;gap:1.5rem">
          <div>
            <div style="font-weight:700;font-size:0.9375rem">Soal ${this.currentIndex + 1}/${questions.length}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">ID: ${q.question_id}</div>
          </div>
        </div>
        <div style="display:flex;gap:0.75rem">
          <button class="btn btn-outline btn-sm" onclick="App.navigate('${this.type === 'tryout' ? 'tryout-details' : 'quiz'}', { attempt: ${this.attempt.id} })">Keluar</button>
          <button class="btn btn-danger btn-sm" onclick="ExamPage.handleSubmit()">${this.type === 'tryout' ? 'Selesai Subtes' : 'Selesai Quiz'}</button>
        </div>
      </div>

      <div style="padding-top:90px;max-width:900px;margin:0 auto;padding-left:1.5rem;padding-right:1.5rem">
        ${this.type === 'tryout' ? this.renderSubtestTabs() : ''}
        <div style="margin-bottom:1rem">
          <div class="progress-bar"><div class="progress-fill" style="width:${((this.currentIndex + 1) / questions.length) * 100}%"></div></div>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
          <div style="display:flex;gap:0.5rem;margin-bottom:1rem">
            <span class="badge badge-info">${q.category || 'Umum'}</span>
            <span class="badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}">${q.difficulty === 'easy' ? 'Mudah' : q.difficulty === 'hard' ? 'Sulit' : 'Sedang'}</span>
          </div>
          ${q.image_url ? `<div style="margin-bottom:1.5rem;text-align:center"><img src="${q.image_url}" alt="Attachment" style="max-width:100%;border-radius:0.5rem;box-shadow:0 4px 12px rgba(0,0,0,0.2)"></div>` : ''}
          <p style="font-size:1.0625rem;line-height:1.7;white-space:pre-wrap;">${q.question_text}</p>
        </div>

        <div id="options-container">
          ${['A','B','C','D','E'].map(opt => {
            const optKey = `option_${opt.toLowerCase()}`;
            const isSelected = q.user_answer === opt;
            return `<button class="option-btn ${isSelected ? 'selected' : ''}" onclick="ExamPage.selectAnswer('${opt}')">
              <span class="option-label">${opt}.</span><span style="white-space:pre-wrap;text-align:left;line-height:1.5;">${q[optKey]}</span>
            </button>`;
          }).join('')}
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:1.5rem;margin-bottom:2rem">
          <button class="btn btn-outline" ${this.currentIndex === 0 ? 'disabled' : ''} onclick="ExamPage.prevQuestion()">← Sebelumnya</button>
          <button class="btn btn-primary" onclick="ExamPage.nextQuestion()">${this.currentIndex === questions.length - 1 ? (this.type === 'tryout' && this.currentSubtestIndex < this.subtests.length - 1 ? 'Subtes Berikutnya →' : 'Finish →') : 'Selanjutnya →'}</button>
        </div>

        <div class="card" style="margin-bottom:2rem">
          <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:0.75rem">Navigasi Soal</p>
          <div class="question-nav">
            ${questions.map((qq, i) => `
              <div class="q-dot ${qq.user_answer ? 'answered' : ''} ${i === this.currentIndex ? 'current' : ''}" onclick="ExamPage.goToQuestion(${i})">${i + 1}</div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  renderSubtestTabs() {
    return `<div class="subtest-tabs" style="margin-bottom:1rem">
      ${this.subtests.map((s, i) => {
        const isCompleted = i < this.currentSubtestIndex;
        const isCurrent = i === this.currentSubtestIndex;
        const shortName = s.subtest.replace('Pengetahuan & Pemahaman Umum', 'PPU')
          .replace('Pemahaman Bacaan & Menulis', 'PBM').replace('Penalaran Umum', 'PU')
          .replace('Pengetahuan Kuantitatif', 'PK').replace('Literasi Bahasa Indonesia', 'LBI')
          .replace('Literasi Bahasa Inggris', 'LBE').replace('Penalaran Matematika', 'PM');
        return `<button class="subtest-tab ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}" ${!isCurrent ? 'disabled' : ''} style="${!isCurrent && !isCompleted ? 'opacity:0.5' : ''}">${shortName}</button>`;
      }).join('')}
    </div>`;
  },

  async selectAnswer(answer) {
    const questions = this.getCurrentQuestions();
    const q = questions[this.currentIndex];
    if (!q) return;

    q.user_answer = answer;

    // Save to server
    const endpoint = this.type === 'quiz' ? '/api/quiz/answer' : '/api/tryout/answer';
    const res = await App.api(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        attempt_id: this.attempt.id,
        question_id: q.question_id,
        answer: answer,
        subtest: q.subtest
      })
    });

    if (!res && this.type === 'tryout') {
      // Refresh to detail page on error (likely expiration)
      App.navigate('tryout-details', { attempt: this.attempt.id });
      return;
    }

    // Re-render options
    const container = document.getElementById('options-container');
    if (container) {
      container.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.querySelector('.option-label').textContent.startsWith(answer)) {
          btn.classList.add('selected');
        }
      });
    }

    // Update nav dots
    document.querySelectorAll('.q-dot').forEach((dot, i) => {
      dot.classList.toggle('answered', !!questions[i]?.user_answer);
    });
  },

  goToQuestion(index) {
    this.currentIndex = index;
    const mainEl = document.querySelector('.main');
    if (mainEl) this.renderExam(mainEl);
  },

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const mainEl = document.querySelector('.main');
      if (mainEl) this.renderExam(mainEl);
    }
  },

  nextQuestion() {
    const questions = this.getCurrentQuestions();
    if (this.currentIndex < questions.length - 1) {
      this.currentIndex++;
      const mainEl = document.querySelector('.main');
      if (mainEl) this.renderExam(mainEl);
    } else {
      this.handleSubmit();
    }
  },

  // Removed auto-next logic in favor of manual submission per subtest


  startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeRemaining--;
      const timerValEl = document.getElementById('exam-timer-val');
      if (timerValEl) {
        timerValEl.textContent = formatTime(Math.max(0, this.timeRemaining));
        if (this.timeRemaining < 60) {
          timerValEl.classList.add('critical');
        } else {
          timerValEl.classList.remove('critical');
        }
      }
      if (this.timeRemaining <= 0) {
        clearInterval(this.timer);
        if (this.type === 'tryout') {
          Toast.show('Waktu subtes habis!', 'error');
          this.submitExam();
        }
      }
    }, 1000);
  },

  startElapsedTimer() {
    if (this.elapsedTimer) clearInterval(this.elapsedTimer);
    this.elapsedTimer = setInterval(() => { this.totalElapsed++; }, 1000);
  },

  handleSubmit() {
    const questions = this.getCurrentQuestions();
    const answered = questions.filter(q => q.user_answer).length;
    const unanswered = questions.length - answered;

    Modal.show(`
      <h3>Selesaikan ${this.type === 'tryout' ? 'Try Out' : 'Quiz'}?</h3>
      <div style="background:var(--bg-dark);border-radius:0.75rem;padding:1rem;margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
          <span style="color:var(--text-muted)">Dijawab</span>
          <span style="font-weight:600;color:var(--success)">${answered} soal</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Belum dijawab</span>
          <span style="font-weight:600;color:${unanswered > 0 ? 'var(--danger)' : 'var(--success)'}">${unanswered} soal</span>
        </div>
      </div>
      ${unanswered > 0 ? '<p style="color:var(--warning);font-size:0.8125rem;margin-bottom:0.5rem">⚠ Masih ada soal yang belum dijawab!</p>' : ''}
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="Modal.hide()">Kembali</button>
        <button class="btn btn-primary" onclick="Modal.hide();ExamPage.submitExam()">Selesai & Lihat Hasil</button>
      </div>
    `);
  },

  async submitExam() {
    if (this.timer) clearInterval(this.timer);
    if (this.elapsedTimer) clearInterval(this.elapsedTimer);

    const endpoint = this.type === 'quiz'
      ? `/api/quiz/submit/${this.attempt.id}`
      : `/api/tryout/subtest/submit`;

    const body = this.type === 'quiz' 
      ? { total_time: this.totalElapsed }
      : { 
          attempt_id: this.attempt.id, 
          subtest: this.getCurrentQuestions()[0]?.subtest,
          time_remaining_seconds: this.timeRemaining
        };

    const data = await App.api(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (data) {
      if (this.type === 'tryout') {
        Toast.success('Subtes selesai disimpan!');
        App.navigate('tryout-details', { attempt: this.attempt.id });
      } else {
        Toast.success('Berhasil dikumpulkan!');
        App.navigate('results', { type: this.type, attempt: this.attempt.id });
      }
    }
  },

  cleanup() {
    if (this.timer) clearInterval(this.timer);
    if (this.elapsedTimer) clearInterval(this.elapsedTimer);
  }
};
