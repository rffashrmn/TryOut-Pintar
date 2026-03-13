require('dotenv').config();
const db = require('./src/config/database');

async function checkNames() {
  try {
    const [subtests] = await db.execute("SELECT DISTINCT subtest FROM tryout_subtests");
    const [questions] = await db.execute("SELECT DISTINCT subtest FROM questions");
    
    console.log('Subtest names in tryout_subtests:', subtests.map(s => `"${s.subtest}"`));
    console.log('Subtest names in questions:', questions.map(q => `"${q.subtest}"`));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkNames();
