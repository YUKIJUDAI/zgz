/**
 * Node.js test runner for AI Service
 * Simulates browser environment without DOM/Chrome APIs
 */

// Mock BossUtils for Node.js environment
global.BossUtils = {
  log: (level, message, data) => {
    console.log(`[${level.toUpperCase()}] ${message}`, data || '');
  }
};

// Load AIService
const fs = require('fs');
const path = require('path');
const aiServiceCode = fs.readFileSync(path.join(__dirname, '../lib/ai-service.js'), 'utf8');

// Execute in global context
const vm = require('vm');
vm.runInThisContext(aiServiceCode);

// Test configuration
const testConfig = {
  aiProvider: 'openai',
  aiModel: 'gpt-4o-mini',
  openaiApiKey: 'test-key-123',
  openaiBaseURL: 'https://api.openai.com/v1'
};

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
  console.log('\n=== AI Service Test Suite ===\n');

  // Test 1: Initialization
  console.log('Test 1: Initialization');
  AIService.config = null;
  await AIService.initialize(testConfig);
  assert(AIService.config !== null, 'Config should be set');
  assert(AIService.config.provider === 'openai', 'Provider should be openai');
  assert(AIService.config.model === 'gpt-4o-mini', 'Model should be gpt-4o-mini');
  assert(AIService.cache instanceof Map, 'Cache should be a Map');
  console.log('');

  // Test 2: Cache functionality
  console.log('Test 2: Cache');
  const testPrompt = 'test prompt';
  const testResponse = { result: 'cached response' };

  AIService.setCache(testPrompt, testResponse);
  const cached = AIService.getCache(testPrompt);
  assert(cached !== null, 'Cache should return value');
  assert(cached.result === 'cached response', 'Cached value should match');

  // Test cache expiry
  const expiredKey = 'expired';
  AIService.cache.set(expiredKey, {
    response: 'old',
    timestamp: Date.now() - 2 * 60 * 60 * 1000  // 2 hours ago
  });
  const shouldBeNull = AIService.getCache(expiredKey);
  assert(shouldBeNull === null, 'Expired cache should return null');
  console.log('');

  // Test 3: Rate limiting
  console.log('Test 3: Rate Limiting');
  AIService.rateLimiter = {
    perMinute: 0,
    perHour: 0,
    lastMinute: Date.now(),
    lastHour: Date.now()
  };

  const canCall1 = AIService.checkRateLimit();
  assert(canCall1 === true, 'Should allow call initially');

  AIService.rateLimiter.perMinute = 20;
  const canCall2 = AIService.checkRateLimit();
  assert(canCall2 === false, 'Should block at 20 calls per minute');

  AIService.rateLimiter.perMinute = 0;
  AIService.rateLimiter.perHour = 200;
  const canCall3 = AIService.checkRateLimit();
  assert(canCall3 === false, 'Should block at 200 calls per hour');
  console.log('');

  // Test 4: Hash function
  console.log('Test 4: Hash Function');
  const hash1 = AIService.hashPrompt('test');
  const hash2 = AIService.hashPrompt('test');
  const hash3 = AIService.hashPrompt('different');
  assert(hash1 === hash2, 'Same prompt should produce same hash');
  assert(hash1 !== hash3, 'Different prompts should produce different hashes');
  console.log('');

  // Test 5: Call recording
  console.log('Test 5: Call Recording');
  AIService.rateLimiter = {
    perMinute: 0,
    perHour: 0,
    lastMinute: Date.now(),
    lastHour: Date.now()
  };
  AIService.recordCall();
  assert(AIService.rateLimiter.perMinute === 1, 'Should increment per-minute counter');
  assert(AIService.rateLimiter.perHour === 1, 'Should increment per-hour counter');
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
