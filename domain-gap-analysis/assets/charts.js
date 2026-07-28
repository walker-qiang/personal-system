(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var domainCode = style.getPropertyValue('--domain-code').trim();
  var domainInvest = style.getPropertyValue('--domain-invest').trim();
  var domainKm = style.getPropertyValue('--domain-km').trim();

  // --- Chart 1: Heatmap (差距 × 领域重要性热力图) ---
  var heatmapEl = document.getElementById('chart-heatmap');
  if (heatmapEl) {
    var chartHeat = echarts.init(heatmapEl, null, { renderer: 'svg' });

    var xData = ['编程', '投资', '知识管理'];
    // Labels from the report
    var yData = [
      '上下文工程',
      '长期记忆进化',
      '并行 SubAgent',
      'Hooks 事件系统',
      '插件生态',
      'Slash Commands',
      'PTC 工具调用',
      '高级可观测性',
      'A2A 协议'
    ];

    // Data: [xIndex, yIndex, value]
    var data = [
      [0, 0, 5], [1, 0, 4], [2, 0, 5],  // 上下文工程: 编程5, 投资4, 知识5
      [0, 1, 3], [1, 1, 5], [2, 1, 5],  // 长期记忆: 编程3, 投资5, 知识5
      [0, 2, 4], [1, 2, 5], [2, 2, 3],  // 并行SubAgent: 编程4, 投资5, 知识3
      [0, 3, 5], [1, 3, 3], [2, 3, 3],  // Hooks: 编程5, 投资3, 知识3
      [0, 4, 5], [1, 4, 4], [2, 4, 4],  // 插件: 编程5, 投资4, 知识4
      [0, 5, 5], [1, 5, 2], [2, 5, 2],  // Slash: 编程5, 投资2, 知识2
      [0, 6, 4], [1, 6, 3], [2, 6, 3],  // PTC: 编程4, 投资3, 知识3
      [0, 7, 4], [1, 7, 3], [2, 7, 3],  // 可观测性: 编程4, 投资3, 知识3
      [0, 8, 2], [1, 8, 3], [2, 8, 2]   // A2A: 编程2, 投资3, 知识2
    ];

    chartHeat.setOption({
      animation: false,
      tooltip: {
        appendToBody: true,
        formatter: function(p) {
          var labels = ['低', '较低', '中等', '重要', '关键'];
          return yData[p.value[1]] + ' × ' + xData[p.value[0]] + '<br/>重要性: <strong>' + labels[p.value[2] - 1] + '</strong> (' + p.value[2] + '/5)';
        }
      },
      grid: {
        left: 140,
        right: 60,
        top: 10,
        bottom: 30
      },
      xAxis: {
        type: 'category',
        data: xData,
        splitArea: { show: false },
        axisLabel: { color: ink, fontSize: 13, fontWeight: 600 },
        axisLine: { lineStyle: { color: rule } }
      },
      yAxis: {
        type: 'category',
        data: yData,
        splitArea: { show: false },
        axisLabel: { color: ink, fontSize: 12 },
        axisLine: { lineStyle: { color: rule } }
      },
      visualMap: {
        min: 1,
        max: 5,
        calculable: false,
        orient: 'vertical',
        right: 0,
        top: 'center',
        textStyle: { color: muted, fontSize: 11 },
        inRange: {
          color: [bg2, accent2 + 'cc', accent]
        },
        outOfRange: { color: 'transparent' },
        itemWidth: 12,
        itemHeight: 120
      },
      series: [{
        type: 'heatmap',
        data: data,
        label: {
          show: true,
          color: function(p) { return p.value[2] >= 4 ? '#fff' : ink; },
          fontSize: 13,
          fontWeight: 700,
          formatter: function(p) {
            var labels = ['★', '★★', '★★★', '★★★★', '★★★★★'];
            return labels[p.value[2] - 1];
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.15)'
          }
        }
      }]
    });

    window.addEventListener('resize', function() { chartHeat.resize(); });
  }

  // --- Chart 2: Radar (领域能力需求对比) ---
  var radarEl = document.getElementById('chart-radar');
  if (radarEl) {
    var chartRadar = echarts.init(radarEl, null, { renderer: 'svg' });

    chartRadar.setOption({
      animation: false,
      tooltip: { appendToBody: true },
      legend: {
        bottom: 0,
        textStyle: { color: ink, fontSize: 12 },
        data: ['编程', '投资', '知识管理']
      },
      radar: {
        center: ['50%', '52%'],
        radius: '65%',
        indicator: [
          { name: '上下文工程', max: 5 },
          { name: '长期记忆', max: 5 },
          { name: '并行SubAgent', max: 5 },
          { name: 'Hooks', max: 5 },
          { name: '插件生态', max: 5 },
          { name: 'Slash Commands', max: 5 },
          { name: 'PTC', max: 5 },
          { name: '可观测性', max: 5 },
          { name: 'A2A', max: 5 }
        ],
        axisName: { color: muted, fontSize: 11 },
        splitArea: { areaStyle: { color: [bg2, 'transparent'] } },
        splitLine: { lineStyle: { color: rule } },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'radar',
        name: '编程',
        data: [{ value: [5, 3, 4, 5, 5, 5, 4, 4, 2], name: '编程' }],
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: domainCode, width: 2 },
        areaStyle: { color: domainCode + '20' },
        itemStyle: { color: domainCode }
      }, {
        type: 'radar',
        name: '投资',
        data: [{ value: [4, 5, 5, 3, 4, 2, 3, 3, 3], name: '投资' }],
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: domainInvest, width: 2 },
        areaStyle: { color: domainInvest + '20' },
        itemStyle: { color: domainInvest }
      }, {
        type: 'radar',
        name: '知识管理',
        data: [{ value: [5, 5, 3, 3, 4, 2, 3, 3, 2], name: '知识管理' }],
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: domainKm, width: 2 },
        areaStyle: { color: domainKm + '20' },
        itemStyle: { color: domainKm }
      }]
    });

    window.addEventListener('resize', function() { chartRadar.resize(); });
  }
})();