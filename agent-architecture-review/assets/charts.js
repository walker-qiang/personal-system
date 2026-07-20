(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var amber = style.getPropertyValue('--amber').trim();
  var green = style.getPropertyValue('--green').trim();

  // --- Chart: Priority Matrix (Bubble/Scatter) ---
  var chart1 = echarts.init(document.getElementById('chart-priority'), null, { renderer: 'svg' });
  chart1.setOption({
    animation: false,
    tooltip: {
      appendToBody: true,
      formatter: function(p) {
        return '<strong>' + p.name + '</strong><br/>影响: ' + p.value[0] + '/10<br/>紧迫性: ' + p.value[1] + '/10<br/>当前覆盖: ' + p.value[2] + '%';
      }
    },
    grid: {
      left: 60, right: 30, top: 30, bottom: 50
    },
    xAxis: {
      name: '业务影响 →',
      nameLocation: 'middle',
      nameGap: 30,
      min: 0, max: 10,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } }
    },
    yAxis: {
      name: '紧迫性 →',
      nameLocation: 'middle',
      nameGap: 40,
      min: 0, max: 10,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } }
    },
    series: [
      {
        type: 'scatter',
        symbolSize: function(val) {
          return Math.max(20, (100 - val[2]) * 0.5);
        },
        label: {
          show: true,
          formatter: function(p) { return p.name; },
          position: 'right',
          fontSize: 11,
          color: ink
        },
        itemStyle: {
          color: function(p) {
            var cov = p.value[2];
            if (cov < 20) return accent2;
            if (cov < 50) return amber;
            return accent;
          },
          opacity: 0.85
        },
        data: [
          { name: '评估体系', value: [9, 8, 15] },
          { name: '安全护栏', value: [10, 9, 10] },
          { name: '记忆系统', value: [7, 6, 55] },
          { name: '工具系统', value: [6, 5, 60] },
          { name: '可观测性', value: [7, 6, 55] },
          { name: 'MCP/A2A', value: [5, 7, 0] },
          { name: '提示词管理', value: [4, 4, 30] },
          { name: '结构化输出', value: [5, 4, 25] },
          { name: '技能系统', value: [4, 3, 50] },
          { name: 'Pipeline容错', value: [3, 3, 40] }
        ],
        markLine: {
          silent: true,
          lineStyle: { color: rule, type: 'dashed', width: 1 },
          data: [
            { xAxis: 5, label: { formatter: 'P0区域', color: accent2, fontSize: 11 } },
            { yAxis: 5, label: { formatter: '', color: muted } }
          ]
        }
      }
    ]
  });
  window.addEventListener('resize', function() { chart1.resize(); });
})();