(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var success = style.getPropertyValue('--success').trim();
  var warning = style.getPropertyValue('--warning').trim();
  var error = style.getPropertyValue('--error').trim();

  // --- Chart 1: Radar (能力雷达对比) ---
  var chartRadar = echarts.init(document.getElementById('chart-radar'), null, { renderer: 'svg' });
  chartRadar.setOption({
    animation: false,
    tooltip: { appendToBody: true },
    legend: {
      bottom: 0,
      textStyle: { color: ink, fontSize: 12 },
      data: ['personal-agent', 'Claude Code']
    },
    radar: {
      center: ['50%', '52%'],
      radius: '65%',
      indicator: [
        { name: '编排能力', max: 10 },
        { name: '工具系统', max: 10 },
        { name: '技能系统', max: 10 },
        { name: '事件/Hooks', max: 10 },
        { name: '插件生态', max: 10 },
        { name: '上下文工程', max: 10 },
        { name: '长期记忆', max: 10 },
        { name: '弹性机制', max: 10 },
        { name: '可观测性', max: 10 },
        { name: '安全模型', max: 10 }
      ],
      axisName: { color: muted, fontSize: 11 },
      splitArea: { areaStyle: { color: [bg2, 'transparent'] } },
      splitLine: { lineStyle: { color: rule } },
      axisLine: { lineStyle: { color: rule } }
    },
    series: [{
      type: 'radar',
      name: 'personal-agent',
      data: [{ value: [8, 7, 7, 0, 0, 4, 6, 9, 5, 9], name: 'personal-agent' }],
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: accent, width: 2 },
      areaStyle: { color: accent + '20' },
      itemStyle: { color: accent }
    }, {
      type: 'radar',
      name: 'Claude Code',
      data: [{ value: [9, 9, 9, 10, 9, 8, 8, 4, 4, 5], name: 'Claude Code' }],
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: accent2, width: 2, type: 'dashed' },
      areaStyle: { color: accent2 + '15' },
      itemStyle: { color: accent2 }
    }]
  });
  window.addEventListener('resize', function() { chartRadar.resize(); });

  // --- Chart 2: Scatter (优先级 × 实施难度) ---
  var chartPriority = echarts.init(document.getElementById('chart-priority'), null, { renderer: 'svg' });

  var scatterData = [
    // P0 items
    { name: 'Hooks 事件系统', value: [3, 8, 5], priority: 'P0' },
    { name: '插件生态', value: [7, 9, 5], priority: 'P0' },
    { name: '并行 SubAgent', value: [5, 7, 4], priority: 'P0' },
    { name: '上下文工程', value: [6, 8, 4], priority: 'P0' },
    // P1 items
    { name: 'Slash Commands', value: [2, 5, 3], priority: 'P1' },
    { name: '记忆进化引擎', value: [4, 6, 3], priority: 'P1' },
    { name: 'A2A 协议', value: [5, 4, 2], priority: 'P1' },
    // P2 items
    { name: 'PTC 工具调用', value: [3, 5, 2], priority: 'P2' },
    { name: '高级可观测性', value: [4, 4, 2], priority: 'P2' }
  ];

  var p0Data = scatterData.filter(function(d) { return d.priority === 'P0'; });
  var p1Data = scatterData.filter(function(d) { return d.priority === 'P1'; });
  var p2Data = scatterData.filter(function(d) { return d.priority === 'P2'; });

  chartPriority.setOption({
    animation: false,
    tooltip: {
      appendToBody: true,
      formatter: function(params) {
        return params.name + '<br/>实施难度: ' + params.value[0] + '/10<br/>业务价值: ' + params.value[1] + '/10<br/>优先级: ' + params.data.priority;
      }
    },
    grid: {
      left: 60, right: 40, top: 50, bottom: 60
    },
    xAxis: {
      name: '实施难度 →',
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: { color: muted, fontSize: 12 },
      min: 0, max: 10,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: rule } }
    },
    yAxis: {
      name: '业务价值 →',
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: { color: muted, fontSize: 12 },
      min: 0, max: 10,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: rule } }
    },
    series: [{
      type: 'scatter',
      name: 'P0',
      data: p0Data,
      symbolSize: function(val) { return val[2] * 10; },
      itemStyle: { color: error, opacity: 0.8 },
      label: {
        show: true,
        formatter: function(p) { return p.name; },
        position: 'right',
        color: ink,
        fontSize: 11,
        distance: 8
      }
    }, {
      type: 'scatter',
      name: 'P1',
      data: p1Data,
      symbolSize: function(val) { return val[2] * 10; },
      itemStyle: { color: warning, opacity: 0.8 },
      label: {
        show: true,
        formatter: function(p) { return p.name; },
        position: 'right',
        color: ink,
        fontSize: 11,
        distance: 8
      }
    }, {
      type: 'scatter',
      name: 'P2',
      data: p2Data,
      symbolSize: function(val) { return val[2] * 10; },
      itemStyle: { color: accent, opacity: 0.8 },
      label: {
        show: true,
        formatter: function(p) { return p.name; },
        position: 'right',
        color: ink,
        fontSize: 11,
        distance: 8
      }
    }]
  });
  window.addEventListener('resize', function() { chartPriority.resize(); });
})();