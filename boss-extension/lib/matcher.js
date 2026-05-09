/**
 * Boss直聘求职助手 - 职位匹配评分引擎
 * 作者：金超宇
 */

const JobMatcher = {
  /**
   * 获取评分配置
   */
  getScoringConfig() {
    if (typeof BossConfig !== 'undefined') {
      return BossConfig.scoring;
    }
    // 降级配置
    return {
      maxScores: { skill: 50, bonus: 20, salary: 15, location: 10, title: 5 },
      bonusSkillScore: 5,
      salary: { minMatch: 15, maxMatch: 10, noMatch: 0, unknown: 7.5 },
    };
  },

  /**
   * 对职位进行匹配评分
   * @param {Object} jobInfo - 职位信息
   * @param {Object} config - 用户配置
   * @returns {Object} { passed, score, details }
   */
  match(jobInfo, config) {
    const details = {};
    let score = 0;
    const scoringConfig = this.getScoringConfig();

    // 1. 排除关键词检测（一票否决）
    const exclusionScore = this.checkExclusions(jobInfo, config);
    if (exclusionScore < 0) {
      BossUtils.log('info', `❌ [${jobInfo.company}] ${jobInfo.title} — 命中排除关键词`);
      return { passed: false, score: 0, details: { excluded: true } };
    }

    // 2. 技能匹配（使用配置的最高分）
    const skillScore = this.scoreSkills(jobInfo, config, scoringConfig.maxScores.skill);
    score += skillScore;
    details.skillScore = Math.round(skillScore);

    // 3. 加分技能（使用配置的最高分）
    const bonusScore = this.scoreBonus(jobInfo, config, scoringConfig.maxScores.bonus, scoringConfig.bonusSkillScore);
    score += bonusScore;
    details.bonusScore = Math.round(bonusScore);

    // 4. 薪资匹配（使用配置的最高分）
    const salaryScore = this.scoreSalary(jobInfo, config, scoringConfig.maxScores.salary, scoringConfig.salary);
    score += salaryScore;
    details.salaryScore = Math.round(salaryScore);

    // 5. 地点匹配（使用配置的最高分）
    const locationScore = this.scoreLocation(jobInfo, config, scoringConfig.maxScores.location);
    score += locationScore;
    details.locationScore = Math.round(locationScore);

    // 6. 职位标题匹配（使用配置的最高分）
    const titleScore = this.scoreTitle(jobInfo, config, scoringConfig.maxScores.title);
    score += titleScore;
    details.titleScore = Math.round(titleScore);

    score = Math.round(score);
    score = Math.min(100, Math.max(0, score));
    details.totalScore = score;
    details.threshold = config.matchThreshold || 60;

    const passed = score >= (config.matchThreshold || 60);

    if (passed) {
      BossUtils.log('info', `✅ [${jobInfo.company}] ${jobInfo.title} — 匹配度 ${score}/100`);
    }

    return { passed, score, details };
  },

  /**
   * 检查排除关键词
   */
  checkExclusions(jobInfo, config) {
    const text = `${jobInfo.title} ${jobInfo.company} ${jobInfo.description || ''} ${(jobInfo.tags || []).join(' ')}`.toLowerCase();
    const excluded = config.excludedKeywords || [];

    for (const keyword of excluded) {
      if (text.includes(keyword.toLowerCase())) {
        BossUtils.log('debug', `  命中排除词: ${keyword}`);
        return -1;
      }
    }
    return 0;
  },

  /**
   * 必需技能评分
   */
  scoreSkills(jobInfo, config, maxScore = 50) {
    // 构建搜索文本：标题 + 描述 + 标签 + 公司名 + 经验要求
    const searchText = [
      jobInfo.title || '',
      jobInfo.description || '',
      jobInfo.company || '',
      jobInfo.experience || '',
      jobInfo.salary || '',
      ...(jobInfo.tags || [])
    ].join(' ').toLowerCase();

    const required = config.requiredSkills || [];

    console.log('[技能匹配]', {
      职位: jobInfo.title,
      搜索文本长度: searchText.length,
      必备技能: required,
      搜索文本预览: searchText.substring(0, 200)
    });

    if (!required.length) {
      console.log('[技能匹配] 没有配置必备技能，给满分');
      return maxScore;
    }

    let matched = 0;
    const matchedSkills = [];
    const unmatchedSkills = [];

    for (const skill of required) {
      if (searchText.includes(skill.toLowerCase())) {
        matched++;
        matchedSkills.push(skill);
      } else {
        unmatchedSkills.push(skill);
      }
    }

    const score = (matched / required.length) * maxScore;

    console.log('[技能匹配] 结果:', {
      匹配: `${matched}/${required.length}`,
      分数: score,
      匹配的技能: matchedSkills,
      未匹配: unmatchedSkills
    });

    return score;
  },

  /**
   * 加分技能评分
   */
  scoreBonus(jobInfo, config, maxScore = 20, scorePerSkill = 5) {
    // 构建搜索文本：标题 + 描述 + 标签 + 公司名 + 经验要求
    const searchText = [
      jobInfo.title || '',
      jobInfo.description || '',
      jobInfo.company || '',
      jobInfo.experience || '',
      jobInfo.salary || '',
      ...(jobInfo.tags || [])
    ].join(' ').toLowerCase();

    const bonus = config.bonusSkills || [];

    if (!bonus.length) return 0;

    let matched = 0;
    const matchedSkills = [];

    for (const skill of bonus) {
      if (searchText.includes(skill.toLowerCase())) {
        matched++;
        matchedSkills.push(skill);
      }
    }

    const score = Math.min(matched * scorePerSkill, maxScore);

    if (matched > 0) {
      console.log('[加分技能]', {
        职位: jobInfo.title,
        匹配数量: matched,
        分数: score,
        匹配的技能: matchedSkills
      });
    }

    return score;
  },

  /**
   * 薪资匹配评分
   */
  scoreSalary(jobInfo, config, maxScore = 15, salaryConfig = null) {
    const sc = salaryConfig || { minMatch: 15, maxMatch: 10, noMatch: 0, unknown: 7.5 };

    if (!config.salaryMin || config.salaryMin <= 0) return maxScore;

    const parsed = BossUtils.parseSalary(jobInfo.salary);
    if (!parsed) return sc.unknown;

    if (parsed.min >= config.salaryMin) return sc.minMatch;
    if (parsed.max >= config.salaryMin) return sc.maxMatch;
    return sc.noMatch;
  },

  /**
   * 地点匹配评分
   */
  scoreLocation(jobInfo, config, maxScore = 10) {
    const locations = config.locations || [];
    if (!locations.length) return maxScore;

    const jobLoc = (jobInfo.location || '').toLowerCase();
    for (const loc of locations) {
      const locLower = loc.toLowerCase();
      if (jobLoc.includes(locLower) || locLower.includes(jobLoc)) {
        return maxScore;
      }
    }
    return 0;
  },

  /**
   * 职位标题匹配评分
   */
  scoreTitle(jobInfo, config, maxScore = 5) {
    const title = (jobInfo.title || '').toLowerCase();
    const required = config.requiredSkills || [];

    for (const skill of required) {
      if (title.includes(skill.toLowerCase())) {
        return maxScore;
      }
    }
    return 0;
  },

  /**
   * 批量匹配职位列表
   */
  async matchBatch(jobs, config) {
    const results = [];
    for (const job of jobs) {
      const result = this.match(job, config);
      if (result.passed) {
        results.push({ ...job, matchResult: result });
      }
      // 每次匹配之间加小延迟，避免阻塞页面
      await BossUtils.randomDelay(50, 150);
    }
    // 按匹配度排序
    results.sort((a, b) => b.matchResult.score - a.matchResult.score);
    return results;
  },
};
