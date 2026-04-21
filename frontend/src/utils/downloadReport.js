/**
 * 报告下载功能
 * 直接导出为 PNG，避免移动端对本地 HTML 文件支持不佳。
 */

const PAGE_WIDTH = 1200
const PAGE_PADDING = 64
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING * 2
const SECTION_GAP = 28
const CARD_GAP = 20
const FONT_FAMILY = "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans SC',Arial,sans-serif"

let measureContext = null

export async function downloadReport(data) {
  const svg = generateReportSVG(data)
  const blob = await renderSvgToPng(svg)
  if (!blob) throw new Error('报告图片生成失败')

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `脊柱筛查报告_${data.sessionId || Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function generateReportSVG(data) {
  const { sessionId, metrics, aiAnalysis, createdAt, forwardBendMetrics } = data
  const elements = []
  const renderOps = []
  let y = PAGE_PADDING

  const severityText = {
    normal: '正常',
    mild: '轻度',
    moderate: '中度',
    severe: '重度',
    balanced: '正常',
    attention: '轻度',
    alert: '高风险',
  }

  const severityColor = {
    normal: '#16a34a',
    mild: '#f59e0b',
    moderate: '#f97316',
    severe: '#ef4444',
    balanced: '#16a34a',
    attention: '#f59e0b',
    alert: '#ef4444',
  }

  const metricItems = buildMetricItems(metrics, forwardBendMetrics, severityText)

  elements.push(`<defs>
    <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f766e" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="panelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fbff" />
    </linearGradient>
  </defs>`)

  // Header
  const headerHeight = 220
  renderOps.push(
    roundedRect(PAGE_PADDING, y, CONTENT_WIDTH, headerHeight, {
      fill: 'url(#heroGradient)',
      rx: 36,
    }),
    textBlock(PAGE_PADDING + 40, y + 54, ['脊卫童行'], {
      fontSize: 24,
      fontWeight: 700,
      fill: '#99f6e4',
    }),
    textBlock(PAGE_PADDING + 40, y + 106, ['儿童脊柱健康筛查报告'], {
      fontSize: 42,
      fontWeight: 700,
      fill: '#ffffff',
    }),
    textBlock(PAGE_PADDING + 40, y + 154, [
      `报告编号：${sessionId || '未记录'}`,
      `生成时间：${formatDateTime(createdAt || Date.now())}`,
    ], {
      fontSize: 22,
      lineHeight: 34,
      fill: '#dbeafe',
    }),
  )
  y += headerHeight + SECTION_GAP

  if (metrics) {
    const summaryLines = wrapText(metrics.summary || '暂无摘要', CONTENT_WIDTH - 80, '500 28px ' + FONT_FAMILY)
    const summaryHeight = 132 + Math.max(0, summaryLines.length - 1) * 34
    renderOps.push(
      roundedRect(PAGE_PADDING, y, CONTENT_WIDTH, summaryHeight, {
        fill: 'url(#panelGradient)',
        stroke: '#dbe4f0',
        rx: 30,
      }),
      textBlock(PAGE_PADDING + 34, y + 46, ['结果摘要'], {
        fontSize: 24,
        fontWeight: 700,
        fill: '#0f172a',
      }),
      pill(PAGE_PADDING + CONTENT_WIDTH - 210, y + 28, 176, 46, {
        fill: severityColor[metrics.severity] || '#64748b',
        text: `评估等级：${severityText[metrics.severity] || '未评估'}`,
      }),
      textBlock(PAGE_PADDING + 34, y + 92, summaryLines, {
        fontSize: 28,
        lineHeight: 40,
        fill: '#334155',
      }),
    )
    y += summaryHeight + SECTION_GAP
  }

  // Metrics
  if (metricItems.length) {
    renderOps.push(
      textBlock(PAGE_PADDING, y + 8, ['核心指标'], {
        fontSize: 28,
        fontWeight: 700,
        fill: '#0f172a',
      }),
    )
    y += 34

    const metricCardWidth = (CONTENT_WIDTH - CARD_GAP) / 2
    const metricCardHeight = 128
    metricItems.forEach((item, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const cardX = PAGE_PADDING + col * (metricCardWidth + CARD_GAP)
      const cardY = y + row * (metricCardHeight + CARD_GAP)
      renderOps.push(
        roundedRect(cardX, cardY, metricCardWidth, metricCardHeight, {
          fill: '#ffffff',
          stroke: '#dbe4f0',
          rx: 26,
        }),
        textBlock(cardX + 24, cardY + 38, [item.label], {
          fontSize: 20,
          fontWeight: 500,
          fill: '#64748b',
        }),
        textBlock(cardX + 24, cardY + 88, [item.value], {
          fontSize: 32,
          fontWeight: 700,
          fill: '#0f172a',
        }),
      )
    })
    y += Math.ceil(metricItems.length / 2) * (metricCardHeight + CARD_GAP) - CARD_GAP + SECTION_GAP
  }

  // AI analysis
  if (aiAnalysis?.analysis) {
    const analysisLines = buildAnalysisLines(aiAnalysis)
    const analysisHeight = 92 + analysisLines.length * 34 + 72
    renderOps.push(
      roundedRect(PAGE_PADDING, y, CONTENT_WIDTH, analysisHeight, {
        fill: '#ffffff',
        stroke: '#dbe4f0',
        rx: 30,
      }),
      textBlock(PAGE_PADDING + 34, y + 44, ['AI 专业分析'], {
        fontSize: 28,
        fontWeight: 700,
        fill: '#0f172a',
      }),
      textBlock(PAGE_PADDING + 34, y + 92, analysisLines, {
        fontSize: 24,
        lineHeight: 34,
        fill: '#334155',
      }),
      textBlock(PAGE_PADDING + 34, y + analysisHeight - 28, [
        `模型：${aiAnalysis.model || '未记录'}    生成时间：${formatDateTime(aiAnalysis.timestamp || Date.now())}`,
      ], {
        fontSize: 18,
        fill: '#94a3b8',
      }),
    )
    y += analysisHeight + SECTION_GAP
  }

  // Disclaimer
  const disclaimerLines = [
    '重要提示',
    '• 本工具仅供初步筛查参考，不能替代专业医疗诊断。',
    '• 如发现异常情况，请及时就医咨询专业医生。',
    '• 建议结合定期复查、姿势管理和线下评估综合判断。',
  ]
  const disclaimerHeight = 182
  renderOps.push(
    roundedRect(PAGE_PADDING, y, CONTENT_WIDTH, disclaimerHeight, {
      fill: '#fff7ed',
      stroke: '#fdba74',
      rx: 30,
    }),
    textBlock(PAGE_PADDING + 34, y + 44, [disclaimerLines[0]], {
      fontSize: 28,
      fontWeight: 700,
      fill: '#9a3412',
    }),
    textBlock(PAGE_PADDING + 34, y + 90, disclaimerLines.slice(1), {
      fontSize: 24,
      lineHeight: 34,
      fill: '#9a3412',
    }),
  )
  y += disclaimerHeight + PAGE_PADDING

  const height = Math.max(y, 1200)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${height}" viewBox="0 0 ${PAGE_WIDTH} ${height}">
    <rect width="${PAGE_WIDTH}" height="${height}" fill="#eef4f8" />
    ${elements.join('\n')}
    ${renderOps.join('\n')}
  </svg>`
}

