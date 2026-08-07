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

const PHOTO_MAX_SIZE = 800

function resizeBase64Image(base64, maxSize) {
  return new Promise((resolve, reject) => {
    if (!base64) return resolve(null)
    const img = new Image()
    img.onload = () => {
      const { width, height } = img
      const scale = Math.min(1, maxSize / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => {
      console.warn('图片缩放失败，使用原图')
      resolve(base64)
    }
    img.src = base64
  })
}

export async function downloadReport(data) {
  data.standingImage = await resizeBase64Image(data.standingImage, PHOTO_MAX_SIZE)
  data.forwardBendImage = await resizeBase64Image(data.forwardBendImage, PHOTO_MAX_SIZE)

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

function stripMarkdown(text) {
  return String(text || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/^>\s*/gm, '')
    .trim()
}

function looksLikeBullet(line) {
  return /^([-•●▪︎]|\*\s|[0-9]+[.)、]|[一二三四五六七八九十]+[、.．])/.test(line)
}

function stripBulletMarker(line) {
  return String(line || '')
    .replace(/^([-•●▪︎]|\*\s|[0-9]+[.)、]|[一二三四五六七八九十]+[、.．])\s*/, '')
    .trim()
}

function stripHeadingMarker(line) {
  return String(line || '')
    .replace(/^([一二三四五六七八九十]+[、.．]|[0-9]+[、.．])\s*/, '')
    .replace(/[:：]$/, '')
    .trim()
}

function classifySectionType(title) {
  const map = { '健康等级': 'grade', '判断依据': 'basis', '建议': 'suggestion', '提醒': 'warning' }
  for (const [key, value] of Object.entries(map)) {
    if (title.includes(key)) return value
  }
  return 'generic'
}

function parseStructuredText(text) {
  const sectionRegex = /【([^】]+)】([\s\S]*?)(?=【|$)/g
  let match
  const sections = []
  while ((match = sectionRegex.exec(text)) !== null) {
    const title = match[1].trim()
    const body = match[2].trim()
    if (!title || !body) continue
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean)
    const paragraphs = []
    const bullets = []
    lines.forEach(line => {
      if (looksLikeBullet(line)) {
        bullets.push(stripBulletMarker(line))
      } else {
        paragraphs.push(stripHeadingMarker(line))
      }
    })
    sections.push({
      title,
      type: classifySectionType(title),
      paragraphs: paragraphs.length > 0 ? paragraphs : [body],
      bullets,
    })
  }
  return sections.length > 0 ? sections : null
}

