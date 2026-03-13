/**
 * AI Performance Analysis
 * Generates study recommendations based on attempt results
 */

function generateAnalysis(answers, questions) {
  const subtestStats = {};

  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.question_id);
    if (!question) continue;

    const sub = question.subtest;
    const cat = question.category || 'Lainnya';
    
    if (!subtestStats[sub]) {
      subtestStats[sub] = { 
        correct: 0, 
        total: 0, 
        categories: {}
      };
    }
    
    subtestStats[sub].total++;
    if (answer.is_correct) subtestStats[sub].correct++;
    
    if (!subtestStats[sub].categories[cat]) {
      subtestStats[sub].categories[cat] = { correct: 0, total: 0 };
    }
    subtestStats[sub].categories[cat].total++;
    if (answer.is_correct) subtestStats[sub].categories[cat].correct++;
  }

  const subtestAnalysis = [];
  const overallWeakCategories = [];

  for (const [subtest, stats] of Object.entries(subtestStats)) {
    const subAccuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    
    const categories = [];
    const weakInSubtest = [];

    for (const [catName, catStats] of Object.entries(stats.categories)) {
      const catAccuracy = Math.round((catStats.correct / catStats.total) * 100);
      categories.push({
        name: catName,
        accuracy: catAccuracy,
        is_weak: catAccuracy < 60
      });
      if (catAccuracy < 60) {
        weakInSubtest.push(catName);
        overallWeakCategories.push(`${subtest}: ${catName}`);
      }
    }

    subtestAnalysis.push({
      subtest,
      accuracy: Math.round(subAccuracy),
      correct: stats.correct,
      total: stats.total,
      weakCategories: weakInSubtest,
      categoryDetails: categories
    });
  }

  subtestAnalysis.sort((a, b) => a.accuracy - b.accuracy);

  return { 
    subtestAnalysis, 
    recommendation: subtestAnalysis.length > 0 ? 'Analisis performa berdasarkan subtes dan kategori spesifik.' : 'Belum ada data pengerjaan.',
    overallWeakCategories 
  };
}

function generateSubtestAnalysis(subtestResults) {
  const analysis = subtestResults.map(s => ({
    subtest: s.subtest,
    correct: s.correct,
    total: s.total,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    score: s.total > 0 ? Math.round((s.correct / s.total) * 1000) : 0
  }));

  analysis.sort((a, b) => a.accuracy - b.accuracy);

  const weak = analysis.filter(a => a.accuracy < 60).map(a => a.subtest);
  const strong = analysis.filter(a => a.accuracy >= 80).map(a => a.subtest);

  let summary = '';
  if (strong.length > 0) summary += `Kuat di: ${strong.join(', ')}. `;
  if (weak.length > 0) summary += `Perlu ditingkatkan: ${weak.join(', ')}.`;
  if (!summary) summary = 'Performa merata di semua subtes.';

  return { subtestAnalysis: analysis, summary, weak, strong };
}

module.exports = { generateAnalysis, generateSubtestAnalysis };
