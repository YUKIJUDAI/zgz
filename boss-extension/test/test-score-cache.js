/**
 * Test suite for Job Score Cache
 */

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n=== Job Score Cache Test Suite ===\n');

  // Test 1: savePreliminaryScore
  console.log('Test 1: Save Preliminary Score');
  await JobScoreCache.clearAll();

  const preliminaryData = {
    score: 20,
    details: {
      salaryScore: 15,
      locationScore: 5
    },
    cachedInfo: {
      title: 'Senior JavaScript Developer',
      company: 'Tech Corp',
      salary: '25-35K',
      location: '杭州'
    }
  };

  await JobScoreCache.savePreliminaryScore('job123', preliminaryData);
  const saved1 = await JobScoreCache.load('job123');

  assert(saved1 !== null, 'Should save and load preliminary score');
  assert(saved1.jobId === 'job123', 'Job ID should match');
  assert(saved1.preliminaryScore.score === 20, 'Preliminary score should be 20');
  assert(saved1.preliminaryScore.details.salaryScore === 15, 'Salary score should be 15');
  assert(saved1.preliminaryScore.details.locationScore === 5, 'Location score should be 5');
  assert(saved1.preliminaryScore.source === 'job-list', 'Source should be job-list');
  assert(saved1.cachedInfo.title === 'Senior JavaScript Developer', 'Title should match');
  assert(saved1.cachedInfo.company === 'Tech Corp', 'Company should match');
  assert(saved1.accurateScore === undefined, 'Accurate score should not exist yet');
  console.log('');

  // Test 2: load
  console.log('Test 2: Load Score and Verify Structure');
  const loaded = await JobScoreCache.load('job123');

  assert(loaded !== null, 'Should load existing score');
  assert(loaded.jobId === 'job123', 'Job ID should match');
  assert(loaded.preliminaryScore !== undefined, 'Preliminary score should exist');
  assert(loaded.cachedInfo !== undefined, 'Cached info should exist');
  assert(loaded.lastUpdated !== undefined, 'lastUpdated should exist');
  assert(loaded.lastAccessed !== undefined, 'lastAccessed should exist');
  assert(typeof loaded.preliminaryScore.timestamp === 'number', 'Timestamp should be a number');
  console.log('');

  // Test 3: saveAccurateScore
  console.log('Test 3: Save Accurate Score on Top of Preliminary');
  const accurateData = {
    score: 85,
    details: {
      skillScore: 40,
      bonusScore: 15,
      salaryScore: 15,
      locationScore: 10,
      titleScore: 5
    },
    hasFullDescription: true
  };

  await JobScoreCache.saveAccurateScore('job123', accurateData);
  const saved2 = await JobScoreCache.load('job123');

  assert(saved2 !== null, 'Should load after saving accurate score');
  assert(saved2.preliminaryScore !== undefined, 'Preliminary score should still exist');
  assert(saved2.accurateScore !== undefined, 'Accurate score should now exist');
  assert(saved2.accurateScore.score === 85, 'Accurate score should be 85');
  assert(saved2.accurateScore.details.skillScore === 40, 'Skill score should be 40');
  assert(saved2.accurateScore.source === 'job-detail', 'Source should be job-detail');
  assert(saved2.accurateScore.hasFullDescription === true, 'hasFullDescription should be true');
  console.log('');

  // Test 4: Cache expiry
  console.log('Test 4: Cache Expiry (7 days)');
  await JobScoreCache.clearAll();

  // Save a score with an old timestamp
  const oldData = {
    score: 15,
    details: { salaryScore: 10, locationScore: 5 },
    cachedInfo: { title: 'Old Job', company: 'Old Corp', salary: '20K', location: '北京' }
  };

  await JobScoreCache.savePreliminaryScore('oldJob', oldData);

  // Manually modify the timestamp to be 8 days old
  const allScores = await new Promise(resolve => {
    chrome.storage.local.get([JobScoreCache.STORAGE_KEY], result => {
      resolve(result[JobScoreCache.STORAGE_KEY] || {});
    });
  });

  const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
  allScores.oldJob.lastUpdated = eightDaysAgo;
  allScores.oldJob.preliminaryScore.timestamp = eightDaysAgo;

  await new Promise(resolve => {
    chrome.storage.local.set({ [JobScoreCache.STORAGE_KEY]: allScores }, resolve);
  });

  const expired = await JobScoreCache.load('oldJob');
  assert(expired === null, 'Expired score should return null');
  console.log('');

  // Test 5: LRU eviction
  console.log('Test 5: LRU Eviction (200 entries max)');
  await JobScoreCache.clearAll();

  // Save 205 entries
  for (let i = 0; i < 205; i++) {
    await JobScoreCache.savePreliminaryScore(`job${i}`, {
      score: 10 + i % 15,
      details: { salaryScore: 5 + i % 10, locationScore: 5 },
      cachedInfo: { title: `Job ${i}`, company: `Company ${i}`, salary: '20K', location: '上海' }
    });
    // Add small delay to ensure different timestamps
    if (i < 10) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  const allScoresAfterEviction = await new Promise(resolve => {
    chrome.storage.local.get([JobScoreCache.STORAGE_KEY], result => {
      resolve(result[JobScoreCache.STORAGE_KEY] || {});
    });
  });

  const entryCount = Object.keys(allScoresAfterEviction).length;
  assert(entryCount === 200, `Should have exactly 200 entries, got ${entryCount}`);

  // The oldest 5 entries (job0-job4) should be evicted
  const hasOld = await JobScoreCache.load('job0');
  const hasRecent = await JobScoreCache.load('job204');
  assert(hasOld === null, 'Oldest entry (job0) should be evicted');
  assert(hasRecent !== null, 'Most recent entry (job204) should exist');
  console.log('');

  // Test 6: clearAll
  console.log('Test 6: Clear All Scores');
  await JobScoreCache.clearAll();

  const afterClear1 = await JobScoreCache.load('job123');
  const afterClear2 = await JobScoreCache.load('job204');

  const allScoresAfterClear = await new Promise(resolve => {
    chrome.storage.local.get([JobScoreCache.STORAGE_KEY], result => {
      resolve(result[JobScoreCache.STORAGE_KEY] || {});
    });
  });

  assert(afterClear1 === null, 'job123 should be null after clear');
  assert(afterClear2 === null, 'job204 should be null after clear');
  assert(Object.keys(allScoresAfterClear).length === 0, 'Storage should be empty after clear');
  console.log('');

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n✓ All tests PASSED!\n');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests FAILED!\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
