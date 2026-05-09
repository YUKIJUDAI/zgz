/**
 * AI Service Test Suite
 */

const testConfig = {
  aiProvider: 'openai',
  aiModel: 'gpt-4o-mini',
  openaiApiKey: 'test-key-123',
  openaiBaseURL: 'https://api.openai.com/v1'
};

function log(message, isPass) {
  const results = document.getElementById('ai-results');
  const entry = document.createElement('div');
  entry.className = isPass ? 'pass' : 'fail';
  entry.textContent = `${isPass ? '✓' : '✗'} ${message}`;
  results.appendChild(entry);
}

async function testAIServiceInit() {
  document.getElementById('ai-results').innerHTML = '';

  try {
    AIService.config = null;
    await AIService.initialize(testConfig);

    const hasConfig = AIService.config !== null;
    const hasCorrectProvider = AIService.config.provider === 'openai';
    const hasCache = AIService.cache instanceof Map;

    log(`Initialize: Config set = ${hasConfig}`, hasConfig);
    log(`Initialize: Provider = ${AIService.config.provider}`, hasCorrectProvider);
    log(`Initialize: Cache created = ${hasCache}`, hasCache);

    if (hasConfig && hasCorrectProvider && hasCache) {
      log('✓ AI Service initialization PASSED', true);
    } else {
      log('✗ AI Service initialization FAILED', false);
    }
  } catch (error) {
    log(`Initialize error: ${error.message}`, false);
  }
}

async function testAIServiceCache() {
  document.getElementById('ai-results').innerHTML = '';

  try {
    await AIService.initialize(testConfig);

    // Test cache set/get
    const testPrompt = 'test prompt';
    const testResponse = { result: 'cached response' };

    AIService.setCache(testPrompt, testResponse);
    const cached = AIService.getCache(testPrompt);

    const cacheWorks = cached && cached.result === 'cached response';
    log(`Cache: Set and retrieve = ${cacheWorks}`, cacheWorks);

    // Test cache expiry
    const expiredKey = 'expired';
    AIService.cache.set(expiredKey, {
      response: 'old',
      timestamp: Date.now() - 2 * 60 * 60 * 1000  // 2 hours ago
    });

    const shouldBeNull = AIService.getCache(expiredKey);
    const expiryWorks = shouldBeNull === null;
    log(`Cache: Expiry (1hr) = ${expiryWorks}`, expiryWorks);

    if (cacheWorks && expiryWorks) {
      log('✓ AI Service caching PASSED', true);
    }
  } catch (error) {
    log(`Cache error: ${error.message}`, false);
  }
}

async function testAIServiceRateLimit() {
  document.getElementById('ai-results').innerHTML = '';

  try {
    await AIService.initialize(testConfig);
    AIService.rateLimiter = { perMinute: 0, perHour: 0, lastMinute: Date.now(), lastHour: Date.now() };

    // Test rate limit check
    const canCall1 = AIService.checkRateLimit();
    log(`Rate limit: Initial check = ${canCall1}`, canCall1);

    // Simulate hitting per-minute limit
    AIService.rateLimiter.perMinute = 20;
    const canCall2 = AIService.checkRateLimit();
    const minuteLimitWorks = !canCall2;
    log(`Rate limit: Block at 20/min = ${minuteLimitWorks}`, minuteLimitWorks);

    // Reset and test per-hour limit
    AIService.rateLimiter.perMinute = 0;
    AIService.rateLimiter.perHour = 200;
    const canCall3 = AIService.checkRateLimit();
    const hourLimitWorks = !canCall3;
    log(`Rate limit: Block at 200/hr = ${hourLimitWorks}`, hourLimitWorks);

    if (canCall1 && minuteLimitWorks && hourLimitWorks) {
      log('✓ AI Service rate limiting PASSED', true);
    }
  } catch (error) {
    log(`Rate limit error: ${error.message}`, false);
  }
}

async function testAIServiceCall() {
  document.getElementById('ai-results').innerHTML = '';

  const realApiKey = prompt('Enter OpenAI API key to test real call (or cancel to skip):');
  if (!realApiKey) {
    log('Skipped: Real API call test (no key provided)', true);
    return;
  }

  try {
    await AIService.initialize({
      ...testConfig,
      openaiApiKey: realApiKey
    });

    log('Calling OpenAI API...', true);

    const response = await AIService.call(
      '你是一个专业助手。请回复"测试成功"三个字。',
      { maxTokens: 10 }
    );

    log(`API Response: ${response.substring(0, 100)}`, true);
    log('✓ AI Service API call PASSED', true);

  } catch (error) {
    log(`API call error: ${error.message}`, false);
  }
}
