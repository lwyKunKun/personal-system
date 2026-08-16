"use client"
import Link from "next/link"
import React, { useEffect, useMemo, useState } from "react"
import * as LucideIcons from "lucide-react"
import { DEFAULT_SIDEBAR_ITEMS, getStoredSidebarItems, saveStoredSidebarItems, type SidebarMenuItem } from "../lib/sidebar-menu"

// app/settings/page.tsx
// 独立设置页：用于集中管理侧边栏菜单
// 支持：
// - 新增菜单项
// - 新增子菜单
// - 重命名菜单项
// - 删除菜单项
// - 上移/下移排序
// - 选择 Lucide 图标组件或保留 emoji 兜底
// - 导出/导入 JSON
// - 重置为默认配置

const LUCIDE_ICON_OPTIONS = [
  "TrendingUp",
  "BarChart3",
  "LayoutDashboard",
  "BookOpenText",
  "BriefcaseBusiness",
  "Bot",
  "BrainCircuit",
  "CandlestickChart",
  "ChartColumnBig",
  "CircleDollarSign",
  "ClipboardList",
  "FolderOpen",
  "Home",
  "Library",
  "LineChart",
  "NotebookPen",
  "Rocket",
  "Search",
  "Settings",
  "ShieldCheck",
  "Sparkles",
  "Target",
  "Wallet",
  "Newspaper",
  "Activity",
  "CalendarRange",
  "Cpu",
] as const

const ICON_MAP = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>

const renderLucidePreview = (iconName?: string, className = "h-4 w-4") => {
  const value = iconName?.trim()
  if (!value) {
    return <span className="text-base">◌</span>
  }

  const Icon = ICON_MAP[value]
  if (!Icon) {
    return <span className="text-[11px] font-semibold">{value.slice(0, 1)}</span>
  }

  return <Icon className={className} />
}

const getParentAndIndex = (nodes: SidebarMenuItem[], path: number[]) => {
  if (path.length === 0) {
    return { parent: nodes, index: -1 }
  }

  let current = nodes
  for (let i = 0; i < path.length - 1; i += 1) {
    const item = current[path[i]]
    if (!item) {
      return null
    }
    current = item.children ?? []
  }

  return { parent: current, index: path[path.length - 1] }
}

const getItemByPath = (nodes: SidebarMenuItem[], path: number[]) => {
  if (path.length === 0) {
    return undefined
  }

  let current = nodes
  let result: SidebarMenuItem | undefined

  for (const idx of path) {
    const item = current[idx]
    if (!item) {
      return undefined
    }
    result = item
    current = item.children ?? []
  }

  return result
}

