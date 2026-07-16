(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- Radar Chart: personal-agent 能力成熟度 ---
  var radarChart = echarts.init(document.getElementById('chart-radar'), null, { renderer: 'svg' });

  var indicators = [
    { name: 'SDD 工作流', max: 5 },
    { name: 'System Prompt', max: 5 },
    { name: 'Tools / Skills', max: 5 },
    { name: 'Context 工程', max: 5 },
    { name: 'Subagents 并行', max: 5 },
    { name: '安全网 (Permission/Hooks)', max: 5 },
    { name: 'Headless / CLI', max: 5 },
    { name: 'MCP 集成', max: 5 },
    { name: 'Memory 记忆', max: 5 },
    { name: 'RAG / 知识检索', max: 5 },
    { name: '可观测性', max: 5 },
    { name: '多 LLM 架构', max: 5 },
    { name: 'Web UI / 多用户', max: 5 }
  ];

  var option = {
    animation: false,
    tooltip: {
      appendToBody: true,
      trigger: 'item'
    },
    legend: {
      data: ['personal-agent 当前', '课程体系覆盖'],
      bottom: 0,
      textStyle: { color: ink, fontSize: 13 }
    },
    radar: {
      center: ['50%', '46%'],
      radius: '68%',
      indicator: indicators,
      axisName: {
        color: muted,
        fontSize: 12,
        borderRadius: 3,
        padding: [3, 5]
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(37,99,235,0.02)', 'rgba(37,99,235,0.02)', 'rgba(37,99,235,0.02)', 'rgba(37,99,235,0.02)']
        }
      },
      splitLine: { lineStyle: { color: rule } },
      axisLine: { lineStyle: { color: rule } }
    },
    series: [
      {
        name: 'personal-agent 当前',
        type: 'radar',
        data: [
          {
            value: [0.5, 3.5, 4.5, 3.5, 2, 1.5, 0, 0, 4.5, 4.5, 4, 4.5, 4.5],
            name: 'personal-agent 当前',
            areaStyle: { color: accent + '33' },
            lineStyle: { color: accent, width: 2 },
            itemStyle: { color: accent },
            symbol: 'circle',
            symbolSize: 6
          }
        ]
      },
      {
        name: '课程体系覆盖',
        type: 'radar',
        data: [
          {
            value: [5, 5, 4.5, 3, 5, 5, 4.5, 4.5, 3, 2, 3, 2, 1],
            name: '课程体系覆盖',
            areaStyle: { color: accent2 + '22' },
            lineStyle: { color: accent2, width: 2, type: 'dashed' },
            itemStyle: { color: accent2 },
            symbol: 'diamond',
            symbolSize: 6
          }
        ]
      }
    ]
  };

  radarChart.setOption(option);
  window.addEventListener('resize', function() { radarChart.resize(); });
})();