function parseMarkdownSections(text) {
  const blocks = text.split(/^###\s+/gm)
  if (blocks.length <= 1) return null

  const sections = []
  blocks.slice(1).forEach(block => {
    const lines = block.trim().split('\n')
    const rawTitle = lines[0].trim()
    const title = rawTitle
      .replace(/^[0-9]+[、.．]\s*/, '')
      .replace(/[*_]{1,2}/g, '')
      .trim()
    if (!title) return

    const contentLines = lines.slice(1).map(l => l.trim()).filter(Boolean)
    const paragraphs = []
    const bullets = []

    contentLines.forEach(line => {
      if (/^[-*_]{3,}\s*$/.test(line)) return
      let cleanLine = line.replace(/\*\*([^*]+)\*\*/g, '$1')
      if (looksLikeBullet(cleanLine)) {
        bullets.push(stripBulletMarker(cleanLine).replace(/\*([^*]+)\*/g, '$1'))
      } else {
        cleanLine = cleanLine.replace(/\*([^*]+)\*/g, '$1')
        paragraphs.push(cleanLine)
      }
    })

    sections.push({
      title,
      type: classifySectionType(title),
      paragraphs: (paragraphs.length === 0 && bullets.length === 0)
        ? [contentLines.join('\n').replace(/\*\*([^*]+)\*\*/g, '$1')]
        : paragraphs,
      bullets,
    })
  })

  return sections.length > 0 ? sections : null
}

const SECTION_STYLE = {
  grade: {
    cardFill: '#ecfdf5',
    cardStroke: '#a7f3d0',
    accentFill: '#059669',
    titleColor: '#047857',
    bulletColor: '#10b981',
  },
  basis: {
    cardFill: '#f8fafc',
    cardStroke: '#e2e8f0',
    accentFill: '#475569',
    titleColor: '#334155',
    bulletColor: '#64748b',
  },
  suggestion: {
    cardFill: '#fffbeb',
    cardStroke: '#fde68a',
    accentFill: '#d97706',
    titleColor: '#b45309',
    bulletColor: '#f59e0b',
  },
  warning: {
    cardFill: '#fef3c7',
    cardStroke: '#fcd34d',
    accentFill: '#b45309',
    titleColor: '#92400e',
    bulletColor: '#f97316',
  },
  generic: {
    cardFill: '#f8fafc',
    cardStroke: '#e2e8f0',
    accentFill: '#64748b',
    titleColor: '#334155',
    bulletColor: '#94a3b8',
  },
}

const SECTION_TYPE_LABEL = {
  grade: '健康等级',
  basis: '判断依据',
  suggestion: '对应建议',
  warning: '重要提醒',
  generic: '分析要点',
}

function generateReportSVG(data) {
  const { sessionId, metrics, aiAnalysis, createdAt, forwardBendMetrics, standingImage, forwardBendImage } = data
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

  // Photo section
  const hasStandingPhoto = !!standingImage
  const hasForwardBendPhoto = !!forwardBendImage

  if (hasStandingPhoto || hasForwardBendPhoto) {
    const photoCount = (hasStandingPhoto ? 1 : 0) + (hasForwardBendPhoto ? 1 : 0)
    const photoGap = 20
    const photoWidth = (CONTENT_WIDTH - photoGap * (photoCount - 1)) / photoCount
    const photoHeight = Math.round(photoWidth * 1.25)
    const photoSectionHeight = 56 + photoHeight

    renderOps.push(
      textBlock(PAGE_PADDING, y + 40, ['筛查照片'], {
        fontSize: 28,
        fontWeight: 700,
        fill: '#0f172a',
      }),
    )

    let photoX = PAGE_PADDING
    if (hasStandingPhoto) {
      renderOps.push(
        roundedRect(photoX, y + 56, photoWidth, photoHeight, {
          fill: '#f8fafc',
          stroke: '#dbe4f0',
          rx: 24,
        }),
        `<image href="${escapeXml(standingImage)}" x="${photoX + 4}" y="${y + 60}" width="${photoWidth - 8}" height="${photoHeight - 8}" preserveAspectRatio="xMidYMid slice" />`,
        textBlock(photoX + photoWidth / 2, y + photoHeight + 90, ['站立位照片'], {
          fontSize: 22,
          fontWeight: 600,
          fill: '#475569',
          textAnchor: 'middle',
        }),
      )
      photoX += photoWidth + photoGap
    }
    if (hasForwardBendPhoto) {
      renderOps.push(
        roundedRect(photoX, y + 56, photoWidth, photoHeight, {
          fill: '#f8fafc',
          stroke: '#dbe4f0',
          rx: 24,
        }),
        `<image href="${escapeXml(forwardBendImage)}" x="${photoX + 4}" y="${y + 60}" width="${photoWidth - 8}" height="${photoHeight - 8}" preserveAspectRatio="xMidYMid slice" />`,
        textBlock(photoX + photoWidth / 2, y + photoHeight + 90, ['弯腰位照片'], {
          fontSize: 22,
          fontWeight: 600,
          fill: '#475569',
          textAnchor: 'middle',
        }),
      )
    }

    y += photoSectionHeight + SECTION_GAP
  }

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
    const raw = String(aiAnalysis.analysis || '').replace(/\r\n/g, '\n').trim()
    const structuredSections = parseStructuredText(raw) || parseMarkdownSections(raw)

    if (structuredSections) {
      const sectionGap = 16
      const cardPaddingX = 28
      const cardPaddingTop = 32
      const accentWidth = 8
      const titleFontSize = 24
      const titleLineHeight = 34
      const contentFontSize = 22
      const contentLineHeight = 32
      const contentMaxWidth = CONTENT_WIDTH - cardPaddingX * 2 - accentWidth - 20
      const font400 = '400 ' + contentFontSize + 'px ' + FONT_FAMILY
      const font700title = '700 ' + titleFontSize + 'px ' + FONT_FAMILY
      const font700content = '700 ' + contentFontSize + 'px ' + FONT_FAMILY

      // Calculate total height
      let totalHeight = 60 // header "专业分析" row height
      structuredSections.forEach((section) => {
        const style = SECTION_STYLE[section.type] || SECTION_STYLE.generic
        let contentLines = 0
        // Title line
        contentLines += 1
        // Paragraphs
        section.paragraphs.forEach((p) => {
          contentLines += wrapText(p, contentMaxWidth, font400).length
        })
        // Bullets
        section.bullets.forEach((b) => {
          const bulletText = '• ' + b
          contentLines += wrapText(bulletText, contentMaxWidth, font400).length
        })
        // Section card height
        const cardHeight = cardPaddingTop + contentLines * contentLineHeight + 28
        totalHeight += cardHeight + sectionGap
      })
      totalHeight += 48 // timestamp row

      // Main outer card
      renderOps.push(
        roundedRect(PAGE_PADDING, y, CONTENT_WIDTH, totalHeight, {
          fill: '#ffffff',
          stroke: '#dbe4f0',
          rx: 30,
        }),
        textBlock(PAGE_PADDING + 34, y + 40, ['专业分析'], {
          fontSize: 28,
          fontWeight: 700,
          fill: '#0f172a',
        }),
      )

      let sectionY = y + 60
      structuredSections.forEach((section, idx) => {
        const style = SECTION_STYLE[section.type] || SECTION_STYLE.generic
        let contentLines = 0
        const renderLines = []

        // Title
        contentLines += 1
        renderLines.push({ text: section.title, font: font700title, fill: style.titleColor, indent: 0, isTitle: true })

        // Paragraphs
        section.paragraphs.forEach((p) => {
          const wrapped = wrapText(p, contentMaxWidth, font400)
          wrapped.forEach((line) => {
            contentLines += 1
            renderLines.push({ text: line, font: font400, fill: '#334155', indent: 0 })
          })
        })

        // Bullets
        section.bullets.forEach((b) => {
          const bulletText = '• ' + b
          const wrapped = wrapText(bulletText, contentMaxWidth, font400)
          wrapped.forEach((line) => {
            contentLines += 1
            renderLines.push({ text: line, font: font400, fill: '#475569', indent: 12 })
          })
        })

        const cardHeight = cardPaddingTop + contentLines * contentLineHeight + 28

        // Section card background
        renderOps.push(
          roundedRect(PAGE_PADDING + cardPaddingX, sectionY, CONTENT_WIDTH - cardPaddingX * 2, cardHeight, {
            fill: style.cardFill,
            stroke: style.cardStroke,
            rx: 20,
          }),
          // Left accent bar
          `<rect x="${PAGE_PADDING + cardPaddingX}" y="${sectionY + 8}" width="${accentWidth}" height="${cardHeight - 16}" rx="4" fill="${style.accentFill}" />`,
        )

        // Render text lines
        let lineY = sectionY + cardPaddingTop + 4
        const textStartX = PAGE_PADDING + cardPaddingX + accentWidth + 20
        renderLines.forEach((rl) => {
          const yOffset = rl.isTitle ? 2 : 0
          renderOps.push(
            textBlock(textStartX + rl.indent, lineY + yOffset, [rl.text], {
              fontSize: rl.isTitle ? titleFontSize : contentFontSize,
              fontWeight: rl.isTitle ? 700 : 400,
              fill: rl.fill,
              lineHeight: contentLineHeight,
            }),
          )
          lineY += contentLineHeight
        })

        // Section type badge (pill)
        const badgeText = SECTION_TYPE_LABEL[section.type] || SECTION_TYPE_LABEL.generic
        const badgeWidth = measureWidth(badgeText, '700 16px ' + FONT_FAMILY) + 24
        const badgeX = PAGE_PADDING + CONTENT_WIDTH - cardPaddingX - badgeWidth - 16
        const badgeY = sectionY + 16
        renderOps.push(
          `<rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="26" rx="13" fill="${style.accentFill}" opacity="0.12" />`,
          textBlock(badgeX + badgeWidth / 2, badgeY + 18, [badgeText], {
            fontSize: 16,
            fontWeight: 600,
            fill: style.accentFill,
            textAnchor: 'middle',
          }),
        )

        sectionY += cardHeight + sectionGap
      })

      // Timestamp
      renderOps.push(
        textBlock(PAGE_PADDING + 34, y + totalHeight - 20, [
          `生成时间：${formatDateTime(aiAnalysis.timestamp || Date.now())}`,
        ], {
          fontSize: 18,
          fill: '#94a3b8',
        }),
      )

      y += totalHeight + SECTION_GAP
    } else {
      // Fallback: plain text rendering
      const analysisLines = buildAnalysisLines(aiAnalysis)
      const analysisHeight = 92 + analysisLines.length * 34 + 72
      renderOps.push(
        roundedRect(PAGE_PADDING, y, CONTENT_WIDTH, analysisHeight, {
          fill: '#ffffff',
          stroke: '#dbe4f0',
          rx: 30,
        }),
        textBlock(PAGE_PADDING + 34, y + 44, ['专业分析'], {
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
          `生成时间：${formatDateTime(aiAnalysis.timestamp || Date.now())}`,
        ], {
          fontSize: 18,
          fill: '#94a3b8',
        }),
      )
      y += analysisHeight + SECTION_GAP
    }
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
  if (forwardBendMetrics?.asymmetryScore != null) items.push(['躯干对称评分', forwardBendMetrics.asymmetryScore.toFixed(1)])
  if (forwardBendMetrics?.dominantSide) {
    items.push(['不对称侧重侧', { left: '左侧', right: '右侧', symmetric: '对称' }[forwardBendMetrics.dominantSide] || forwardBendMetrics.dominantSide])
  }
  if (forwardBendMetrics?.severity) {
    items.push(['弯腰综合评估', { none: '无', mild: '轻度', moderate: '中度', severe: '重度' }[forwardBendMetrics.severity] || forwardBendMetrics.severity])
  }

  return items.map(([label, value]) => ({ label, value }))
}

function buildAnalysisLines(aiAnalysis) {
  const lines = []
  const cleaned = stripMarkdown(aiAnalysis.analysis || '')
  const paragraphs = String(cleaned)
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)

  paragraphs.forEach((paragraph, index) => {
    const wrapped = wrapText(paragraph, CONTENT_WIDTH - 68, '400 24px ' + FONT_FAMILY)
    lines.push(...wrapped)
    if (index < paragraphs.length - 1) lines.push('')
  })

  return lines.length ? lines : ['暂无分析内容']
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
    textAnchor = 'start',
  } = options

  const safeLines = Array.isArray(lines) ? lines : [String(lines || '')]
  const tspans = safeLines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight
      const content = line === '' ? ' ' : escapeXml(line)
      return `<tspan x="${x}" dy="${dy}">${content}</tspan>`
    })
    .join('')

  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${textAnchor}">${tspans}</text>`
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