function buildMetricItems(metrics, forwardBendMetrics, severityText) {
  if (!metrics) return []

  const items = [
    ['肩膀高度差', `${metrics.shoulderHeightDiffPx.toFixed(1)} px`],
    ['肩部倾斜角', `${metrics.shoulderSlopeDeg.toFixed(1)}°`],
    ['骨盆倾斜角', `${metrics.pelvisTiltDeg.toFixed(1)}°`],
    ['脊柱曲线角度', `${metrics.spinalCurvatureDeg.toFixed(1)}°`],
    ['姿势质量评分', `${(metrics.postureConfidence * 100).toFixed(0)}%`],
    ['评估等级', severityText[metrics.severity] || '未评估'],
  ]

  if (metrics.trunkShiftNorm != null) items.push(['躯干侧移', `${(metrics.trunkShiftNorm * 100).toFixed(1)}%`])
  if (metrics.headTiltDeg != null) items.push(['头部倾斜角', `${metrics.headTiltDeg.toFixed(1)}°`])
  if (metrics.ankleCompensationRatio != null) items.push(['踝部代偿比', metrics.ankleCompensationRatio.toFixed(3)])
  if (forwardBendMetrics?.ribHumpDiffNorm != null) items.push(['肋骨隆起差', forwardBendMetrics.ribHumpDiffNorm.toFixed(3)])
  if (forwardBendMetrics?.ribHumpSide) {
    items.push(['隆起侧', { left: '左侧', right: '右侧', symmetric: '对称' }[forwardBendMetrics.ribHumpSide] || forwardBendMetrics.ribHumpSide])
  }
  if (forwardBendMetrics?.ribHumpSeverity) {
    items.push(['Adams严重程度', { none: '无', mild: '轻度', moderate: '中度', severe: '重度' }[forwardBendMetrics.ribHumpSeverity] || forwardBendMetrics.ribHumpSeverity])
  }

  return items.map(([label, value]) => ({ label, value }))
}

