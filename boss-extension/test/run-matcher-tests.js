/**
 * Node.js test runner for JobMatcher
 * Mocks BossUtils, BossConfig, and necessary APIs
 */

// Mock BossUtils
global.BossUtils = {
  log: (level, message, data) => {
    // Silent during tests unless there's an error
    if (level === 'error') {
      console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }
  },

  parseSalary: function(salaryText) {
    if (!salaryText) return null;

    const text = salaryText.toUpperCase().replace(/[·•]/g, '');

    // 匹配 "15-30K" 或 "25K"
    const match = text.match(/(\d+)(?:-(\d+))?\s*K/);
    if (match) {
      const min = parseInt(match[1]) * 1000;
      const max = match[2] ? parseInt(match[2]) * 1000 : min;
      return { min, max };
    }

    // 匹配纯数字
    const numMatch = text.match(/(\d{4,6})\s*-\s*(\d{4,6})/);
    if (numMatch) {
      return { min: parseInt(numMatch[1]), max: parseInt(numMatch[2]) };
    }

    return null;
  }
};

// Mock BossConfig
global.BossConfig = {
  scoring: {
    maxScores: {
      skill: 50,
      bonus: 20,
      salary: 15,
      location: 10,
      title: 5,
    },
    bonusSkillScore: 5,
    salary: {
      minMatch: 15,
      maxMatch: 10,
      noMatch: 0,
      unknown: 7.5,
    },
  }
};

// Load the matcher module
const fs = require('fs');
const path = require('path');
const matcherModuleCode = fs.readFileSync(path.join(__dirname, '../lib/matcher.js'), 'utf8');

// Execute in global context
const vm = require('vm');
vm.runInThisContext(matcherModuleCode);

// Load and run tests
const testCode = fs.readFileSync(path.join(__dirname, 'test-matcher-preliminary.js'), 'utf8');
vm.runInThisContext(testCode);
