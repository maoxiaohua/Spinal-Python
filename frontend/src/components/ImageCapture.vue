<template>
  <div class="animate-slide-up space-y-4 sm:space-y-6">
    <section class="hidden gap-6 xl:grid xl:grid-cols-[1.28fr,0.72fr]">
      <div class="overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,248,248,0.9))] shadow-[0_34px_90px_rgba(15,23,42,0.08)]">
        <div class="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
          <div class="absolute -right-16 top-0 h-52 w-52 rounded-full bg-brand-teal/12 blur-3xl"></div>
          <div class="absolute -bottom-24 left-12 h-52 w-52 rounded-full bg-brand-navy/10 blur-3xl"></div>

          <div class="relative z-10 space-y-6">
            <div class="flex flex-wrap items-center gap-3">
              <span class="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
                <ShieldCheck class="h-4 w-4" />
                本地隐私处理 · 数据留在可控范围内
              </span>
              <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-600">
                <Clock3 class="h-4 w-4 text-brand-navy" />
                一次拍摄即可进入检测
              </span>
            </div>

            <div class="max-w-3xl space-y-3">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Spine Screening Interface</p>
              <h2 class="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 md:text-5xl">
                为家长重构的
                <span class="bg-gradient-to-r from-brand-teal via-cyan-600 to-brand-navy bg-clip-text text-transparent">
                  脊柱筛查工作台
                </span>
              </h2>
              <p class="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                把拍摄规范、检测状态、隐私说明和结果入口放在同一视线里，减少来回理解成本，
                让儿童背部照片筛查更顺手、更可信。
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-white/90 bg-white/72 p-4 backdrop-blur">
                <p class="text-sm font-medium text-slate-500">拍摄目标</p>
                <p class="mt-2 text-lg font-semibold text-slate-900">完整背部站姿照</p>
              </div>
              <div class="rounded-2xl border border-white/90 bg-white/72 p-4 backdrop-blur">
                <p class="text-sm font-medium text-slate-500">处理方式</p>
                <p class="mt-2 text-lg font-semibold text-slate-900">浏览器内骨骼识别</p>
              </div>
              <div class="rounded-2xl border border-white/90 bg-white/72 p-4 backdrop-blur">
                <p class="text-sm font-medium text-slate-500">结果输出</p>
                <p class="mt-2 text-lg font-semibold text-slate-900">指标 + 解读建议</p>
              </div>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <button
                @click="showGuidedCamera = true"
                class="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:bg-slate-900"
              >
                <Camera class="h-5 w-5" />
                现在开始引导拍摄
              </button>
              <button
                @click="triggerFileInput"
                class="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition hover:border-brand-teal hover:bg-brand-teal/5"
              >
                <FolderOpen class="h-5 w-5" />
                使用已有照片上传
              </button>
            </div>

            <div class="grid gap-3 border-t border-slate-200/70 pt-5 sm:grid-cols-3">
              <div
                v-for="item in trustHighlights"
                :key="item.title"
                class="rounded-2xl border border-slate-200/70 bg-white/70 p-4"
              >
                <div class="flex items-center gap-2">
                  <component :is="item.icon" class="h-4 w-4 text-brand-teal" />
                  <p class="text-sm font-semibold text-slate-900">{{ item.title }}</p>
                </div>
                <p class="mt-2 text-sm leading-6 text-slate-600">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <section class="rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Workflow</p>
              <h3 class="mt-1 text-xl font-semibold text-slate-950">筛查步骤</h3>
            </div>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              当前状态：{{ statusLabel }}
            </span>
          </div>

          <div class="mt-5 space-y-4">
            <div
              v-for="(step, index) in workflowSteps"
              :key="step.title"
              class="flex gap-4 rounded-2xl border px-4 py-4 transition"
              :class="step.statusClass"
            >
              <div
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-semibold"
                :class="step.badgeClass"
              >
                {{ index + 1 }}
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-semibold text-slate-900">{{ step.title }}</p>
                  <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="step.tagClass">
                    {{ step.tag }}
                  </span>
                </div>
                <p class="mt-1 text-sm leading-6 text-slate-600">{{ step.description }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[28px] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Photo Checklist</p>
          <h3 class="mt-2 text-xl font-semibold">拍摄前请先确认这 4 点</h3>
          <div class="mt-5 space-y-3">
            <div
              v-for="item in captureChecklist"
              :key="item.title"
              class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-cyan-300" />
                <p class="font-medium">{{ item.title }}</p>
              </div>
              <p class="mt-1 text-sm leading-6 text-slate-300">{{ item.description }}</p>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section
      v-if="!imagePreview"
      class="xl:hidden rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Mobile Workflow</p>
          <h3 class="mt-1 text-lg font-semibold text-slate-950">手机端快捷筛查</h3>
        </div>
        <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="statusPillClass">
          {{ statusLabel }}
        </span>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <button
          @click="showGuidedCamera = true"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
        >
          <Camera class="h-4 w-4" />
          引导拍摄
        </button>
        <button
          @click="triggerFileInput"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          <FolderOpen class="h-4 w-4" />
          上传照片
        </button>
      </div>

      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">当前目标</p>
          <p class="mt-2 text-sm font-semibold text-slate-900">{{ imagePreview ? '确认当前识别结果' : '先拍到完整背部照片' }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">操作提示</p>
          <p class="mt-2 text-sm font-semibold text-slate-900">{{ mobileHintText }}</p>
        </div>
      </div>
    </section>

    <div class="grid gap-4 xl:grid-cols-[1.08fr,0.92fr] xl:gap-6">
      <section class="overflow-hidden rounded-[32px] border border-white/80 bg-white/92 shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
        <div
          class="border-b border-slate-200/70 px-4 py-4 sm:px-7 sm:py-5"
          :class="imagePreview ? 'hidden xl:flex xl:items-center xl:justify-between xl:gap-4' : 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'"
        >
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-brand-navy/70">Capture Console</p>
            <h3 class="mt-1 text-2xl font-semibold tracking-tight text-slate-950">上传或拍摄背部照片</h3>
            <p class="mt-1 text-sm text-slate-600">界面已按“先指导再上传”的顺序重排，减少误操作和重复拍摄。</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
              {{ selectedSource || '等待选择照片' }}
            </span>
            <span class="rounded-full px-3 py-1 text-sm font-medium" :class="statusPillClass">
              {{ statusLabel }}
            </span>
          </div>
        </div>

        <div class="p-4 sm:p-7">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          />

          <div
            v-if="!imagePreview"
            class="rounded-[28px] border border-dashed border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(240,249,255,0.75))] p-6 sm:p-8"
          >
            <div class="mx-auto max-w-2xl text-center">
              <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <ImagePlus class="h-9 w-9 text-brand-teal" />
              </div>
              <h4 class="mt-5 text-2xl font-semibold text-slate-950">先准备一张清晰的背部照片</h4>
              <p class="mt-3 text-base leading-7 text-slate-600">
                建议孩子背向镜头自然站立，双臂自然下垂，拍到头顶至臀部区域。若家里空间有限，优先保证背部完整和光线均匀。
              </p>

              <div class="mt-6 grid gap-3 text-left sm:grid-cols-3">
                <div
                  v-for="item in emptyStateHints"
                  :key="item.title"
                  class="rounded-2xl border border-white/90 bg-white/80 p-4"
                >
                  <div class="flex items-center gap-2">
                    <component :is="item.icon" class="h-4 w-4 text-brand-navy" />
                    <p class="font-semibold text-slate-900">{{ item.title }}</p>
                  </div>
                  <p class="mt-2 text-sm leading-6 text-slate-600">{{ item.description }}</p>
                </div>
              </div>

              <div class="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  @click="showGuidedCamera = true"
                  class="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-teal px-6 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(20,184,166,0.28)] transition hover:-translate-y-0.5 hover:bg-teal-500"
                >
                  <Camera class="h-5 w-5" />
                  打开引导相机
                </button>
                <button
                  @click="triggerFileInput"
                  class="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition hover:border-brand-teal hover:bg-brand-teal/5"
                >
                  <FolderOpen class="h-5 w-5" />
                  从相册选择照片
                </button>
              </div>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="xl:hidden flex items-center justify-between gap-2 rounded-[24px] border border-slate-200 bg-slate-50/90 px-4 py-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-900">{{ selectedFileName || '当前照片' }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ statusLabel }} · {{ selectedSource || '等待照片来源' }}</p>
              </div>
              <button
                @click="handleReset"
                class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
                aria-label="重新选择照片"
              >
                <RefreshCw class="h-4 w-4" />
              </button>
            </div>

            <div class="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950/95">
              <div class="hidden items-center justify-between border-b border-white/10 px-5 py-3 xl:flex">
                <div>
                  <p class="text-sm font-medium text-slate-200">当前样本</p>
                  <p class="mt-0.5 max-w-[15rem] truncate text-xs text-slate-400 sm:max-w-sm">{{ selectedFileName || '未命名图片' }}</p>
                </div>
                <div class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  <ScanLine class="h-3.5 w-3.5 text-cyan-300" />
                  骨骼关键点叠加预览
                </div>
              </div>

              <div class="relative bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.08),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.45),rgba(15,23,42,0.8))]">
                <canvas ref="canvasElement" class="block max-h-[720px] w-full"></canvas>
              </div>
            </div>

            <div class="hidden flex-col gap-3 sm:flex-row xl:flex">
              <button
                v-if="status === 'detected'"
                @click="handleUpload"
                class="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-900"
              >
                <Send class="h-5 w-5" />
                提交并生成筛查结果
              </button>
              <button
                @click="handleReset"
                class="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:min-w-44"
              >
                <RefreshCw class="h-5 w-5" />
                重新选择照片
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside class="hidden space-y-4 xl:block">
        <section class="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Status</p>
              <h3 class="mt-1 text-xl font-semibold text-slate-950">检测进度说明</h3>
            </div>
            <div class="rounded-full px-3 py-1 text-xs font-semibold" :class="statusPillClass">
              {{ statusLabel }}
            </div>
          </div>

          <div class="mt-5 rounded-[24px] border p-4" :class="statusPanelClass">
            <div class="flex items-start gap-3">
              <div class="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl" :class="statusIconWrapClass">
                <component :is="statusIcon" class="h-5 w-5" :class="statusIconClass" />
              </div>
              <div class="flex-1">
                <p class="font-semibold text-slate-950">{{ statusTitle }}</p>
                <p class="mt-1 text-sm leading-6 text-slate-600">{{ statusDescription }}</p>
              </div>
            </div>
          </div>

          <div class="mt-4 space-y-3">
            <div
              v-for="item in nextActions"
              :key="item.title"
              class="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
            >
              <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                <component :is="item.icon" class="h-4 w-4 text-brand-teal" />
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900">{{ item.title }}</p>
                <p class="mt-1 text-sm leading-6 text-slate-600">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Metrics</p>
              <h3 class="mt-1 text-xl font-semibold text-slate-950">本次识别摘要</h3>
            </div>
            <span v-if="status === 'detected'" class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              可提交分析
            </span>
          </div>

          <div v-if="metrics" class="mt-5 grid gap-3 sm:grid-cols-2">
            <div
              v-for="item in metricCards"
              :key="item.label"
              class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
            >
              <p class="text-sm text-slate-500">{{ item.label }}</p>
              <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{{ item.value }}</p>
              <p class="mt-1 text-xs leading-5 text-slate-500">{{ item.tip }}</p>
            </div>
          </div>

          <div v-else class="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-5">
            <p class="text-sm font-semibold text-slate-900">识别完成后这里会展示关键指标</p>
            <p class="mt-2 text-sm leading-6 text-slate-600">
              包括肩高差、肩部倾斜角、骨盆倾斜角和脊柱曲线估计值，方便你在提交前快速复核拍摄质量。
            </p>
          </div>

          <div v-if="status === 'error'" class="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 p-4">
            <p class="text-sm font-semibold text-rose-900">识别失败常见原因</p>
            <ul class="mt-2 space-y-1 text-sm leading-6 text-rose-700">
              <li>背部未完整入镜，肩或骨盆位置缺失。</li>
              <li>孩子侧身或身体旋转过大，导致关键点不稳定。</li>
              <li>光线过暗或背景干扰明显。</li>
            </ul>
          </div>
        </section>

        <section class="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Debug</p>
              <h3 class="mt-1 text-xl font-semibold text-slate-950">关键点调试面板</h3>
            </div>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              原始点位 -> 映射点位 -> 指标
            </span>
          </div>

          <div v-if="debugSummary" class="mt-5 space-y-4">
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p class="text-sm text-slate-500">识别置信度</p>
                <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{{ debugSummary.poseScore }}</p>
                <p class="mt-1 text-xs leading-5 text-slate-500">来自 MoveNet 单人姿态整体评分</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p class="text-sm text-slate-500">原始可见点</p>
                <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{{ debugSummary.visibleKeypoints }}/17</p>
                <p class="mt-1 text-xs leading-5 text-slate-500">阈值为 score ≥ 0.3</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p class="text-sm text-slate-500">图像尺寸</p>
                <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{{ debugSummary.imageSize }}</p>
                <p class="mt-1 text-xs leading-5 text-slate-500">用于归一化 landmarks 与绘制 overlay</p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div
                v-for="group in debugLandmarkGroups"
                :key="group.id"
                class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="font-semibold text-slate-900">{{ group.title }}</p>
                  <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                    {{ group.movenetLabel }} -> {{ group.landmarkLabel }}
                  </span>
                </div>

                <div class="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <p class="font-medium text-slate-900">原始像素点</p>
                    <p class="mt-1 font-mono text-xs leading-6">
                      x: {{ group.raw.x }}<br>
                      y: {{ group.raw.y }}<br>
                      score: {{ group.raw.score }}
                    </p>
                  </div>
                  <div>
                    <p class="font-medium text-slate-900">映射归一化点</p>
                    <p class="mt-1 font-mono text-xs leading-6">
                      x: {{ group.mapped.x }}<br>
                      y: {{ group.mapped.y }}<br>
                      visibility: {{ group.mapped.visibility }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <details class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <summary class="cursor-pointer text-sm font-semibold text-slate-900">查看完整原始关键点 JSON</summary>
              <pre class="mt-3 max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{{ formattedDebugJson }}</pre>
            </details>
          </div>

          <div v-else class="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-5">
            <p class="text-sm font-semibold text-slate-900">当前还没有可调试的数据</p>
            <p class="mt-2 text-sm leading-6 text-slate-600">
              上传或拍摄照片后，这里会同步展示 MoveNet 原始点、映射后的 landmarks，以及参与计算的关键解剖代理点。
            </p>
          </div>
        </section>

        <section class="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(160deg,rgba(240,253,250,0.95),rgba(239,246,255,0.95))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div class="flex items-center gap-2">
            <Lock class="h-5 w-5 text-brand-teal" />
            <h3 class="text-lg font-semibold text-slate-950">隐私与使用边界</h3>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="item in privacyNotes"
              :key="item.title"
              class="rounded-2xl border border-white/80 bg-white/70 px-4 py-3"
            >
              <p class="text-sm font-semibold text-slate-900">{{ item.title }}</p>
              <p class="mt-1 text-sm leading-6 text-slate-600">{{ item.description }}</p>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <section
      v-if="imagePreview"
      class="space-y-4 xl:hidden"
    >
      <div class="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-900">{{ selectedFileName || '当前照片' }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ statusLabel }} · {{ selectedSource || '等待照片来源' }}</p>
          </div>
          <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="statusPillClass">
            {{ statusLabel }}
          </span>
        </div>

        <div class="mt-4 rounded-[24px] border p-4" :class="statusPanelClass">
          <p class="text-sm font-semibold text-slate-900">{{ statusTitle }}</p>
          <p class="mt-2 text-sm leading-6 text-slate-600">{{ statusDescription }}</p>
        </div>

        <div class="mt-4 space-y-2">
          <div
            v-for="item in nextActions.slice(0, 2)"
            :key="item.title"
            class="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
          >
            <p class="text-sm font-semibold text-slate-900">{{ item.title }}</p>
            <p class="mt-1 text-xs leading-5 text-slate-600">{{ item.description }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-brand-navy/70">Metrics</p>
            <h3 class="mt-1 text-lg font-semibold text-slate-950">当前骨骼识别结果</h3>
          </div>
          <span v-if="status === 'detected'" class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            可提交分析
          </span>
        </div>

        <div v-if="metrics" class="mt-4 grid grid-cols-2 gap-2">
          <div
            v-for="item in metricCards"
            :key="item.label"
            class="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3"
          >
            <p class="text-[11px] text-slate-500">{{ item.label }}</p>
            <p class="mt-1 text-lg font-semibold tracking-tight text-slate-950">{{ item.value }}</p>
          </div>
        </div>
        <div v-else class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4">
          <p class="text-sm font-semibold text-slate-900">识别完成后这里会出现核心指标</p>
          <p class="mt-2 text-xs leading-5 text-slate-600">先看肩线、骨盆和脊柱曲线估计，再决定是否提交分析。</p>
        </div>
      </div>

      <details class="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <summary class="cursor-pointer text-sm font-semibold text-slate-900">查看调试摘要</summary>
        <div class="mt-4 space-y-3">
          <div v-if="debugSummary" class="grid grid-cols-3 gap-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
              <p class="text-[11px] text-slate-500">置信度</p>
              <p class="mt-1 text-lg font-semibold text-slate-950">{{ debugSummary.poseScore }}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
              <p class="text-[11px] text-slate-500">可见点</p>
              <p class="mt-1 text-lg font-semibold text-slate-950">{{ debugSummary.visibleKeypoints }}/17</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
              <p class="text-[11px] text-slate-500">图像</p>
              <p class="mt-1 text-sm font-semibold text-slate-950">{{ debugSummary.imageSize }}</p>
            </div>
          </div>
          <div v-if="debugLandmarkGroups.length" class="grid grid-cols-2 gap-2">
            <div
              v-for="group in debugLandmarkGroups.slice(0, 4)"
              :key="group.id"
              class="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3"
            >
              <p class="text-xs font-semibold text-slate-900">{{ group.title }}</p>
              <p class="mt-1 font-mono text-[11px] leading-5 text-slate-600">
                x: {{ group.raw.x }}<br>
                y: {{ group.raw.y }}
              </p>
            </div>
          </div>
          <div v-else class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4">
            <p class="text-sm font-semibold text-slate-900">调试数据会在识别后显示</p>
            <p class="mt-2 text-xs leading-5 text-slate-600">主要用于快速确认是否抓到了合理的肩和髋代理点。</p>
          </div>
        </div>
      </details>

      <div class="grid grid-cols-2 gap-2">
        <button
          @click="handlePrimaryMobileAction"
          :disabled="primaryActionDisabled"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="primaryActionClass"
        >
          <component :is="primaryActionIcon" class="h-4 w-4" />
          {{ primaryActionLabel }}
        </button>
        <button
          @click="handleReset"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
        >
          <RefreshCw class="h-4 w-4" />
          重新选择
        </button>
      </div>
    </section>

    <GuidedCamera
      v-if="showGuidedCamera"
      @capture="handleGuidedCapture"
      @close="showGuidedCamera = false"
    />
  </div>
</template>

<script>
import { computed, ref, onMounted, watch } from 'vue'
import {
  Camera,
  FolderOpen,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  RefreshCw,
  Clock3,
  ImagePlus,
  ScanLine,
  Lock,
  Ruler,
  Sparkles,
  Activity,
  ArrowRight,
} from 'lucide-vue-next'
import { calculateMetrics } from '../utils/measurement.js'
import { uploadLandmarks } from '../services/api.js'
import GuidedCamera from './GuidedCamera.vue'

export default {
  name: 'ImageCapture',
  components: {
    GuidedCamera,
    Camera,
    FolderOpen,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Send,
    RefreshCw,
    Clock3,
    ImagePlus,
    ScanLine,
    Lock,
    Ruler,
    Sparkles,
    Activity,
    ArrowRight,
  },
  emits: ['landmarks-detected', 'upload-complete', 'submit-ready'],
  setup(props, { emit }) {
    const isWeChatWebView = detectWeChatWebView()
    const showGuidedCamera = ref(false)
    const fileInput = ref(null)
    const canvasElement = ref(null)
    const imagePreview = ref(null)
    const status = ref('idle')
    const errorMessage = ref('')
    const landmarks = ref(null)
    const rawKeypoints = ref([])
    const poseScore = ref(null)
    const imageSize = ref({ width: 0, height: 0 })
    const landmarksCount = ref(0)
    const metrics = ref(null)
    const selectedFileName = ref('')
    const selectedSource = ref('')
    const pendingDetection = ref(false)

    const trustHighlights = [
      {
        title: '减少误上传',
        description: '首屏把“引导拍摄”设为主按钮，让第一次使用的家长更容易拍到合格照片。',
        icon: Camera,
      },
      {
        title: '结果前可复核',
        description: '识别后先看到关键点和指标，再决定是否提交分析，避免把低质量样本送去生成报告。',
        icon: Activity,
      },
      {
        title: '隐私提示前置',
        description: '不把数据说明藏进页脚，而是放到操作区旁边，降低医疗场景里的不确定感。',
        icon: ShieldCheck,
      },
    ]

    const captureChecklist = [
      {
        title: '背部完整入镜',
        description: '从头肩到骨盆区域尽量完整，避免肩膀或髋部被裁掉。',
      },
      {
        title: '站姿自然放松',
        description: '双脚平放地面，双臂自然下垂，不要刻意挺胸或扭转身体。',
      },
      {
        title: '背景尽量简洁',
        description: '避免强烈逆光、凌乱床品或大面积遮挡，降低算法误判概率。',
      },
      {
        title: '穿着贴身轻薄',
        description: '尽量选择便于观察肩线和骨盆轮廓的服装，避免厚外套。',
      },
    ]

    const emptyStateHints = [
      {
        title: '建议竖向拍摄',
        description: '手机竖拍更容易保留完整躯干比例，减少肩部和骨盆被裁切。',
        icon: ImagePlus,
      },
      {
        title: '距离保持 1.5-2 米',
        description: '太近会畸变，太远会让关键点尺寸过小，影响肩线判断。',
        icon: Ruler,
      },
      {
        title: '识别后再提交',
        description: '系统会先展示关键点和基础指标，确认无误再生成完整报告。',
        icon: Sparkles,
      },
    ]

    const privacyNotes = [
      {
        title: '图像先在浏览器内完成骨骼关键点提取',
        description: '系统优先在本地完成姿态识别，只在后续分析阶段上传结构化数据。',
      },
      {
        title: '结果仅作为家庭初筛参考',
        description: '页面会提供异常提醒和建议，但无法替代医生面诊或 X 光 Cobb 角测量。',
      },
    ]

    onMounted(() => {
      if (isWeChatWebView) return

      scheduleDetectorPreload(async () => {
        try {
          const poseService = await loadPoseDetectionService()
          await poseService.initPoseDetector()
          console.log('姿态检测器已预加载')
        } catch (err) {
          console.error('检测器预加载失败:', err)
        }
      })
    })

    const statusLabel = computed(() => {
      const map = {
        idle: '等待照片',
        detecting: '正在识别',
        detected: '识别完成',
        uploading: '提交分析中',
        error: '需要重试',
      }
      return map[status.value] || '等待照片'
    })

    const statusPillClass = computed(() => {
      const map = {
        idle: 'border border-slate-200 bg-slate-50 text-slate-600',
        detecting: 'bg-blue-50 text-blue-700 border border-blue-200',
        detected: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        uploading: 'bg-amber-50 text-amber-700 border border-amber-200',
        error: 'bg-rose-50 text-rose-700 border border-rose-200',
      }
      return map[status.value] || map.idle
    })

    const workflowSteps = computed(() => {
      const hasImage = !!imagePreview.value
      const firstDone = hasImage || status.value === 'detecting' || status.value === 'detected' || status.value === 'uploading' || status.value === 'error'
      const secondDone = status.value === 'detected' || status.value === 'uploading'
      const secondActive = status.value === 'detecting' || status.value === 'error'
      const thirdActive = status.value === 'uploading'

      return [
        buildStepState(
          '准备照片',
          '打开引导相机或选择已有背部照片，系统优先帮助你拍到可识别的样本。',
          hasImage ? 'completed' : 'active',
          hasImage ? '已完成' : '进行中'
        ),
        buildStepState(
          '自动识别关键点',
          '照片载入后自动进行骨骼识别，并给出拍摄质量与基础指标。',
          secondDone ? 'completed' : secondActive ? 'active' : firstDone ? 'active' : 'upcoming',
          secondDone ? '已完成' : secondActive ? '识别中' : '待开始'
        ),
        buildStepState(
          '提交并生成报告',
          '确认关键点稳定后再提交，进入结果页查看指标、解读和下载报告。',
          thirdActive ? 'active' : status.value === 'detected' ? 'active' : secondDone ? 'upcoming' : 'upcoming',
          thirdActive ? '处理中' : status.value === 'detected' ? '可执行' : '待开始'
        ),
      ]
    })

    const statusMeta = computed(() => {
      const meta = {
        idle: {
          title: '还没有开始识别',
          description: '优先使用“引导相机”拍摄，能更容易保证肩线、骨盆和站姿处于可识别状态。',
          icon: ImagePlus,
          panelClass: 'border-slate-200 bg-slate-50/90',
          iconWrapClass: 'bg-white border border-slate-200',
          iconClass: 'text-slate-700',
          actions: [
            {
              title: '拍摄优先级',
              description: '第一次使用时，建议直接走引导拍摄，避免因为角度偏差反复上传。',
              icon: Camera,
            },
            {
              title: '已有照片也能用',
              description: '如果相册里已有清晰背部照片，可直接上传并立即开始识别。',
              icon: FolderOpen,
            },
          ],
        },
        detecting: {
          title: '系统正在计算骨骼关键点',
          description: '这一步会先确认肩膀、骨盆和躯干中线位置，通常几秒内完成。',
          icon: Loader2,
          panelClass: 'border-blue-200 bg-blue-50',
          iconWrapClass: 'bg-white border border-blue-200',
          iconClass: 'text-blue-700 animate-spin',
          actions: [
            {
              title: '请稍候',
              description: '识别时不要重复切换照片，等待当前样本计算结束即可。',
              icon: Clock3,
            },
            {
              title: '结果会先展示摘要',
              description: '系统不会直接跳转，你可以先看识别是否稳定，再决定是否提交分析。',
              icon: Sparkles,
            },
          ],
        },
        detected: {
          title: '关键点识别完成，可以提交分析',
          description: `已检测到 ${landmarksCount.value} 个可见关键点。建议先确认叠加线条是否贴合身体，再生成结果报告。`,
          icon: CheckCircle2,
          panelClass: 'border-emerald-200 bg-emerald-50',
          iconWrapClass: 'bg-white border border-emerald-200',
          iconClass: 'text-emerald-700',
          actions: [
            {
              title: '先看肩线和骨盆',
              description: '如果关键点明显偏离人体边缘，建议重新拍摄，不要直接提交。',
              icon: Activity,
            },
            {
              title: '确认后再生成报告',
              description: '提交分析后会进入结果页，展示风险等级、建议和下载报告入口。',
              icon: ArrowRight,
            },
          ],
        },
        uploading: {
          title: '正在生成筛查结果',
          description: '正在提交结构化数据并请求分析结果，请保持页面开启。',
          icon: Loader2,
          panelClass: 'border-amber-200 bg-amber-50',
          iconWrapClass: 'bg-white border border-amber-200',
          iconClass: 'text-amber-700 animate-spin',
          actions: [
            {
              title: '即将进入结果页',
              description: '结果页会提供指标卡片、分析说明和下载报告功能。',
              icon: Sparkles,
            },
          ],
        },
        error: {
          title: '这张照片没有通过识别',
          description: errorMessage.value || '请重新拍摄或改用另一张更清晰、姿态更标准的照片。',
          icon: AlertCircle,
          panelClass: 'border-rose-200 bg-rose-50',
          iconWrapClass: 'bg-white border border-rose-200',
          iconClass: 'text-rose-700',
          actions: [
            {
              title: '优先检查入镜范围',
              description: '确认孩子背部完整入镜，肩膀和骨盆不要被裁掉。',
              icon: Ruler,
            },
            {
              title: '换更自然的站姿',
              description: '避免弯腰、侧身或手臂抬起，减少关键点缺失。',
              icon: Camera,
            },
          ],
        },
      }

      return meta[status.value] || meta.idle
    })

    const statusTitle = computed(() => statusMeta.value.title)
    const statusDescription = computed(() => statusMeta.value.description)
    const statusIcon = computed(() => statusMeta.value.icon)
    const statusPanelClass = computed(() => statusMeta.value.panelClass)
    const statusIconWrapClass = computed(() => statusMeta.value.iconWrapClass)
    const statusIconClass = computed(() => statusMeta.value.iconClass)
    const nextActions = computed(() => statusMeta.value.actions)

    const metricCards = computed(() => {
      if (!metrics.value) return []
      const cards = [
        {
          label: '肩膀高度差',
          value: `${metrics.value.shoulderHeightDiffPx.toFixed(1)} px`,
          tip: '用于判断左右肩是否存在明显高低差。',
        },
        {
          label: '肩部倾斜角',
          value: `${metrics.value.shoulderSlopeDeg.toFixed(1)}°`,
          tip: '角度越大，肩线不对称越明显。',
        },
        {
          label: '骨盆倾斜角',
          value: `${metrics.value.pelvisTiltDeg.toFixed(1)}°`,
          tip: '可辅助观察躯干与骨盆平衡情况。',
        },
        {
          label: '脊柱曲线估计',
          value: `${metrics.value.spinalCurvatureDeg.toFixed(1)}°`,
          tip: '仅供初筛参考，不等同于临床 Cobb 角。',
        },
      ]
      if (metrics.value.trunkShiftNorm !== null && metrics.value.trunkShiftNorm !== undefined) {
        cards.push({
          label: '躯干侧移',
          value: `${(metrics.value.trunkShiftNorm * 100).toFixed(1)}%`,
          tip: '正值=向右偏移，>5% 提示明显侧移（C7相对S1）。',
        })
      }
      if (metrics.value.headTiltDeg !== null && metrics.value.headTiltDeg !== undefined) {
        cards.push({
          label: '头部倾斜角',
          value: `${metrics.value.headTiltDeg.toFixed(1)}°`,
          tip: '正值=右耳偏低，反映头部代偿性倾斜。',
        })
      }
      if (metrics.value.ankleCompensationRatio !== null && metrics.value.ankleCompensationRatio !== undefined) {
        cards.push({
          label: '踝部代偿比',
          value: metrics.value.ankleCompensationRatio.toFixed(3),
          tip: '>0.1 提示重心代偿性偏移，可能与脊柱侧弯相关。',
        })
      }
      return cards
    })

    const mobileHintText = computed(() => {
      if (status.value === 'detected') return '图片下方会直接展示指标和提交按钮'
      if (status.value === 'detecting') return '等待识别结束，结果会直接显示在图片下方'
      if (status.value === 'error') return '建议直接重新选图，不必再往下翻找按钮'
      if (imagePreview.value) return '当前照片已载入，操作和指标会跟在图片下方'
      return '先拍摄或上传，再在同一屏查看识别结果'
    })

    const primaryActionLabel = computed(() => {
      if (status.value === 'detected') return '提交分析'
      if (status.value === 'detecting') return '识别中'
      if (status.value === 'error') return '重新识别'
      return '等待识别'
    })

    const primaryActionIcon = computed(() => {
      if (status.value === 'detected') return Send
      if (status.value === 'detecting') return Loader2
      if (status.value === 'error') return RefreshCw
      return Clock3
    })

    const primaryActionDisabled = computed(() => status.value !== 'detected')

    const primaryActionClass = computed(() => (
      status.value === 'detected'
        ? 'bg-slate-950 text-white'
        : 'border border-slate-200 bg-slate-100 text-slate-500'
    ))

    const debugSummary = computed(() => {
      if (!rawKeypoints.value.length || !imageSize.value.width || !imageSize.value.height) return null
      return {
        poseScore: poseScore.value !== null ? poseScore.value.toFixed(3) : 'N/A',
        visibleKeypoints: rawKeypoints.value.filter((kp) => (kp.score ?? 0) >= 0.3).length,
        imageSize: `${imageSize.value.width} × ${imageSize.value.height}`,
      }
    })

    const debugLandmarkGroups = computed(() => {
      if (!rawKeypoints.value.length || !landmarks.value?.length) return []

      const groups = [
        { id: 'left-shoulder', title: '左肩代理点', rawIndex: 5, landmarkIndex: 11 },
        { id: 'right-shoulder', title: '右肩代理点', rawIndex: 6, landmarkIndex: 12 },
        { id: 'left-hip', title: '左髋代理点', rawIndex: 11, landmarkIndex: 23 },
        { id: 'right-hip', title: '右髋代理点', rawIndex: 12, landmarkIndex: 24 },
        { id: 'left-knee', title: '左膝参考点', rawIndex: 13, landmarkIndex: 25 },
        { id: 'right-knee', title: '右膝参考点', rawIndex: 14, landmarkIndex: 26 },
      ]

      return groups.map((group) => {
        const raw = rawKeypoints.value[group.rawIndex]
        const mapped = landmarks.value[group.landmarkIndex]
        return {
          id: group.id,
          title: group.title,
          movenetLabel: `MoveNet ${group.rawIndex}`,
          landmarkLabel: `Landmark ${group.landmarkIndex}`,
          raw: {
            x: formatDebugValue(raw?.x),
            y: formatDebugValue(raw?.y),
            score: formatDebugValue(raw?.score),
          },
          mapped: {
            x: formatDebugValue(mapped?.x),
            y: formatDebugValue(mapped?.y),
            visibility: formatDebugValue(mapped?.visibility),
          },
        }
      })
    })

    const formattedDebugJson = computed(() => {
      if (!rawKeypoints.value.length) return ''
      return JSON.stringify(rawKeypoints.value, null, 2)
    })

    const triggerFileInput = () => {
      fileInput.value?.click()
    }

    const handleFileSelect = (event) => {
      const file = event.target.files?.[0]
      if (!file) return
      processImageFile(file, '相册上传')
    }

    const handleGuidedCapture = (file) => {
      showGuidedCamera.value = false
      processImageFile(file, '引导拍摄')
    }

    const processImageFile = (file, sourceLabel) => {
      status.value = 'idle'
      errorMessage.value = ''
      landmarks.value = null
      rawKeypoints.value = []
      poseScore.value = null
      imageSize.value = { width: 0, height: 0 }
      landmarksCount.value = 0
      metrics.value = null
      selectedFileName.value = file.name || `spine-${Date.now()}.jpg`
      selectedSource.value = sourceLabel
      pendingDetection.value = true

      const reader = new FileReader()
      reader.onload = (event) => {
        const nextImageSrc = event.target?.result || null
        imagePreview.value = nextImageSrc
        if (nextImageSrc) {
          detectPoseFromSource(nextImageSrc)
        }
      }
      reader.readAsDataURL(file)
    }

    const detectPoseFromSource = async (imageSrc) => {
      status.value = 'detecting'
      errorMessage.value = ''

      try {
        const poseService = await loadPoseDetectionService()
        await poseService.initPoseDetector()
        const sourceImage = await loadImageForDetection(imageSrc)
        pendingDetection.value = false

        if (canvasElement.value) {
          syncCanvasDisplaySize(canvasElement.value, sourceImage.naturalWidth || sourceImage.width, sourceImage.naturalHeight || sourceImage.height)
          drawSourceImage(canvasElement.value, sourceImage)
        }

        const result = await poseService.detectPose(sourceImage)

        if (!result || !result.landmarks) {
          throw new Error('未检测到人体姿态，请确保照片中有完整的背部')
        }

        landmarks.value = result.landmarks
        rawKeypoints.value = result.keypoints || []
        poseScore.value = result.score ?? null
        landmarksCount.value = result.keypoints.filter(kp => (kp.score ?? 0) > 0.3).length

        const imageWidth = sourceImage.naturalWidth || sourceImage.width
        const imageHeight = sourceImage.naturalHeight || sourceImage.height
        imageSize.value = { width: imageWidth, height: imageHeight }
        metrics.value = calculateMetrics(result.landmarks, imageWidth, imageHeight)

        if (canvasElement.value) {
          syncCanvasDisplaySize(canvasElement.value, imageWidth, imageHeight)
          poseService.drawPose(canvasElement.value, result.keypoints, imageWidth, imageHeight, sourceImage, {
            landmarks: result.landmarks,
            metrics: metrics.value,
          })
        }

        status.value = 'detected'
        emit('landmarks-detected', { landmarks: result.landmarks, metrics: metrics.value })
      } catch (err) {
        console.error('姿态检测失败:', err)
        pendingDetection.value = false
        status.value = 'error'
        errorMessage.value = normalizeDetectionError(err, isWeChatWebView)
      }
    }

    const handleUpload = async () => {
      if (!landmarks.value || !metrics.value) return
      // 先通知父组件"准备提交"，父组件决定是否进入前屈步骤
      emit('submit-ready', { landmarks: landmarks.value, metrics: metrics.value })
    }

    const doUpload = async () => {
      if (!landmarks.value || !metrics.value) return

      status.value = 'uploading'

      try {
        const response = await uploadLandmarks(landmarks.value, metrics.value)
        console.log('上传成功:', response)
        emit('upload-complete', response)
      } catch (err) {
        console.error('上传失败:', err)
        status.value = 'error'
        errorMessage.value = '上传失败: ' + (err.response?.data?.detail || err.message)
      }
    }

    const handleReset = () => {
      imagePreview.value = null
      status.value = 'idle'
      landmarks.value = null
      rawKeypoints.value = []
      poseScore.value = null
      imageSize.value = { width: 0, height: 0 }
      metrics.value = null
      errorMessage.value = ''
      selectedFileName.value = ''
      selectedSource.value = ''
      pendingDetection.value = false
      landmarksCount.value = 0

      if (canvasElement.value) {
        const ctx = canvasElement.value.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height)
        }
      }

      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }

    const handlePrimaryMobileAction = () => {
      if (status.value === 'detected') {
        handleUpload()
      }
    }

    return {
      fileInput,
      canvasElement,
      imagePreview,
      status,
      selectedFileName,
      selectedSource,
      metrics,
      mobileHintText,
      primaryActionLabel,
      primaryActionIcon,
      primaryActionDisabled,
      primaryActionClass,
      debugSummary,
      debugLandmarkGroups,
      formattedDebugJson,
      landmarksCount,
      trustHighlights,
      captureChecklist,
      emptyStateHints,
      privacyNotes,
      workflowSteps,
      statusLabel,
      statusPillClass,
      statusTitle,
      statusDescription,
      statusIcon,
      statusPanelClass,
      statusIconWrapClass,
      statusIconClass,
      nextActions,
      metricCards,
      showGuidedCamera,
      triggerFileInput,
      handleFileSelect,
      handleGuidedCapture,
      handlePrimaryMobileAction,
      handleUpload,
      doUpload,
      handleReset,
    }
  }
}

