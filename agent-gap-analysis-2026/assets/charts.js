(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var green = style.getPropertyValue('--green').trim();
  var red = style.getPropertyValue('--red').trim();
  var yellow = style.getPropertyValue('--yellow').trim();

  // --- Chart 1: Radar Chart ---
  var radarChart = echarts.init(document.getElementById('chart-radar'), null, { renderer: 'svg' });
  radarChart.setOption({
    animation: false,
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      backgroundColor: bg2,
      borderColor: rule,
      textStyle: { color: ink, fontSize: 12 }
    },
    legend: {
      data: ['Personal-Agent', 'Claude Code', 'OpenAI Codex', 'Manus', 'AutoGen/MAF'],
      bottom: 0,
      textStyle: { color: muted, fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 12
    },
    radar: {
      indicator: [
        { name: '执行环境', max: 5 },
        { name: '浏览器/GUI', max: 5 },
        { name: '上下文管理', max: 5 },
        { name: '记忆系统', max: 5 },
        { name: '安全守卫', max: 5 },
        { name: '自纠正', max: 5 },
        { name: '多Agent协作', max: 5 },
        { name: '规划推理', max: 5 },
        { name: '人机协作', max: 5 },
        { name: '可观测性', max: 5 },
        { name: '成本效率', max: 5 },
        { name: '架构编排', max: 5 }
      ],
      center: ['50%', '48%'],
      radius: '65%',
      axisName: {
        color: ink,
        fontSize: 11
      },
      splitLine: {
        lineStyle: { color: rule, width: 1 }
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(88,166,255,0.02)', 'rgba(88,166,255,0.04)', 'rgba(88,166,255,0.06)', 'rgba(88,166,255,0.08)', 'rgba(88,166,255,0.1)']
        }
      },
      axisLine: {
        lineStyle: { color: rule }
      }
    },
    series: [{
      type: 'radar',
      emphasis: {
        focus: 'series'
      },
      data: [
        {
          value: [1, 1, 5, 4, 5, 3, 3, 3, 4, 4, 3, 4],
          name: 'Personal-Agent',
          areaStyle: { color: 'rgba(240,136,62,0.15)' },
          lineStyle: { color: accent2, width: 2 },
          itemStyle: { color: accent2 },
          symbolSize: 5
        },
        {
          value: [5, 5, 4, 4, 5, 4, 4, 4, 5, 5, 4, 5],
          name: 'Claude Code',
          areaStyle: { color: 'rgba(88,166,255,0.05)' },
          lineStyle: { color: accent, width: 1.5, type: 'dashed' },
          itemStyle: { color: accent },
          symbolSize: 4
        },
        {
          value: [5, 5, 4, 4, 5, 5, 4, 4, 5, 4, 5, 5],
          name: 'OpenAI Codex',
          areaStyle: { color: 'rgba(63,185,80,0.05)' },
          lineStyle: { color: green, width: 1.5, type: 'dashed' },
          itemStyle: { color: green },
          symbolSize: 4
        },
        {
          value: [5, 5, 3, 3, 3, 4, 1, 5, 2, 3, 3, 4],
          name: 'Manus',
          areaStyle: { color: 'rgba(210,153,34,0.04)' },
          lineStyle: { color: yellow, width: 1.5, type: 'dashed' },
          itemStyle: { color: yellow },
          symbolSize: 4
        },
        {
          value: [4, 2, 3, 3, 3, 4, 5, 4, 4, 4, 2, 5],
          name: 'AutoGen/MAF',
          areaStyle: { color: 'rgba(139,148,158,0.04)' },
          lineStyle: { color: muted, width: 1.5, type: 'dashed' },
          itemStyle: { color: muted },
          symbolSize: 4
        }
      ]
    }]
  });
  window.addEventListener('resize', function() { radarChart.resize(); });

  // --- Chart 2: Gap Severity Bar Chart ---
  var gapChart = echarts.init(document.getElementById('chart-gap'), null, { renderer: 'svg' });
  gapChart.setOption({
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      appendToBody: true,
      backgroundColor: bg2,
      borderColor: rule,
      textStyle: { color: ink, fontSize: 12 },
      formatter: function(params) {
        var p = params[0];
        return p.name + '<br/>差距分: ' + p.value + '/5';
      }
    },
    grid: {
      left: '3%',
      right: '6%',
      bottom: '3%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 5,
      interval: 1,
      axisLabel: { color: muted, fontSize: 11 },
      axisLine: { lineStyle: { color: rule } },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: [
        '插件/扩展市场',
        'Trajectory 评估',
        '子 Agent 上下文隔离',
        '并行隔离工作空间',
        '时间旅行调试 UI',
        'Record & Replay',
        'Hooks/中间件架构',
        'Prompt Caching',
        '自动任务分解',
        'Agent 间协作对话',
        '跨会话情景记忆',
        '执行错误自纠正',
        '长程/后台任务',
        '浏览器/GUI 自动化',
        '代码执行沙箱'
      ],
      axisLabel: { color: ink, fontSize: 11 },
      axisLine: { lineStyle: { color: rule } },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: [
        { value: 1, itemStyle: { color: muted } },
        { value: 2, itemStyle: { color: accent } },
        { value: 2, itemStyle: { color: accent } },
        { value: 2, itemStyle: { color: accent } },
        { value: 2, itemStyle: { color: accent } },
        { value: 2, itemStyle: { color: accent } },
        { value: 2, itemStyle: { color: accent } },
        { value: 3, itemStyle: { color: yellow } },
        { value: 3, itemStyle: { color: yellow } },
        { value: 3, itemStyle: { color: yellow } },
        { value: 3, itemStyle: { color: yellow } },
        { value: 3, itemStyle: { color: yellow } },
        { value: 5, itemStyle: { color: red } },
        { value: 5, itemStyle: { color: red } },
        { value: 5, itemStyle: { color: red } }
      ],
      barWidth: '55%',
      label: {
        show: true,
        position: 'right',
        color: muted,
        fontSize: 11,
        formatter: function(params) {
          var v = params.value;
          if (v >= 5) return ' CRITICAL';
          if (v >= 3) return ' HIGH';
          if (v >= 2) return ' MEDIUM';
          return ' LOW';
        }
      }
    }]
  });
  window.addEventListener('resize', function() { gapChart.resize(); });

})();