export default function SettingsPage() {
  const [items, setItems] = useState<SidebarMenuItem[]>([])
  const [newLabel, setNewLabel] = useState("")
  const [newIcon, setNewIcon] = useState("")
  const [newIconName, setNewIconName] = useState("")
  const [jsonText, setJsonText] = useState("")
  const [statusText, setStatusText] = useState("")

  // 初始加载：从 localStorage 读取菜单项
  useEffect(() => {
    setItems(getStoredSidebarItems())
  }, [])

  const exportJson = useMemo(() => JSON.stringify(items, null, 2), [items])

  // 保存并同步菜单状态
  const persist = (next: SidebarMenuItem[]) => {
    setItems(next)
    saveStoredSidebarItems(next)
  }

  // 新增顶层菜单项
  const addItem = () => {
    const label = newLabel.trim()
    if (!label) {
      setStatusText("菜单名称不能为空")
      return
    }

    const iconName = newIconName.trim() || undefined
    const next = [...items, { label, icon: newIcon.trim() || undefined, iconName, active: false }]
    persist(next)
    setNewLabel("")
    setNewIcon("")
    setNewIconName("")
    setStatusText("已添加菜单项")
  }

  // 将菜单项添加为某个菜单的子菜单
  const addChildItem = (path: number[]) => {
    const label = newLabel.trim()
    if (!label) {
      setStatusText("子菜单名称不能为空")
      return
    }

    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]
      const target = getItemByPath(next, path)

      if (!target) {
        return prev
      }

      const child: SidebarMenuItem = {
        label,
        icon: newIcon.trim() || undefined,
        iconName: newIconName.trim() || undefined,
        active: false,
      }

      target.children = [...(target.children ?? []), child]
      saveStoredSidebarItems(next)
      return next
    })

    setNewLabel("")
    setNewIcon("")
    setNewIconName("")
    setStatusText("已添加子菜单")
  }

  // 更新菜单项字段
  const updateItem = (path: number[], nextValue: Partial<SidebarMenuItem>) => {
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]
      const ref = getParentAndIndex(next, path)
      if (!ref || ref.index < 0) {
        return prev
      }

      const current = ref.parent[ref.index]
      if (!current) {
        return prev
      }

      ref.parent[ref.index] = { ...current, ...nextValue }
      saveStoredSidebarItems(next)
      return next
    })
  }

  // 删除菜单项
  const removeItem = (path: number[]) => {
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]
      const ref = getParentAndIndex(next, path)
      if (!ref || ref.index < 0) {
        return prev
      }

      ref.parent.splice(ref.index, 1)
      saveStoredSidebarItems(next)
      return next
    })
    setStatusText("已删除菜单项")
  }

  // 上移/下移
  const moveItem = (path: number[], direction: "up" | "down") => {
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]
      const ref = getParentAndIndex(next, path)
      if (!ref || ref.index < 0) {
        return prev
      }

      const targetIndex = direction === "up" ? ref.index - 1 : ref.index + 1
      if (targetIndex < 0 || targetIndex >= ref.parent.length) {
        return prev
      }

      ;[ref.parent[ref.index], ref.parent[targetIndex]] = [ref.parent[targetIndex], ref.parent[ref.index]]
      saveStoredSidebarItems(next)
      return next
    })
  }

  // 导入 JSON
  const importJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as SidebarMenuItem[]
      if (!Array.isArray(parsed) || parsed.some((item) => !item.label)) {
        throw new Error("菜单数据格式错误")
      }

      persist(parsed)
      setStatusText("导入成功，已保存到本地")
    } catch (error) {
      setStatusText("导入失败：请确认 JSON 格式正确，且每项都有 label 字段")
    }
  }

  // 重置为默认菜单
  const handleReset = () => {
    persist(DEFAULT_SIDEBAR_ITEMS)
    setStatusText("已恢复默认菜单配置")
  }

  // 导出到剪贴板
  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJson)
      setStatusText("已复制 JSON 到剪贴板")
    } catch (error) {
      setStatusText("复制失败，可手动复制下方 JSON")
    }
  }

  const renderMenuEditor = (nodes: SidebarMenuItem[], path: number[] = []) =>
    nodes.map((item, index) => {
      const currentPath = [...path, index]
      const hasChildren = Array.isArray(item.children) && item.children.length > 0

      return (
        <div key={`${item.label}-${currentPath.join("-")}`} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-[#0b1220] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#111d2d] text-lg text-[#ffb476]">
              {renderLucidePreview(item.iconName, "h-5 w-5") || item.icon || "◌"}
            </div>

            <input
              value={item.label}
              onChange={(e) => updateItem(currentPath, { label: e.target.value })}
              className="min-w-[120px] flex-1 rounded-lg border border-white/8 bg-transparent px-2 py-1.5 text-slate-100 outline-none"
            />

            <input
              value={item.iconName ?? ""}
              onChange={(e) => updateItem(currentPath, { iconName: e.target.value || undefined })}
              placeholder="Lucide icon name"
              className="min-w-[150px] flex-1 rounded-lg border border-white/8 bg-transparent px-2 py-1.5 text-slate-100 outline-none"
            />

            <input
              value={item.icon ?? ""}
              onChange={(e) => updateItem(currentPath, { icon: e.target.value || undefined })}
              placeholder="emoji"
              className="w-20 rounded-lg border border-white/8 bg-transparent px-2 py-1.5 text-slate-100 outline-none"
            />

            <button type="button" onClick={() => addChildItem(currentPath)} className="rounded-md border border-white/8 bg-[#101b2d] px-2 py-1 text-xs text-slate-200">
              + 子菜单
            </button>

            <button
              type="button"
              onClick={() => moveItem(currentPath, "up")}
              disabled={index === 0}
              className="rounded-md border border-white/8 bg-[#101b2d] px-2 py-1 text-xs text-slate-200 disabled:opacity-40"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveItem(currentPath, "down")}
              disabled={index === nodes.length - 1}
              className="rounded-md border border-white/8 bg-[#101b2d] px-2 py-1 text-xs text-slate-200 disabled:opacity-40"
            >
              ↓
            </button>
            <button type="button" onClick={() => removeItem(currentPath)} className="rounded-md border border-rose-500/50 bg-rose-500/10 px-2 py-1 text-xs text-rose-200">
              删除
            </button>
          </div>

          {hasChildren ? <div className="ml-6 border-l border-white/8 pl-3">{renderMenuEditor(item.children ?? [], currentPath)}</div> : null}
        </div>
      )
    })

  return (
    <main className="min-h-screen bg-[#050b17] p-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">settings</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">菜单管理</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-lg border border-white/8 bg-[#0d1628] px-4 py-2 text-sm text-slate-200 hover:text-white">
              返回首页
            </Link>
            <button type="button" onClick={handleReset} className="rounded-lg bg-[#f68f4d] px-4 py-2 text-sm font-medium text-white">
              恢复默认
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-white/8 bg-[#0d1628] p-5">
          <div className="mb-4 text-lg font-medium text-white">新增菜单项</div>
          <div className="flex flex-col gap-3 md:flex-row md:items-start">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="输入菜单名称"
              className="flex-1 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-slate-100 outline-none"
            />
            <input
              value={newIconName}
              onChange={(e) => setNewIconName(e.target.value)}
              placeholder="Lucide 图标名，例如：BarChart3"
              className="w-56 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-slate-100 outline-none"
            />
            <input
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="emoji 兜底"
              className="w-28 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-slate-100 outline-none"
            />
            <button type="button" onClick={addItem} className="rounded-xl bg-[#f68f4d] px-4 py-2.5 text-sm font-medium text-white">
              添加菜单
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {LUCIDE_ICON_OPTIONS.map((iconName) => {
              const Icon = ICON_MAP[iconName]
              const active = newIconName === iconName

              return (
                <button
                  key={iconName}
                  type="button"
                  title={iconName}
                  onClick={() => setNewIconName(iconName)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    active ? "border-[#f68f4d] bg-[#f68f4d]/15 text-[#ffb476]" : "border-white/8 bg-[#0b1220] text-slate-200 hover:border-[#f68f4d]/40"
                  }`}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : <span className="text-[11px] font-semibold">{iconName.slice(0, 1)}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-medium text-white">当前菜单</div>
              <div className="text-xs text-slate-400">{items.length} 项</div>
            </div>

            <div className="space-y-3">{renderMenuEditor(items)}</div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-5">
            <div className="mb-4 text-lg font-medium text-white">导出与导入</div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={copyExport}
                className="w-full rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-100 hover:border-[#f68f4d]/50"
              >
                复制菜单 JSON
              </button>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="在此粘贴 JSON 导入菜单数据"
                className="min-h-[140px] w-full rounded-xl border border-white/8 bg-[#0b1220] p-3 text-sm text-slate-100 outline-none"
              />

              <button type="button" onClick={importJson} className="w-full rounded-xl bg-[#f68f4d] px-3 py-2 text-sm font-medium text-white">
                导入 JSON
              </button>

              <div className="rounded-xl border border-white/8 bg-[#091321] p-3 text-xs text-slate-300">{statusText || "菜单配置会自动保存到浏览器本地存储。"}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/8 bg-[#0d1628] p-5">
          <div className="mb-2 text-lg font-medium text-white">当前 JSON</div>
          <pre className="overflow-x-auto rounded-xl bg-[#091321] p-3 text-xs text-slate-300">{exportJson}</pre>
        </div>
      </div>
    </main>
  )
}