function formatDebugValue(value) {
  return typeof value === 'number' ? value.toFixed(4) : 'N/A'
}

let poseDetectionServicePromise = null

function loadPoseDetectionService() {
  if (!poseDetectionServicePromise) {
    poseDetectionServicePromise = import('../services/poseDetection.js').catch((err) => {
      poseDetectionServicePromise = null
      throw err
    })
  }

  return poseDetectionServicePromise
}

function detectWeChatWebView() {
  if (typeof navigator === 'undefined') return false
  return /MicroMessenger/i.test(navigator.userAgent || '')
}

function scheduleDetectorPreload(task) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => {
      task()
    }, { timeout: 2500 })
    return
  }

  window.setTimeout(task, 400)
}

function normalizeDetectionError(err, isWeChatWebView = false) {
  const rawMessage = err?.message || '检测失败，请重试'
  console.error('姿态检测原始错误:', rawMessage, err)

  // 在移动端暂时显示原始错误信息，方便定位问题
  const debugInfo = rawMessage

  if (/backend|TensorFlow|MoveNet|WebGL|初始化/i.test(rawMessage)) {
    return isWeChatWebView
      ? '微信内置浏览器已切换为延迟加载模式，但当前设备仍未完成骨骼识别初始化，请稍后重试。'
      : '初始化失败: ' + debugInfo
  }

  if (/Failed to fetch/i.test(rawMessage)) {
    return '下载失败: ' + debugInfo
  }

  return debugInfo
}

