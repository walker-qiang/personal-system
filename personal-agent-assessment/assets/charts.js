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

  // --- Chart 1: Radar Chart ---
  var radarDom = document.getElementById('chart-radar');
  if (radarDom) {
    var radarChart = echarts.init(radarDom, null, { renderer: 'svg' });
    radarChart.setOption({
      animation: false,
      tooltip: {
        trigger: 'item',
        appendToBody: true
      },
      legend: {
        data: ['Personal-Agent', 'CrewAI', 'AutoGen', 'LangGraph 最佳实践'],
        bottom: 0,
        textStyle: { color: muted, fontSize: 12 }
      },
      radar: {
        center: ['50%', '45%'],
        radius: '65%',
        indicator: [
          { name: '多 Agent 协作', max: 10 },
          { name: '记忆系统', max: 10 },
          { name: '工具生态', max: 10 },
          { name: '可观测性', max: 10 },
          { name: '安全机制', max: 10 },
          { name: '评估体系', max: 10 },
          { name: 'RAG 支持', max: 10 },
          { name: '多模态', max: 10 },
          { name: '流式体验', max: 10 },
          { name: '代码执行', max: 10 }
        ],
        axisName: { color: muted, fontSize: 11 }
      },
      series: [{
        type: 'radar',
        data: [
          {
            value: [8, 3, 5, 5, 3, 2, 0, 5, 6, 0],
            name: 'Personal-Agent',
            lineStyle: { color: accent, width: 2 },
            areaStyle: { color: accent + '33' },
            itemStyle: { color: accent },
            symbol: 'circle',
            symbolSize: 6
          },
          {
            value: [8, 7, 7, 4, 6, 7, 8, 2, 5, 7],
            name: 'CrewAI',
            lineStyle: { color: success, width: 2, type: 'dashed' },
            areaStyle: { color: 'transparent' },
            itemStyle: { color: success },
            symbol: 'diamond',
            symbolSize: 5
          },
          {
            value: [7, 5, 5, 4, 5, 4, 3, 7, 6, 8],
            name: 'AutoGen',
            lineStyle: { color: warning, width: 2, type: 'dashed' },
            areaStyle: { color: 'transparent' },
            itemStyle: { color: warning },
            symbol: 'triangle',
            symbolSize: 5
          },
          {
            value: [9, 7, 9, 9, 8, 9, 9, 8, 8, 8],
            name: 'LangGraph 最佳实践',
            lineStyle: { color: accent2, width: 2, type: 'dashed' },
            areaStyle: { color: 'transparent' },
            itemStyle: { color: accent2 },
            symbol: 'rect',
            symbolSize: 5
          }
        ]
      }]
    });
    window.addEventListener('resize', function() { radarChart.resize(); });
  }

  // --- Chart 2: Priority Bar Chart ---
  var barDom = document.getElementById('chart-priority');
  if (barDom) {
    var barChart = echarts.init(barDom, null, { renderer: 'svg' });

    var items = [
      { name: '测试覆盖', phase: 'P0', effort: 1, value: 1 },
      { name: 'Markdown 渲染', phase: 'P0', effort: 0.5, value: 0.5 },
      { name: 'XSS 防护', phase: 'P0', effort: 0.5, value: 0.5 },
      { name: '结构化日志', phase: 'P0', effort: 0.5, value: 0.5 },
      { name: 'RAG 集成', phase: 'P1', effort: 3, value: 3 },
      { name: '长期记忆', phase: 'P1', effort: 3, value: 3 },
      { name: 'Human-in-the-Loop', phase: 'P1', effort: 2, value: 2 },
      { name: 'MCP 协议', phase: 'P1', effort: 2, value: 2 },
      { name: '多模态输入', phase: 'P1', effort: 2, value: 2 },
      { name: '评估框架', phase: 'P1', effort: 2, value: 2 },
      { name: '前端重构', phase: 'P2', effort: 4, value: 4 },
      { name: '并行执行', phase: 'P2', effort: 2, value: 2 },
      { name: '动态规划', phase: 'P2', effort: 2, value: 2 },
      { name: 'Agent 动态注册', phase: 'P2', effort: 1.5, value: 1.5 },
      { name: 'Prompt 管理', phase: 'P2', effort: 1, value: 1 },
      { name: 'LLM 缓存', phase: 'P2', effort: 1.5, value: 1.5 },
      { name: '技能升级', phase: 'P2', effort: 2, value: 2 },
      { name: '监控告警', phase: 'P3', effort: 2, value: 2 },
      { name: '优雅关闭', phase: 'P3', effort: 0.5, value: 0.5 },
      { name: '对话分支', phase: 'P3', effort: 2, value: 2 },
      { name: '国际化', phase: 'P3', effort: 1.5, value: 1.5 }
    ];

    var phaseColors = {
      'P0': '#c62828',
      'P1': '#e65100',
      'P2': '#283593',
      'P3': '#2e7d32'
    };

    barChart.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        appendToBody: true,
        formatter: function(params) {
          var d = params[0];
          return d.name + '<br/>预估工作量：' + d.value + ' 周<br/>优先级：' + items[d.dataIndex].phase;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: '预估工作量（周）',
        nameTextStyle: { color: muted, fontSize: 12 },
        axisLabel: { color: muted, fontSize: 11 },
        axisLine: { lineStyle: { color: rule } },
        splitLine: { lineStyle: { color: rule, type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: items.map(function(d) { return d.name; }),
        axisLabel: { color: ink, fontSize: 12 },
        axisLine: { lineStyle: { color: rule } },
        inverse: true
      },
      series: [{
        type: 'bar',
        data: items.map(function(d, i) {
          return {
            value: d.value,
            itemStyle: { color: phaseColors[d.phase] }
          };
        }),
        barMaxWidth: 24,
        label: {
          show: true,
          position: 'right',
          formatter: function(params) {
            return items[params.dataIndex].phase;
          },
          color: muted,
          fontSize: 11,
          fontWeight: 600
        }
      }]
    });
    window.addEventListener('resize', function() { barChart.resize(); });
  }
})();