/**
 * UTBK Scoring System
 * Calculates normalized scores on a 0-1000 scale
 */

function calculateSubtestScore(correct, total) {
  if (total === 0) return 0;
  return Math.round((correct / total) * 1000);
}

function calculateTryoutScore(subtestResults) {
  if (!subtestResults || subtestResults.length === 0) return 0;
  const totalCorrect = subtestResults.reduce((sum, s) => sum + s.correct, 0);
  const totalQuestions = subtestResults.reduce((sum, s) => sum + s.total, 0);
  if (totalQuestions === 0) return 0;

  // Weighted scoring based on difficulty
  let weightedScore = 0;
  let totalWeight = 0;
  for (const s of subtestResults) {
    const weight = getSubtestWeight(s.subtest);
    weightedScore += (s.correct / s.total) * weight * 1000;
    totalWeight += weight;
  }

  return Math.round(weightedScore / totalWeight);
}

function getSubtestWeight(subtest) {
  const weights = {
    'Penalaran Umum': 1.2,
    'Pengetahuan & Pemahaman Umum': 1.0,
    'Pemahaman Bacaan & Menulis': 1.0,
    'Pengetahuan Kuantitatif': 1.1,
    'Literasi Bahasa Indonesia': 1.0,
    'Literasi Bahasa Inggris': 1.0,
    'Penalaran Matematika': 1.2
  };
  return weights[subtest] || 1.0;
}

module.exports = { calculateSubtestScore, calculateTryoutScore };
