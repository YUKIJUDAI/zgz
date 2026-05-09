/**
 * Node.js test runner for Job Score Cache
 * Mocks chrome.storage.local API and BossUtils
 */

// Mock chrome.storage.local API
global.chrome = {
  storage: {
    local: {
      _data: {},
      get: function(keys, callback) {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (this._data[key] !== undefined) {
              result[key] = this._data[key];
            }
          });
        } else if (typeof keys === 'string') {
          if (this._data[keys] !== undefined) {
            result[keys] = this._data[keys];
          }
        }
        callback(result);
      },
      set: function(items, callback) {
        Object.assign(this._data, items);
        if (callback) callback();
      },
      remove: function(keys, callback) {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach(key => {
          delete this._data[key];
        });
        if (callback) callback();
      },
      clear: function(callback) {
        this._data = {};
        if (callback) callback();
      }
    }
  }
};

// Mock BossUtils
global.BossUtils = {
  log: (level, message, data) => {
    // Silent during tests unless there's an error
    if (level === 'error') {
      console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }
  }
};

// Load the cache module
const fs = require('fs');
const path = require('path');
const cacheModuleCode = fs.readFileSync(path.join(__dirname, '../lib/score-cache.js'), 'utf8');

// Execute in global context
const vm = require('vm');
vm.runInThisContext(cacheModuleCode);

// Load and run tests
const testCode = fs.readFileSync(path.join(__dirname, 'test-score-cache.js'), 'utf8');
vm.runInThisContext(testCode);
