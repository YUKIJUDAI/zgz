/**
 * Unit tests for JobMatcher.matchPreliminary()
 * Tests preliminary scoring (salary + location only)
 */

// Test framework
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   ${error.message}`);
      failed++;
    }
  }

  console.log('\n=== JobMatcher.matchPreliminary() Tests ===\n');

  // Test 1: Perfect match (25分)
  test('Perfect match: salary + location (25分)', () => {
    const jobInfo = {
      title: 'Vue前端工程师',
      company: '阿里巴巴',
      salary: '20-35K',
      location: '杭州'
    };
    const config = {
      salaryMin: 20000,
      locations: ['杭州']
    };

    const result = JobMatcher.matchPreliminary(jobInfo, config);

    assertEqual(result.score, 25, 'Score should be 25');
    assertEqual(result.passed, true, 'Should pass');
    assertEqual(result.details.salaryScore, 15, 'Salary score should be 15');
    assertEqual(result.details.locationScore, 10, 'Location score should be 10');
    assertEqual(result.type, 'preliminary', 'Type should be preliminary');
    assert(result.details.skillScore === undefined, 'Should not have skillScore');
    assert(result.details.bonusScore === undefined, 'Should not have bonusScore');
    assert(result.details.titleScore === undefined, 'Should not have titleScore');
  });

  // Test 2: Only salary match (15分)
  test('Only salary match (15分)', () => {
    const jobInfo = {
      title: 'Vue前端工程师',
      company: '阿里巴巴',
      salary: '20-35K',
      location: '上海'
    };
    const config = {
      salaryMin: 20000,
      locations: ['杭州']
    };

    const result = JobMatcher.matchPreliminary(jobInfo, config);

    assertEqual(result.score, 15, 'Score should be 15');
    assertEqual(result.passed, true, 'Should pass (>=15)');
    assertEqual(result.details.salaryScore, 15, 'Salary score should be 15');
    assertEqual(result.details.locationScore, 0, 'Location score should be 0');
    assertEqual(result.type, 'preliminary', 'Type should be preliminary');
  });

  // Test 3: Only location match (10分)
  test('Only location match (10分)', () => {
    const jobInfo = {
      title: 'Vue前端工程师',
      company: '阿里巴巴',
      salary: '10-15K',
      location: '杭州'
    };
    const config = {
      salaryMin: 20000,
      locations: ['杭州']
    };

    const result = JobMatcher.matchPreliminary(jobInfo, config);

    assertEqual(result.score, 10, 'Score should be 10');
    assertEqual(result.passed, false, 'Should not pass (<15)');
    assertEqual(result.details.salaryScore, 0, 'Salary score should be 0');
    assertEqual(result.details.locationScore, 10, 'Location score should be 10');
    assertEqual(result.type, 'preliminary', 'Type should be preliminary');
  });

  // Test 4: No match (0分)
  test('No match (0分)', () => {
    const jobInfo = {
      title: 'Vue前端工程师',
      company: '阿里巴巴',
      salary: '10-15K',
      location: '上海'
    };
    const config = {
      salaryMin: 20000,
      locations: ['杭州']
    };

    const result = JobMatcher.matchPreliminary(jobInfo, config);

    assertEqual(result.score, 0, 'Score should be 0');
    assertEqual(result.passed, false, 'Should not pass');
    assertEqual(result.details.salaryScore, 0, 'Salary score should be 0');
    assertEqual(result.details.locationScore, 0, 'Location score should be 0');
    assertEqual(result.type, 'preliminary', 'Type should be preliminary');
  });

  // Test 5: No salary requirement (给满分15)
  test('No salary requirement (15分)', () => {
    const jobInfo = {
      title: 'Vue前端工程师',
      company: '阿里巴巴',
      salary: '10-15K',
      location: '上海'
    };
    const config = {
      salaryMin: 0,
      locations: ['杭州']
    };

    const result = JobMatcher.matchPreliminary(jobInfo, config);

    assertEqual(result.score, 15, 'Score should be 15');
    assertEqual(result.passed, true, 'Should pass (>=15)');
    assertEqual(result.details.salaryScore, 15, 'Salary score should be 15 (no requirement)');
    assertEqual(result.details.locationScore, 0, 'Location score should be 0');
    assertEqual(result.type, 'preliminary', 'Type should be preliminary');
  });

  // Test 6: No location requirement (给满分10)
  test('No location requirement (10分)', () => {
    const jobInfo = {
      title: 'Vue前端工程师',
      company: '阿里巴巴',
      salary: '10-15K',
      location: '上海'
    };
    const config = {
      salaryMin: 20000,
      locations: []
    };

    const result = JobMatcher.matchPreliminary(jobInfo, config);

    assertEqual(result.score, 10, 'Score should be 10');
    assertEqual(result.passed, false, 'Should not pass (<15)');
    assertEqual(result.details.salaryScore, 0, 'Salary score should be 0');
    assertEqual(result.details.locationScore, 10, 'Location score should be 10 (no requirement)');
    assertEqual(result.type, 'preliminary', 'Type should be preliminary');
  });

  // Test 7: Should NOT include skill/bonus/title scores
  test('Should NOT include skill/bonus/title scores', () => {
    const jobInfo = {
      title: 'Vue前端工程师',
      company: '阿里巴巴',
      salary: '25-35K',
      location: '杭州',
      description: 'Vue3 TypeScript React',
      tags: ['Vue', 'TypeScript']
    };
    const config = {
      salaryMin: 20000,
      locations: ['杭州'],
      requiredSkills: ['Vue', 'TypeScript'],
      bonusSkills: ['React']
    };

    const result = JobMatcher.matchPreliminary(jobInfo, config);

    assertEqual(result.score, 25, 'Score should be 25 (only salary+location)');
    assertEqual(result.passed, true, 'Should pass');
    assertEqual(result.details.salaryScore, 15, 'Salary score should be 15');
    assertEqual(result.details.locationScore, 10, 'Location score should be 10');
    assertEqual(result.type, 'preliminary', 'Type should be preliminary');

    // Verify skill-related scores are undefined
    assert(result.details.skillScore === undefined, 'Should NOT have skillScore');
    assert(result.details.bonusScore === undefined, 'Should NOT have bonusScore');
    assert(result.details.titleScore === undefined, 'Should NOT have titleScore');
    assert(result.details.totalScore === undefined, 'Should NOT have totalScore');
    assert(result.details.threshold === undefined, 'Should NOT have threshold');
  });

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests();
