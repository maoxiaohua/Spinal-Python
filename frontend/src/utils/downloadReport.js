/**
 * 报告下载功能
 */

export function downloadReport(data) {
  const html = generateReportHTML(data)
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `脊柱筛查报告_${data.sessionId || Date.now()}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function generateReportHTML(data) {
  const { sessionId, metrics, aiAnalysis, createdAt } = data

  const severityText = {
    balanced: '✅ 平衡',
    attention: '⚠️ 需关注',
    alert: '🚨 高风险'
  }

  const severityColor = {
    balanced: '#4caf50',
    attention: '#ff9800',
    alert: '#f44336'
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>脊柱筛查报告 - ${sessionId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 2rem;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #667eea;
    }
    .header h1 {
      color: #667eea;
      margin-bottom: 0.5rem;
    }
    .header p {
      color: #666;
      font-size: 0.9rem;
    }
    .section {
      margin-bottom: 2rem;
    }
    .section h2 {
      color: #667eea;
      margin-bottom: 1rem;
      border-bottom: 2px solid #667eea;
      padding-bottom: 0.5rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .metric-item {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 8px;
    }
    .metric-item .label {
      font-size: 0.9rem;
      color: #666;
      margin-bottom: 0.5rem;
    }
    .metric-item .value {
      font-size: 1.3rem;
      font-weight: bold;
      color: #333;
    }
    .severity-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      color: white;
      font-weight: bold;
      margin: 1rem 0;
    }
    .ai-content {
      background: #f5f5f5;
      padding: 1.5rem;
      border-radius: 8px;
      white-space: pre-wrap;
      line-height: 1.8;
    }
    .disclaimer {
      background: #fff3e0;
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid #ff9800;
      margin-top: 2rem;
    }
    .disclaimer h4 {
      color: #e65100;
      margin-bottom: 0.5rem;
    }
    .disclaimer ul {
      margin-left: 1.5rem;
      color: #666;
    }
    .disclaimer li {
      margin: 0.5rem 0;
    }
    .footer {
      text-align: center;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #ddd;
      color: #999;
      font-size: 0.9rem;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 脊卫童行</h1>
      <p>儿童脊柱健康筛查报告</p>
      <p>报告编号：${sessionId}</p>
      <p>生成时间：${new Date(createdAt || Date.now()).toLocaleString('zh-CN')}</p>
    </div>

    ${metrics ? `
    <div class="section">
      <h2>📊 测量指标</h2>
      <div class="metrics-grid">
        <div class="metric-item">
          <div class="label">肩膀高度差</div>
          <div class="value">${metrics.shoulderHeightDiffPx.toFixed(1)} px</div>
        </div>
        <div class="metric-item">
          <div class="label">肩部倾斜角</div>
          <div class="value">${metrics.shoulderSlopeDeg.toFixed(1)}°</div>
        </div>
        <div class="metric-item">
          <div class="label">骨盆倾斜角</div>
          <div class="value">${metrics.pelvisTiltDeg.toFixed(1)}°</div>
        </div>
        <div class="metric-item">
          <div class="label">脊柱曲线角度</div>
          <div class="value">${metrics.spinalCurvatureDeg.toFixed(1)}°</div>
        </div>
        <div class="metric-item">
          <div class="label">姿势质量评分</div>
          <div class="value">${(metrics.postureConfidence * 100).toFixed(0)}%</div>
        </div>
      </div>
      <div class="severity-badge" style="background-color: ${severityColor[metrics.severity]}">
        评估等级：${severityText[metrics.severity]}
      </div>
      <p>${metrics.summary}</p>
    </div>
    ` : ''}

    ${aiAnalysis && aiAnalysis.analysis ? `
    <div class="section">
      <h2>🤖 AI 专业分析</h2>
      <div class="ai-content">${aiAnalysis.analysis}</div>
      <p style="text-align: right; color: #999; font-size: 0.85rem; margin-top: 1rem;">
        模型: ${aiAnalysis.model} | 时间: ${new Date(aiAnalysis.timestamp).toLocaleString('zh-CN')}
      </p>
    </div>
    ` : ''}

    <div class="disclaimer">
      <h4>⚠️ 重要提示</h4>
      <ul>
        <li>本工具仅供初步筛查参考，不能替代专业医疗诊断</li>
        <li>如发现异常情况，请及时就医咨询专业医生</li>
        <li>建议定期进行脊柱健康检查</li>
      </ul>
    </div>

    <div class="footer">
      <p>脊卫童行 | 儿童脊柱健康筛查系统</p>
      <p>本报告由 AI 辅助生成，仅供参考</p>
    </div>
  </div>
</body>
</html>`
}
