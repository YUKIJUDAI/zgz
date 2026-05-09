/**
 * Distance Evaluator Test Suite
 */

const distanceTestConfig = {
  preferredAreas: ['西湖', '拱墅', '余杭'],
  maxDistanceLevel: 2,
  enableDistanceFilter: true,
  enableMapAPI: true,
  gaodeApiKey: '49a611f338c2835bf94834a973a2e6a5',
  homeAddress: '杭州市拱墅区都市水乡水曲苑',
  maxCommuteTime: 40,
  maxDistance: 8000
};

function logDistance(message, isPass) {
  const results = document.getElementById('distance-results');
  const entry = document.createElement('div');
  entry.className = isPass ? 'pass' : 'fail';
  entry.textContent = `${isPass ? '✓' : '✗'} ${message}`;
  results.appendChild(entry);
}

async function testDistanceInit() {
  document.getElementById('distance-results').innerHTML = '';

  try {
    await DistanceEvaluator.initialize(distanceTestConfig);

    const hasConfig = DistanceEvaluator.config !== null;
    const hasApiKey = DistanceEvaluator.config.gaodeApiKey !== '';
    const hasCache = DistanceEvaluator.cache instanceof Map;

    logDistance(`Initialize: Config set = ${hasConfig}`, hasConfig);
    logDistance(`Initialize: API Key = ${hasApiKey}`, hasApiKey);
    logDistance(`Initialize: Cache created = ${hasCache}`, hasCache);

    if (hasConfig && hasApiKey && hasCache) {
      logDistance('✓ Distance Evaluator initialization PASSED', true);
    }
  } catch (error) {
    logDistance(`Initialize error: ${error.message}`, false);
  }
}

async function testRegionEval() {
  document.getElementById('distance-results').innerHTML = '';

  try {
    await DistanceEvaluator.initialize(distanceTestConfig);

    // Test same region
    const result1 = DistanceEvaluator.evaluateByRegion('杭州·西湖区', distanceTestConfig.preferredAreas);
    const isSameRegion = result1.acceptable && result1.distanceLevel === 0;
    logDistance(`Region: 西湖区 (same) = Level ${result1.distanceLevel}`, isSameRegion);

    // Test neighbor region
    const result2 = DistanceEvaluator.evaluateByRegion('杭州·滨江区', distanceTestConfig.preferredAreas);
    const isNeighbor = result2.acceptable && result2.distanceLevel === 1;
    logDistance(`Region: 滨江区 (neighbor) = Level ${result2.distanceLevel}`, isNeighbor);

    // Test far region
    const result3 = DistanceEvaluator.evaluateByRegion('杭州·萧山区', distanceTestConfig.preferredAreas);
    logDistance(`Region: 萧山区 (far) = Level ${result3.distanceLevel}, acceptable=${result3.acceptable}`, true);

    // Test very far region
    const result4 = DistanceEvaluator.evaluateByRegion('杭州·富阳区', distanceTestConfig.preferredAreas);
    const isVeryFar = !result4.acceptable && result4.distanceLevel === 3;
    logDistance(`Region: 富阳区 (very far) = Level ${result4.distanceLevel}, rejected=${!result4.acceptable}`, isVeryFar);

    if (isSameRegion && isNeighbor && isVeryFar) {
      logDistance('✓ Region evaluation PASSED', true);
    }
  } catch (error) {
    logDistance(`Region eval error: ${error.message}`, false);
  }
}