function loadImageForDetection(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('无法加载图像，请重新选择或拍摄'))
    image.src = src
  })
}

function syncCanvasDisplaySize(canvas, imageWidth, imageHeight) {
  if (!canvas || !imageWidth || !imageHeight) return

  canvas.style.aspectRatio = `${imageWidth} / ${imageHeight}`
  canvas.style.objectFit = 'contain'
}

function drawSourceImage(canvas, image) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  canvas.width = width
  canvas.height = height
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)
}

function buildStepState(title, description, state, tag) {
  const states = {
    active: {
      statusClass: 'border-brand-teal/25 bg-teal-50/70',
      badgeClass: 'bg-brand-teal text-white shadow-[0_10px_20px_rgba(20,184,166,0.25)]',
      tagClass: 'bg-white text-brand-teal border border-teal-200',
    },
    completed: {
      statusClass: 'border-emerald-200 bg-emerald-50/70',
      badgeClass: 'bg-emerald-600 text-white',
      tagClass: 'bg-white text-emerald-700 border border-emerald-200',
    },
    upcoming: {
      statusClass: 'border-slate-200 bg-slate-50/90',
      badgeClass: 'bg-white text-slate-500 border border-slate-200',
      tagClass: 'bg-white text-slate-500 border border-slate-200',
    },
  }

  return {
    title,
    description,
    tag,
    ...states[state],
  }
}
</script>
