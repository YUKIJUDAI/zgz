/**
 * Job Score Cache Management Module
 * 职位评分缓存管理模块
 *
 * Manages cached job scores with LRU eviction and expiry
 */

const JobScoreCache = {
  STORAGE_KEY: 'bossJobScores',
  MAX_ENTRIES: 200,
  CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds

  /**
   * Save preliminary score from job list page
   * 保存列表页初步评分
   *
   * @param {string} jobId - Job ID
   * @param {Object} data - Score data
   * @param {number} data.score - Preliminary score
   * @param {Object} data.details - Score details
   * @param {number} data.details.salaryScore - Salary score
   * @param {number} data.details.locationScore - Location score
   * @param {Object} data.cachedInfo - Job info
   * @param {string} data.cachedInfo.title - Job title
   * @param {string} data.cachedInfo.company - Company name
   * @param {string} data.cachedInfo.salary - Salary range
   * @param {string} data.cachedInfo.location - Location
   */
  async savePreliminaryScore(jobId, data) {
    try {
      const scores = await this._loadAll();
      const now = Date.now();

      scores[jobId] = {
        jobId,
        preliminaryScore: {
          score: data.score,
          details: data.details,
          timestamp: now,
          source: 'job-list'
        },
        cachedInfo: data.cachedInfo,
        lastUpdated: now,
        lastAccessed: now
      };

      // Keep accurate score if it exists
      const existing = scores[jobId];
      if (existing && existing.accurateScore) {
        scores[jobId].accurateScore = existing.accurateScore;
      }

      await this._saveAll(scores);

      if (typeof BossUtils !== 'undefined') {
        BossUtils.log('info', `Saved preliminary score for job ${jobId}`, { score: data.score });
      }
    } catch (error) {
      if (typeof BossUtils !== 'undefined') {
        BossUtils.log('error', 'Failed to save preliminary score', error);
      }
      throw error;
    }
  },

  /**
   * Save accurate score from job detail page
   * 保存详情页精确评分
   *
   * @param {string} jobId - Job ID
   * @param {Object} data - Score data
   * @param {number} data.score - Accurate score
   * @param {Object} data.details - Score details
   * @param {number} data.details.skillScore - Skill match score
   * @param {number} data.details.bonusScore - Bonus criteria score
   * @param {number} data.details.salaryScore - Salary score
   * @param {number} data.details.locationScore - Location score
   * @param {number} data.details.titleScore - Title score
   * @param {boolean} data.hasFullDescription - Whether full description was available
   */
  async saveAccurateScore(jobId, data) {
    try {
      const scores = await this._loadAll();
      const now = Date.now();

      // If no preliminary score exists, create minimal entry
      if (!scores[jobId]) {
        scores[jobId] = {
          jobId,
          cachedInfo: {},
          lastUpdated: now,
          lastAccessed: now
        };
      }

      scores[jobId].accurateScore = {
        score: data.score,
        details: data.details,
        timestamp: now,
        source: 'job-detail',
        hasFullDescription: data.hasFullDescription
      };

      scores[jobId].lastUpdated = now;
      scores[jobId].lastAccessed = now;

      await this._saveAll(scores);

      if (typeof BossUtils !== 'undefined') {
        BossUtils.log('info', `Saved accurate score for job ${jobId}`, { score: data.score });
      }
    } catch (error) {
      if (typeof BossUtils !== 'undefined') {
        BossUtils.log('error', 'Failed to save accurate score', error);
      }
      throw error;
    }
  },

  /**
   * Load cached score for a job
   * 加载职位评分缓存
   *
   * @param {string} jobId - Job ID
   * @returns {Promise<Object|null>} Cached score data or null if expired/not found
   */
  async load(jobId) {
    try {
      const scores = await this._loadAll();
      const score = scores[jobId];

      if (!score) {
        return null;
      }

      // Check if expired
      const age = Date.now() - score.lastUpdated;
      if (age > this.CACHE_EXPIRY) {
        // Remove expired entry
        delete scores[jobId];
        await this._saveAll(scores);
        return null;
      }

      // Update last accessed time
      score.lastAccessed = Date.now();
      await this._saveAll(scores);

      return score;
    } catch (error) {
      if (typeof BossUtils !== 'undefined') {
        BossUtils.log('error', 'Failed to load score', error);
      }
      return null;
    }
  },

  /**
   * Load all scores from storage
   * 从存储中加载所有评分
   *
   * @private
   * @returns {Promise<Object>} All cached scores
   */
  async _loadAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.STORAGE_KEY], (result) => {
        resolve(result[this.STORAGE_KEY] || {});
      });
    });
  },

  /**
   * Save all scores to storage with LRU eviction
   * 保存所有评分到存储（带LRU淘汰策略）
   *
   * @private
   * @param {Object} scores - All scores to save
   */
  async _saveAll(scores) {
    return new Promise((resolve) => {
      let scoresToSave = scores;

      // Apply LRU eviction if exceeding max entries
      const entries = Object.values(scoresToSave);
      if (entries.length > this.MAX_ENTRIES) {
        // Sort by lastAccessed (most recent first)
        entries.sort((a, b) => b.lastAccessed - a.lastAccessed);

        // Keep only the most recent MAX_ENTRIES
        const keptEntries = entries.slice(0, this.MAX_ENTRIES);
        scoresToSave = {};
        keptEntries.forEach(entry => {
          scoresToSave[entry.jobId] = entry;
        });

        if (typeof BossUtils !== 'undefined') {
          BossUtils.log('info', `LRU eviction: kept ${this.MAX_ENTRIES} of ${entries.length} entries`);
        }
      }

      chrome.storage.local.set(
        { [this.STORAGE_KEY]: scoresToSave },
        resolve
      );
    });
  },

  /**
   * Clear all cached scores
   * 清除所有缓存评分
   */
  async clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: {} }, () => {
        if (typeof BossUtils !== 'undefined') {
          BossUtils.log('info', 'Cleared all cached scores');
        }
        resolve();
      });
    });
  }
};

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JobScoreCache;
}