function buildAnalysisLines(aiAnalysis) {
  const lines = []
  const paragraphs = String(aiAnalysis.analysis || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)

  paragraphs.forEach((paragraph, index) => {
    const wrapped = wrapText(paragraph, CONTENT_WIDTH - 68, '400 24px ' + FONT_FAMILY)
    lines.push(...wrapped)
    if (index < paragraphs.length - 1) lines.push('')
  })

  return lines.length ? lines : ['暂无 AI 分析内容']
}

function wrapText(text, maxWidth, font) {
  const content = String(text || '').trim()
  if (!content) return ['']

  const lines = []
  let current = ''

  for (const char of content) {
    const candidate = current + char
    if (measureWidth(candidate, font) <= maxWidth || !current) {
      current = candidate
      continue
    }
    lines.push(current.trimEnd())
    current = char.trim() ? char : ''
  }

  if (current) lines.push(current.trimEnd())
  return lines.length ? lines : ['']
}

function measureWidth(text, font) {
  if (!measureContext) {
    const canvas = document.createElement('canvas')
    measureContext = canvas.getContext('2d')
  }

  measureContext.font = font
  return measureContext.measureText(text).width
}

function textBlock(x, y, lines, options = {}) {
  const {
    fontSize = 24,
    fontWeight = 400,
    fill = '#0f172a',
    lineHeight = Math.round(fontSize * 1.45),
  } = options

  const safeLines = Array.isArray(lines) ? lines : [String(lines || '')]
  const tspans = safeLines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight
      const content = line === '' ? ' ' : escapeXml(line)
      return `<tspan x="${x}" dy="${dy}">${content}</tspan>`
    })
    .join('')

  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="${fontWeight}">${tspans}</text>`
}

function roundedRect(x, y, width, height, options = {}) {
  const {
    fill = '#ffffff',
    stroke = 'none',
    strokeWidth = 1,
    rx = 24,
  } = options

  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
}

function pill(x, y, width, height, options = {}) {
  const { fill = '#0f172a', text = '' } = options
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${fill}" />
    <text x="${x + width / 2}" y="${y + 30}" text-anchor="middle" fill="#ffffff" font-family="${FONT_FAMILY}" font-size="18" font-weight="700">${escapeXml(text)}</text>
  `
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('zh-CN')
}

async function renderSvgToPng(svg) {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(svgUrl)
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = PAGE_WIDTH * scale
    canvas.height = image.height * scale

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建画布上下文')

    ctx.scale(scale, scale)
    ctx.drawImage(image, 0, 0)

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('报告图片导出失败'))
          return
        }
        resolve(blob)
      }, 'image/png', 1)
    })
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('报告图片渲染失败'))
    img.src = src
  })
}
