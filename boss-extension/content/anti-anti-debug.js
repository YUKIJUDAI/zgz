/**
 * 反反调试脚本
 * 用于绕过Boss直聘的反开发者工具检测
 *
 * 此脚本必须在页面脚本之前执行（run_at: document_start）
 */

(function() {
  'use strict';

  console.log('[Boss助手反调试] 开始部署反反调试措施');

  // 1. 禁用所有 debugger 语句
  const originalFunction = Function;
  window.Function = function(...args) {
    const fnStr = args[args.length - 1] || '';
    // 移除代码中的 debugger 语句
    if (typeof fnStr === 'string') {
      args[args.length - 1] = fnStr.replace(/debugger/g, '');
    }
    return originalFunction.apply(this, args);
  };
  window.Function.prototype = originalFunction.prototype;

  // 2. 防止通过检测 console 对象来判断开发者工具是否打开
  const noop = () => {};
  const noopConsole = {
    log: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    trace: noop,
    dir: noop,
    dirxml: noop,
    group: noop,
    groupCollapsed: noop,
    groupEnd: noop,
    time: noop,
    timeEnd: noop,
    timeLog: noop,
    count: noop,
    countReset: noop,
    assert: noop,
    clear: noop,
    table: noop,
    profile: noop,
    profileEnd: noop,
    timeStamp: noop,
  };

  // 保存真实的 console 对象供我们自己使用
  window._realConsole = window.console;

  // 防止网站通过重写 console.log.toString() 来检测
  Object.keys(noopConsole).forEach(key => {
    if (window.console[key]) {
      const original = window.console[key];
      noopConsole[key].toString = function() {
        return original.toString();
      };
    }
  });

  // 3. 防止通过 DevTools 检测器
  // 有些网站会创建一个对象，利用 getter 在 console 展开时触发
  const devtoolsDetector = {
    isOpen: false,
    orientation: undefined
  };

  const checkElement = new Image();
  Object.defineProperty(checkElement, 'id', {
    get: function() {
      devtoolsDetector.isOpen = true;
      return 'devtools-detector';
    }
  });

  // 4. 阻止页面刷新
  const originalReload = window.location.reload;
  window.location.reload = function(...args) {
    console.warn('[Boss助手反调试] 拦截了 location.reload 调用');
    console.trace('[Boss助手反调试] 调用堆栈:');
    // 不执行刷新，除非是我们自己调用的
    if (args[0] === '__boss_assistant_allowed__') {
      return originalReload.call(window.location);
    }
    return;
  };

  // 5. 阻止通过 location.href 刷新
  let isSettingHref = false;
  const originalHrefDescriptor = Object.getOwnPropertyDescriptor(Location.prototype, 'href');

  Object.defineProperty(Location.prototype, 'href', {
    get: function() {
      return originalHrefDescriptor.get.call(this);
    },
    set: function(value) {
      const currentHref = originalHrefDescriptor.get.call(this);
      // 如果设置的值和当前值相同，可能是想刷新页面
      if (value === currentHref && !isSettingHref) {
        console.warn('[Boss助手反调试] 拦截了 location.href 刷新尝试');
        console.trace('[Boss助手反调试] 调用堆栈:');
        return;
      }
      // 允许正常的页面导航
      isSettingHref = true;
      originalHrefDescriptor.set.call(this, value);
      isSettingHref = false;
    }
  });

  // 6. 拦截 setInterval/setTimeout 中的可疑检测代码
  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;

  window.setInterval = function(callback, delay, ...args) {
    // 检查是否是检测 DevTools 的代码
    const callbackStr = callback.toString();
    if (callbackStr.includes('debugger') ||
        callbackStr.includes('devtools') ||
        (callbackStr.includes('outerWidth') && callbackStr.includes('innerWidth')) ||
        (callbackStr.includes('outerHeight') && callbackStr.includes('innerHeight'))) {
      console.warn('[Boss助手反调试] 拦截了可疑的 setInterval 调用');
      // 返回一个假的 interval ID
      return 999999;
    }
    return originalSetInterval.call(window, callback, delay, ...args);
  };

  window.setTimeout = function(callback, delay, ...args) {
    const callbackStr = callback.toString();
    if (callbackStr.includes('debugger') ||
        callbackStr.includes('devtools') ||
        (callbackStr.includes('outerWidth') && callbackStr.includes('innerWidth')) ||
        (callbackStr.includes('outerHeight') && callbackStr.includes('innerHeight'))) {
      console.warn('[Boss助手反调试] 拦截了可疑的 setTimeout 调用');
      return 999999;
    }
    return originalSetTimeout.call(window, callback, delay, ...args);
  };

  // 7. 防止检测窗口尺寸差异
  // 有些网站通过 window.outerHeight - window.innerHeight 来判断是否打开了 DevTools
  const threshold = 160; // DevTools 通常会导致差异大于这个值

  Object.defineProperty(window, 'outerHeight', {
    get: function() {
      const realOuterHeight = window.screen.availHeight;
      const innerHeight = window.innerHeight;
      const diff = realOuterHeight - innerHeight;

      // 如果差异过大，说明可能打开了 DevTools，返回一个接近 innerHeight 的值
      if (diff > threshold) {
        return innerHeight + 100; // 返回一个合理的差异值
      }
      return realOuterHeight;
    }
  });

  Object.defineProperty(window, 'outerWidth', {
    get: function() {
      const realOuterWidth = window.screen.availWidth;
      const innerWidth = window.innerWidth;
      const diff = realOuterWidth - innerWidth;

      if (diff > threshold) {
        return innerWidth + 100;
      }
      return realOuterWidth;
    }
  });

  console.log('[Boss助手反调试] ✓ 反反调试措施部署完成');
  console.log('[Boss助手反调试] - 已禁用 debugger 语句');
  console.log('[Boss助手反调试] - 已拦截 location.reload');
  console.log('[Boss助手反调试] - 已拦截可疑的 timer 调用');
  console.log('[Boss助手反调试] - 已伪装窗口尺寸');

})();
