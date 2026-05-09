/**
 * 超简化测试版本 - 用于诊断问题
 */

console.log('popup-test.js 开始加载');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded 触发');

  // 测试标签切换
  const tabBtns = document.querySelectorAll('.tab-btn');
  console.log('找到标签按钮数量:', tabBtns.length);

  tabBtns.forEach((btn, index) => {
    console.log(`标签按钮 ${index}:`, btn.dataset.tab);
    btn.addEventListener('click', () => {
      console.log(`标签按钮 ${btn.dataset.tab} 被点击`);
      alert(`标签 ${btn.dataset.tab} 被点击了！`);
    });
  });

  // 测试操作按钮
  const btnOpenBoss = document.getElementById('btnOpenBoss');
  console.log('btnOpenBoss:', btnOpenBoss);

  if (btnOpenBoss) {
    btnOpenBoss.addEventListener('click', () => {
      console.log('btnOpenBoss 被点击');
      alert('打开Boss直聘按钮被点击了！');
    });
  } else {
    console.error('找不到 btnOpenBoss 元素！');
  }

  const btnRefresh = document.getElementById('btnRefresh');
  console.log('btnRefresh:', btnRefresh);

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      console.log('btnRefresh 被点击');
      alert('刷新统计按钮被点击了！');
    });
  } else {
    console.error('找不到 btnRefresh 元素！');
  }

  console.log('✓ 测试版本初始化完成');
});

console.log('popup-test.js 加载完成');