async function testMapAPIGeocode() {
  document.getElementById('distance-results').innerHTML = '';

  try {
    await DistanceEvaluator.initialize(distanceTestConfig);

    logDistance('Calling Gaode Maps API for geocoding...', true);

    const location = await DistanceEvaluator.geocode('杭州市西湖区文三路');

    const hasLng = location && typeof location.lng === 'number';
    const hasLat = location && typeof location.lat === 'number';
    const inHangzhou = hasLng && location.lng > 119 && location.lng < 121;

    logDistance(`Geocode: Has lng = ${hasLng}`, hasLng);
    logDistance(`Geocode: Has lat = ${hasLat}`, hasLat);
    logDistance(`Geocode: In Hangzhou range = ${inHangzhou}`, inHangzhou);

    if (location) {
      logDistance(`Location: ${location.lng}, ${location.lat}`, true);
      logDistance(`Address: ${location.formattedAddress || 'N/A'}`, true);
    }

    if (hasLng && hasLat && inHangzhou) {
      logDistance('✓ Map API geocoding PASSED', true);
    }
  } catch (error) {
    logDistance(`Geocode error: ${error.message}`, false);
  }
}

async function testMapAPIDistance() {
  document.getElementById('distance-results').innerHTML = '';

  try {
    await DistanceEvaluator.initialize(distanceTestConfig);

    logDistance('Getting home coordinates...', true);
    const homeCoords = await DistanceEvaluator.getHomeCoordinates();

    if (!homeCoords) {
      logDistance('Failed to get home coordinates', false);
      return;
    }

    logDistance(`Home: ${homeCoords.lng}, ${homeCoords.lat}`, true);

    // Test distance to West Lake area
    logDistance('Calculating distance to 杭州市西湖区文三路...', true);
    const jobCoords = await DistanceEvaluator.geocode('杭州市西湖区文三路');

    if (!jobCoords) {
      logDistance('Failed to geocode job location', false);
      return;
    }

    const distanceResult = await DistanceEvaluator.calculateDistance(homeCoords, jobCoords);

    const hasStraight = typeof distanceResult.straightDistance === 'number';
    const hasCommute = distanceResult.commuteTime !== null;

    logDistance(`Straight distance: ${(distanceResult.straightDistance / 1000).toFixed(1)}km`, hasStraight);

    if (hasCommute) {
      logDistance(`Commute time: ${distanceResult.commuteTime} minutes`, true);
      logDistance(`Transit distance: ${(distanceResult.transitDistance / 1000).toFixed(1)}km`, true);
    } else {
      logDistance('Commute time: Not available (API might have failed)', true);
    }

    if (hasStraight) {
      logDistance('✓ Map API distance calculation PASSED', true);
    }
  } catch (error) {
    logDistance(`Distance calc error: ${error.message}`, false);
  }
}

async function testHybridEval() {
  document.getElementById('distance-results').innerHTML = '';

  try {
    await DistanceEvaluator.initialize(distanceTestConfig);

    // Test with detailed address (should use Map API)
    logDistance('Testing hybrid evaluation with detailed address...', true);
    const result1 = await DistanceEvaluator.evaluate('杭州·西湖区', '杭州市西湖区文三路159号');

    logDistance(`Result: acceptable=${result1.acceptable}, level=${result1.distanceLevel}`, true);
    logDistance(`Method: ${result1.method}`, true);
    logDistance(`Reason: ${result1.reason}`, true);
    if (result1.detail) {
      logDistance(`Detail: ${result1.detail}`, true);
    }

    // Test without detailed address (should use region)
    logDistance('\nTesting hybrid evaluation without address (region fallback)...', true);
    const result2 = await DistanceEvaluator.evaluate('杭州·滨江区', null);

    logDistance(`Result: acceptable=${result2.acceptable}, level=${result2.distanceLevel}`, true);
    logDistance(`Method: ${result2.method}`, true);
    logDistance(`Reason: ${result2.reason}`, true);

    const usedMapAPI = result1.method === 'mapapi';
    const usedRegion = result2.method === 'region';

    if (usedMapAPI && usedRegion) {
      logDistance('✓ Hybrid evaluation (Map API + Region fallback) PASSED', true);
    } else {
      logDistance(`Hybrid evaluation partial: mapapi=${usedMapAPI}, region=${usedRegion}`, true);
    }
  } catch (error) {
    logDistance(`Hybrid eval error: ${error.message}`, false);
  }
}
