/**
 * Boss直聘求职助手 - 地点距离评估系统
 * 混合方案: 地图API精确评估 + 区域粗略评估
 */

const DistanceEvaluator = {
  config: null,
  cache: new Map(),

  // 杭州区域距离映射表
  HANGZHOU_DISTANCE_MAP: {
    '西湖': { neighbors: ['拱墅', '上城', '滨江', '余杭'], far: ['萧山', '临平', '钱塘'], veryFar: [] },
    '拱墅': { neighbors: ['西湖', '余杭', '上城', '临平'], far: ['滨江', '萧山', '钱塘'], veryFar: [] },
    '上城': { neighbors: ['西湖', '拱墅', '滨江', '钱塘'], far: ['萧山', '余杭'], veryFar: [] },
    '滨江': { neighbors: ['西湖', '上城', '萧山'], far: ['拱墅', '余杭', '钱塘'], veryFar: [] },
    '余杭': { neighbors: ['西湖', '拱墅', '临平'], far: ['上城', '滨江', '萧山'], veryFar: ['钱塘'] },
    '萧山': { neighbors: ['滨江', '钱塘'], far: ['上城', '西湖', '拱墅', '余杭'], veryFar: ['临平'] },
    '临平': { neighbors: ['拱墅', '余杭'], far: ['西湖', '上城'], veryFar: ['滨江', '萧山', '钱塘'] },
    '钱塘': { neighbors: ['上城', '萧山'], far: ['滨江', '拱墅'], veryFar: ['西湖', '余杭', '临平'] },
    '富阳': { veryFar: ['西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘'] },
    '临安': { veryFar: ['西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘'] },
    '桐庐': { veryFar: ['西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘'] },
    '建德': { veryFar: ['西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘'] },
    '淳安': { veryFar: ['西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘'] }
  },

  /**
   * 初始化距离评估器
   */
  async initialize(config) {
    this.config = {
      gaodeApiKey: config.gaodeApiKey || '',
      homeAddress: config.homeAddress || '',
      homeLocation: null,
      maxCommuteTime: config.maxCommuteTime || 60,
      maxDistance: config.maxDistance || 20000,
      enableMapAPI: config.enableMapAPI !== false,
      preferredAreas: config.preferredAreas || ['西湖', '拱墅', '余杭'],
      maxDistanceLevel: config.maxDistanceLevel || 2,
      cacheExpiry: 7 * 24 * 60 * 60 * 1000  // 7天
    };

    BossUtils.log('info', `距离评估器初始化: Map API=${this.config.enableMapAPI}, 家庭地址=${this.config.homeAddress}`);
    return true;
  },

  /**
   * 混合评估入口
   */
  async evaluate(jobLocation, jobAddress) {
    // 优先尝试地图API精确评估
    if (this.config.enableMapAPI && jobAddress) {
      const mapResult = await this.evaluateWithMapAPI(jobLocation, jobAddress);
      if (mapResult) {
        return mapResult;
      }
      BossUtils.log('debug', '地图API评估失败，降级到区域评估');
    }

    // 降级到区域评估
    return this.evaluateByRegion(jobLocation, this.config.preferredAreas);
  },

  /**
   * 地图API精确评估
   */
  async evaluateWithMapAPI(jobLocation, jobAddress) {
    if (!this.config.enableMapAPI || !this.config.gaodeApiKey) {
      return null;
    }

    try {
      // 1. 获取家庭坐标
      const homeCoords = await this.getHomeCoordinates();
      if (!homeCoords) {
        return null;
      }

      // 2. 获取职位坐标
      const jobCoords = await this.getJobCoordinates(jobLocation, jobAddress);
      if (!jobCoords) {
        return null;
      }

      // 3. 计算距离和通勤时间
      const result = await this.calculateDistance(homeCoords, jobCoords);

      return this.classifyDistance(result);
    } catch (error) {
      BossUtils.log('warn', '地图API评估失败', error.message);
      return null;
    }
  },

  /**
   * 获取家庭坐标
   */
  async getHomeCoordinates() {
    if (this.config.homeLocation) {
      return this.config.homeLocation;
    }

    if (!this.config.homeAddress) {
      return null;
    }

    // 检查缓存
    const cacheKey = `geocode:${this.config.homeAddress}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheExpiry) {
      this.config.homeLocation = cached.location;
      return cached.location;
    }

    // 调用地理编码
    const location = await this.geocode(this.config.homeAddress);
    if (location) {
      this.config.homeLocation = location;
      this.cache.set(cacheKey, { location, timestamp: Date.now() });
    }

    return location;
  },

  /**
   * 获取职位坐标
   */
  async getJobCoordinates(jobLocation, jobAddress) {
    const address = jobAddress || jobLocation;
    if (!address) return null;

    // 检查缓存
    const cacheKey = `geocode:${address}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheExpiry) {
      return cached.location;
    }

    // 调用地理编码
    const location = await this.geocode(address);
    if (location) {
      this.cache.set(cacheKey, { location, timestamp: Date.now() });
    }

    return location;
  },

  /**
   * 地理编码: 地址 → 坐标
   */
  async geocode(address) {
    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${this.config.gaodeApiKey}&city=杭州`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const coords = data.geocodes[0].location.split(',');
        return {
          lng: parseFloat(coords[0]),
          lat: parseFloat(coords[1]),
          formattedAddress: data.geocodes[0].formatted_address
        };
      }

      return null;
    } catch (error) {
      BossUtils.log('error', '地理编码失败', error.message);
      return null;
    }
  },

  /**
   * 计算距离和通勤时间
   */
  async calculateDistance(origin, destination) {
    // 检查缓存
    const cacheKey = `distance:${origin.lng},${origin.lat}-${destination.lng},${destination.lat}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheExpiry) {
      return cached.result;
    }

    // 1. 计算直线距离
    const straightDistance = this.calculateStraightDistance(origin, destination);

    // 2. 调用路径规划API
    const url = `https://restapi.amap.com/v3/direction/transit/integrated?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&city=杭州&key=${this.config.gaodeApiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      let commuteTime = null;
      let transitDistance = null;

      if (data.status === '1' && data.route && data.route.transits && data.route.transits.length > 0) {
        const bestRoute = data.route.transits[0];
        commuteTime = Math.round(bestRoute.duration / 60);
        transitDistance = bestRoute.distance;
      }

      const result = {
        straightDistance,
        transitDistance,
        commuteTime,
        method: 'transit'
      };

      this.cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      BossUtils.log('error', '路径规划失败', error.message);
      return {
        straightDistance,
        transitDistance: null,
        commuteTime: null,
        method: 'straight'
      };
    }
  },

  /**
   * 计算两点直线距离 (Haversine公式)
   */
  calculateStraightDistance(origin, destination) {
    const R = 6371e3;
    const φ1 = origin.lat * Math.PI / 180;
    const φ2 = destination.lat * Math.PI / 180;
    const Δφ = (destination.lat - origin.lat) * Math.PI / 180;
    const Δλ = (destination.lng - origin.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);
  },

  /**
   * 距离分类和评分
   */
  classifyDistance(distanceResult) {
    const { straightDistance, transitDistance, commuteTime } = distanceResult;

    // 优先使用通勤时间
    if (commuteTime !== null) {
      if (commuteTime <= 20) {
        return {
          acceptable: true,
          distanceLevel: 0,
          score: 10,
          reason: `通勤${commuteTime}分钟，非常近`,
          detail: `公交/地铁${Math.round(transitDistance/1000)}km，约${commuteTime}分钟`,
          method: 'mapapi'
        };
      } else if (commuteTime <= 30) {
        return {
          acceptable: true,
          distanceLevel: 1,
          score: 8,
          reason: `通勤${commuteTime}分钟，可接受`,
          detail: `公交/地铁${Math.round(transitDistance/1000)}km，约${commuteTime}分钟`,
          method: 'mapapi'
        };
      } else if (commuteTime <= 45) {
        return {
          acceptable: true,
          distanceLevel: 2,
          score: 6,
          reason: `通勤${commuteTime}分钟，稍远`,
          detail: `公交/地铁${Math.round(transitDistance/1000)}km，约${commuteTime}分钟`,
          method: 'mapapi'
        };
      } else if (commuteTime <= 60) {
        const acceptable = this.config.maxCommuteTime >= 60;
        return {
          acceptable,
          distanceLevel: 3,
          score: acceptable ? 3 : 0,
          reason: acceptable ? `通勤${commuteTime}分钟，较远但可接受` : `通勤${commuteTime}分钟，过远`,
          detail: `公交/地铁${Math.round(transitDistance/1000)}km，约${commuteTime}分钟`,
          method: 'mapapi'
        };
      } else {
        return {
          acceptable: false,
          distanceLevel: 4,
          score: 0,
          reason: `通勤${commuteTime}分钟，太远`,
          detail: `公交/地铁${Math.round(transitDistance/1000)}km，约${commuteTime}分钟`,
          method: 'mapapi'
        };
      }
    }

    // 降级: 使用直线距离
    const distanceKm = straightDistance / 1000;
    if (straightDistance <= 5000) {
      return { acceptable: true, distanceLevel: 0, score: 10, reason: `直线距离${distanceKm.toFixed(1)}km`, method: 'straight' };
    } else if (straightDistance <= 10000) {
      return { acceptable: true, distanceLevel: 1, score: 8, reason: `直线距离${distanceKm.toFixed(1)}km`, method: 'straight' };
    } else if (straightDistance <= 15000) {
      return { acceptable: true, distanceLevel: 2, score: 6, reason: `直线距离${distanceKm.toFixed(1)}km`, method: 'straight' };
    } else if (straightDistance <= 20000) {
      const acceptable = this.config.maxDistance >= 20000;
      return { acceptable, distanceLevel: 3, score: acceptable ? 3 : 0, reason: `直线距离${distanceKm.toFixed(1)}km`, method: 'straight' };
    } else {
      return { acceptable: false, distanceLevel: 4, score: 0, reason: `直线距离${distanceKm.toFixed(1)}km，太远`, method: 'straight' };
    }
  },

  /**
   * 区域粗略评估（降级方案）
   */
  evaluateByRegion(jobLocation, preferredAreas) {
    const area = this.extractArea(jobLocation);

    if (!area) {
      return { acceptable: true, distanceLevel: -1, score: 5, reason: '无法识别区域', method: 'region' };
    }

    // 检查是否在期望区域内
    if (preferredAreas.some(preferred => area.includes(preferred) || preferred.includes(area))) {
      return { acceptable: true, distanceLevel: 0, score: 10, reason: '期望工作区域', method: 'region' };
    }

    // 检查是否在邻近区域
    for (const preferred of preferredAreas) {
      const distanceInfo = this.HANGZHOU_DISTANCE_MAP[preferred];
      if (distanceInfo?.neighbors?.some(neighbor => area.includes(neighbor))) {
        return { acceptable: true, distanceLevel: 1, score: 8, reason: '邻近区域，通勤便利', method: 'region' };
      }
    }

    // 检查是否在较远区域
    for (const preferred of preferredAreas) {
      const distanceInfo = this.HANGZHOU_DISTANCE_MAP[preferred];
      if (distanceInfo?.far?.some(far => area.includes(far))) {
        const acceptable = this.config.maxDistanceLevel >= 2;
        return {
          acceptable,
          distanceLevel: 2,
          score: acceptable ? 5 : 0,
          reason: acceptable ? '较远区域，通勤时间较长' : '通勤距离过远',
          method: 'region'
        };
      }
    }

    // 检查是否在很远区域
    for (const preferred of preferredAreas) {
      const distanceInfo = this.HANGZHOU_DISTANCE_MAP[preferred];
      if (distanceInfo?.veryFar?.some(veryFar => area.includes(veryFar))) {
        return { acceptable: false, distanceLevel: 3, score: 0, reason: '通勤距离太远，一票否决', method: 'region' };
      }
    }

    // 未知区域
    if (!jobLocation.includes('杭州')) {
      return { acceptable: false, distanceLevel: 3, score: 0, reason: '非杭州地区', method: 'region' };
    }

    return { acceptable: true, distanceLevel: 2, score: 5, reason: '杭州市内', method: 'region' };
  },

  /**
   * 提取区域名称
   */
  extractArea(location) {
    if (!location) return null;

    const areaPatterns = [
      '西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘',
      '富阳', '临安', '桐庐', '建德', '淳安'
    ];

    for (const area of areaPatterns) {
      if (location.includes(area)) {
        return area;
      }
    }

    return null;
  }
};
