"use client"
import Link from "next/link"
import React, { useEffect, useMemo, useState } from "react"
import * as LucideIcons from "lucide-react"
import { filterSidebarItemsByRoles } from "../lib/access"
import { DEFAULT_SIDEBAR_ITEMS, getStoredSidebarItems, saveStoredSidebarItems, type SidebarMenuItem } from "../lib/sidebar-menu"
import { DEFAULT_USER_PROFILE, getCurrentUserProfile, saveCurrentUserProfile } from "../lib/user"

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

const ROLE_STRATEGIES: Array<{ id: string; label: string; roles: string[] }> = [
  { id: "public", label: "全部开放", roles: [] },
  { id: "admin", label: "管理员", roles: ["admin"] },
  { id: "user", label: "普通用户", roles: ["user"] },
  { id: "admin-user", label: "管理员 + 用户", roles: ["admin", "user"] },
]

const ROLE_TEMPLATES: Array<{ id: string; label: string; description: string; roles: string[]; visible?: boolean }> = [
  { id: "full-control", label: "全控端", description: "系统 + 项目 + 个人全部启用", roles: ["admin", "user"], visible: true },
  { id: "admin-only", label: "管理员端", description: "仅面向管理员", roles: ["admin"], visible: true },
  { id: "member-readonly", label: "成员端", description: "成员可见，管理员保留控制", roles: ["user"], visible: true },
  { id: "public-readonly", label: "公开端", description: "无权限门槛，适合概览菜单", roles: [], visible: true },
  { id: "internal-hidden", label: "内控隐藏", description: "隐藏系统管理节点，保留对外入口", roles: ["admin", "user"], visible: false },
]

const ROLE_PREVIEW_OPTIONS: Array<{ id: string; label: string; roles: string[] }> = [
  { id: "admin-user", label: "管理员 + 用户", roles: ["admin", "user"] },
  { id: "admin", label: "管理员", roles: ["admin"] },
  { id: "user", label: "普通用户", roles: ["user"] },
  { id: "public", label: "公开视图", roles: [] },
]

const MENU_TEMPLATES: Array<{ id: string; label: string; items: SidebarMenuItem[] }> = [
  {
    id: "default",
    label: "默认导航",
    items: DEFAULT_SIDEBAR_ITEMS,
  },
  {
    id: "system-first",
    label: "系统优先",
    items: [
      {
        id: "system",
        label: "系统",
        group: "system",
        visible: true,
        sortOrder: 10,
        iconName: "Settings",
        children: [
          { id: "system-menus", label: "菜单管理", group: "system", visible: true, sortOrder: 10, iconName: "PanelTop", path: "/system/menus" },
          { id: "system-routes", label: "路由管理", group: "system", visible: true, sortOrder: 20, iconName: "Route", path: "/system/routes" },
          { id: "system-permissions", label: "权限管理", group: "system", visible: true, sortOrder: 30, iconName: "ShieldCheck", path: "/system/permissions" },
        ],
      },
      {
        id: "project",
        label: "项目",
        group: "project",
        visible: true,
        sortOrder: 20,
        iconName: "FolderOpen",
        children: [
          { id: "project-stock", label: "股票", group: "project", visible: true, sortOrder: 10, iconName: "CandlestickChart", path: "/projects/stock" },
          { id: "project-bookshelf", label: "书架", group: "project", visible: true, sortOrder: 20, iconName: "Library", path: "/projects/bookshelf" },
        ],
      },
      {
        id: "personal",
        label: "个人",
        group: "personal",
        visible: true,
        sortOrder: 30,
        iconName: "UserRound",
        children: [
          { id: "personal-recent", label: "最近", group: "personal", visible: true, sortOrder: 10, iconName: "Clock3", path: "/personal/recent" },
          { id: "personal-favorites", label: "收藏", group: "personal", visible: true, sortOrder: 20, iconName: "Star", path: "/personal/favorites" },
        ],
      },
    ],
  },
  {
    id: "workspace",
    label: "工作区",
    items: [
      {
        id: "project",
        label: "项目",
        group: "project",
        visible: true,
        sortOrder: 10,
        iconName: "FolderOpen",
        children: [
          { id: "project-ai", label: "AI 算法", group: "project", visible: true, sortOrder: 10, iconName: "BrainCircuit", path: "/projects/ai" },
          { id: "project-records", label: "研究记录", group: "project", visible: true, sortOrder: 20, iconName: "NotebookPen", path: "/projects/records" },
          { id: "project-llm-wiki", label: "llm-wiki", group: "project", visible: true, sortOrder: 30, iconName: "BookOpenText", path: "/projects/llm-wiki" },
        ],
      },
      {
        id: "personal",
        label: "个人",
        group: "personal",
        visible: true,
        sortOrder: 20,
        iconName: "UserRound",
        children: [
          { id: "personal-common", label: "常用", group: "personal", visible: true, sortOrder: 10, iconName: "Sparkles", path: "/personal/common" },
          { id: "personal-favorites", label: "收藏", group: "personal", visible: true, sortOrder: 20, iconName: "Star", path: "/personal/favorites" },
        ],
      },
    ],
  },
]

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
  const [newPath, setNewPath] = useState("")
  const [newRoles, setNewRoles] = useState("")
  const [newGroup, setNewGroup] = useState<"system" | "project" | "personal">("project")
  const [newVisible, setNewVisible] = useState(true)
  const [jsonText, setJsonText] = useState("")
  const [showJson, setShowJson] = useState(false)
  const [statusText, setStatusText] = useState("")
  const [selectedPath, setSelectedPath] = useState<number[] | null>(null)
  const [draggedPath, setDraggedPath] = useState<number[] | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [propertySections, setPropertySections] = useState<Record<string, boolean>>({
    basics: true,
    display: true,
    access: true,
    actions: true,
  })
  const [profileName, setProfileName] = useState(DEFAULT_USER_PROFILE.name)
  const [profileRoles, setProfileRoles] = useState(DEFAULT_USER_PROFILE.roles.join(", "))
  const [previewRoles, setPreviewRoles] = useState<string[]>(DEFAULT_USER_PROFILE.roles)

  // 初始加载：从 localStorage 读取菜单项
  useEffect(() => {
    setItems(getStoredSidebarItems())

    const user = getCurrentUserProfile()
    setProfileName(user.name)
    setProfileRoles(user.roles.join(", "))
  }, [])

  const exportJson = useMemo(() => JSON.stringify(items, null, 2), [items])
  const previewTree = useMemo(() => filterSidebarItemsByRoles(items, previewRoles), [items, previewRoles])

  const countVisibleNodes = (nodes: SidebarMenuItem[]): number => nodes.reduce((count, item) => count + 1 + countVisibleNodes(item.children ?? []), 0)

  const totalVisibleNodes = countVisibleNodes(previewTree)
  const totalMenuNodes = countVisibleNodes(items)

  // 保存并同步菜单状态
  const persist = (next: SidebarMenuItem[]) => {
    setItems(next)
    saveStoredSidebarItems(next)
  }

  const saveConfig = () => {
    persist(items)
    setStatusText("已保存菜单配置")
  }

  const applyRoleStrategy = (roles: string[]) => {
    if (!selectedPath) {
      setStatusText("请先在左侧选择一个菜单节点")
      return
    }

    updateItem(selectedPath, { roles: roles.length > 0 ? roles : undefined })
    setStatusText(`已应用权限策略：${roles.length ? roles.join(", ") : "公开"}`)
  }

  const applyPermissionTemplate = (template: { roles: string[]; visible?: boolean }) => {
    if (!selectedPath) {
      setStatusText("请先在左侧选择一个菜单节点")
      return
    }

    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]
      const ref = getParentAndIndex(next, selectedPath)
      if (!ref || ref.index < 0) {
        return prev
      }

      const applyToNode = (node: SidebarMenuItem): SidebarMenuItem => ({
        ...node,
        roles: template.roles.length > 0 ? [...template.roles] : undefined,
        visible: template.visible ?? node.visible ?? true,
        children: node.children ? node.children.map((child) => applyToNode(child)) : undefined,
      })

      ref.parent[ref.index] = applyToNode(ref.parent[ref.index])
      saveStoredSidebarItems(next)
      return next
    })

    setStatusText(`已应用权限模板：${template.roles.length ? template.roles.join(", ") : "公开"}`)
  }

  const applyMenuTemplate = (template: SidebarMenuItem[]) => {
    const normalized = template.map((item) => ({ ...item, children: item.children?.map((child) => ({ ...child })) }))
    persist(normalized)
    setSelectedPath(normalized.length > 0 ? [0] : null)
    setStatusText(`已应用模板：${template[0]?.label ?? "自定义"}`)
  }

  // 新增顶层菜单项
  const addItem = () => {
    const label = newLabel.trim()
    if (!label) {
      setStatusText("菜单名称不能为空")
      return
    }

    const iconName = newIconName.trim() || undefined
    const path = newPath.trim() || undefined
    const roles = newRoles.trim()
      ? newRoles
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined
    const next = [
      ...items,
      {
        label,
        group: newGroup,
        icon: newIcon.trim() || undefined,
        iconName,
        path,
        roles,
        visible: newVisible,
        sortOrder: items.length,
        active: false,
      },
    ]
    persist(next)
    setNewLabel("")
    setNewIcon("")
    setNewIconName("")
    setNewPath("")
    setNewRoles("")
    setNewGroup("project")
    setNewVisible(true)
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
        group: newGroup,
        icon: newIcon.trim() || undefined,
        iconName: newIconName.trim() || undefined,
        active: false,
        visible: newVisible,
        sortOrder: target.children?.length ?? 0,
        path: newPath.trim() || undefined,
        roles: newRoles.trim()
          ? newRoles
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      }

      target.children = [...(target.children ?? []), child]
      saveStoredSidebarItems(next)
      return next
    })

    setNewLabel("")
    setNewIcon("")
    setNewIconName("")
    setNewPath("")
    setNewRoles("")
    setNewGroup("project")
    setNewVisible(true)
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

  const saveProfile = () => {
    const roles = profileRoles
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    const nextProfile = {
      name: profileName.trim() || DEFAULT_USER_PROFILE.name,
      roles: roles.length > 0 ? roles : DEFAULT_USER_PROFILE.roles,
    }
    saveCurrentUserProfile(nextProfile)
    setStatusText("已保存用户角色与名称")
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

  const flattenTreeKeys = (nodes: SidebarMenuItem[], path: number[] = []): string[] =>
    nodes.flatMap((item, index) => {
      const currentPath = [...path, index]
      const key = currentPath.join(".")
      const children = Array.isArray(item.children) && item.children.length > 0 ? flattenTreeKeys(item.children, currentPath) : []
      return [key, ...children]
    })

  const toggleNode = (path: number[]) => {
    const key = path.join(".")
    setExpanded((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }))
  }

  const expandAll = () => {
    const next = Object.fromEntries(flattenTreeKeys(items).map((key) => [key, true]))
    setExpanded(next)
  }

  const collapseAll = () => {
    const next = Object.fromEntries(flattenTreeKeys(items).map((key) => [key, false]))
    setExpanded(next)
  }

  const reorderTree = (source: number[], target: number[]) => {
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]
      const sourceParent = getParentAndIndex(next, source)
      const targetParent = getParentAndIndex(next, target)

      if (!sourceParent || !targetParent || sourceParent.index < 0 || targetParent.index < 0) {
        return prev
      }

      if (sourceParent.parent === targetParent.parent && sourceParent.index === targetParent.index) {
        return prev
      }

      const [movedItem] = sourceParent.parent.splice(sourceParent.index, 1)
      targetParent.parent.splice(targetParent.index, 0, movedItem)
      saveStoredSidebarItems(next)
      return next
    })
  }

  const renderTree = (nodes: SidebarMenuItem[], path: number[] = []) =>
    nodes.map((item, index) => {
      const currentPath = [...path, index]
      const key = currentPath.join(".")
      const hasChildren = Array.isArray(item.children) && item.children.length > 0
      const isExpanded = expanded[key] !== false
      const isSelected = selectedPath && selectedPath.join(".") === key

      return (
        <div key={key} className="space-y-2">
          <div
            draggable={true}
            onDragStart={() => setDraggedPath(currentPath)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              if (draggedPath) {
                reorderTree(draggedPath, currentPath)
                setDraggedPath(null)
              }
            }}
            className={`flex items-center gap-2 rounded-xl border px-2 py-2 transition ${isSelected ? "border-[#f68f4d]/60 bg-[#121d32]" : "border-white/8 bg-[#0b1220] hover:border-white/12"}`}
          >
            <button
              type="button"
              onClick={() => hasChildren && toggleNode(currentPath)}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-white/8 bg-[#101b2d] text-xs text-slate-200"
            >
              {hasChildren ? (isExpanded ? "▾" : "▸") : "•"}
            </button>

            <button type="button" onClick={() => setSelectedPath(currentPath)} className="flex flex-1 items-center gap-2 overflow-hidden text-left">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111d2d] text-[#ffb476]">
                {renderLucidePreview(item.iconName, "h-4 w-4") || item.icon || "◌"}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-medium ${item.visible === false ? "text-slate-500 line-through" : "text-slate-100"}`}>{item.label}</span>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-400">{item.group ?? "project"}</span>
              </span>
            </button>

            <button type="button" onClick={() => addChildItem(currentPath)} className="rounded-md border border-white/8 bg-[#101b2d] px-2 py-1 text-[10px] text-slate-200">
              +
            </button>
          </div>

          {hasChildren && isExpanded ? <div className="ml-4 border-l border-white/8 pl-2">{renderTree(item.children ?? [], currentPath)}</div> : null}
        </div>
      )
    })

  const renderPreviewTree = (nodes: SidebarMenuItem[], depth = 0) =>
    nodes.map((item, index) => {
      const currentPath = `${depth}-${index}`
      const hasChildren = Array.isArray(item.children) && item.children.length > 0

      return (
        <div key={currentPath} className="space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-[#0b1220] px-2 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#111d2d] text-[#ffb476]">
              {renderLucidePreview(item.iconName, "h-4 w-4") || item.icon || "◌"}
            </span>
            <span className="flex-1 truncate text-sm text-slate-100">{item.label}</span>
            {hasChildren ? <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{item.children?.length} 子项</span> : null}
          </div>
          {hasChildren ? <div className="ml-4 space-y-2 border-l border-white/8 pl-2">{renderPreviewTree(item.children ?? [], depth + 1)}</div> : null}
        </div>
      )
    })

  const selectedItem = selectedPath ? getItemByPath(items, selectedPath) : undefined

  const togglePropertySection = (key: string) => {
    setPropertySections((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }))
  }

  const PropertySection = ({ title, keyName, children }: { title: string; keyName: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-white/8 bg-[#091321] p-3">
      <button type="button" onClick={() => togglePropertySection(keyName)} className="flex w-full items-center justify-between text-left text-sm font-medium text-white">
        <span>{title}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{propertySections[keyName] !== false ? "收起" : "展开"}</span>
      </button>
      {propertySections[keyName] !== false ? <div className="mt-3">{children}</div> : null}
    </div>
  )

  return (
    <main className="min-h-screen bg-[#050b17] p-5 text-slate-100 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">settings</div>
            <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">菜单配置工作台</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleReset} className="rounded-xl bg-[#f68f4d] px-3.5 py-2 text-sm font-medium text-white">
              恢复默认
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-medium text-white">新增菜单</div>
              <div className="flex gap-2 text-[11px] text-slate-400">
                <span className="rounded-full border border-white/8 px-2 py-1">{items.length} 项</span>
                <span className="rounded-full border border-white/8 px-2 py-1">{items.filter((item) => item.visible !== false).length} 可见</span>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {MENU_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyMenuTemplate(template.items)}
                  className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200"
                >
                  {template.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="菜单名称"
                className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="路径 /projects/stock"
                className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <input
                value={newRoles}
                onChange={(e) => setNewRoles(e.target.value)}
                placeholder="roles：admin,user"
                className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <select
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value as "system" | "project" | "personal")}
                className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
              >
                <option value="system">system</option>
                <option value="project">project</option>
                <option value="personal">personal</option>
              </select>
              <button type="button" onClick={addItem} className="rounded-xl bg-[#f68f4d] px-3 py-2.5 text-sm font-medium text-white">
                添加菜单
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={newIconName}
                  onChange={(e) => setNewIconName(e.target.value)}
                  placeholder="Lucide icon"
                  className="w-36 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                />
                <input
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  placeholder="emoji"
                  className="w-24 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                />
                <label className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-xs text-slate-200">
                  <input type="checkbox" checked={newVisible} onChange={(e) => setNewVisible(e.target.checked)} className="h-3.5 w-3.5" />
                  visible
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {LUCIDE_ICON_OPTIONS.map((iconName) => {
                  const Icon = ICON_MAP[iconName]
                  const active = newIconName === iconName

                  return (
                    <button
                      key={iconName}
                      type="button"
                      title={iconName}
                      onClick={() => setNewIconName(iconName)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                        active ? "border-[#f68f4d] bg-[#f68f4d]/15 text-[#ffb476]" : "border-white/8 bg-[#0b1220] text-slate-200 hover:border-[#f68f4d]/40"
                      }`}
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : <span className="text-[10px] font-semibold">{iconName.slice(0, 1)}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <div className="mb-3 text-base font-medium text-white">用户角色</div>
            <div className="grid gap-3">
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="用户名"
                className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <input
                value={profileRoles}
                onChange={(e) => setProfileRoles(e.target.value)}
                placeholder="角色：admin,user"
                className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={saveProfile} className="rounded-xl bg-[#f68f4d] px-3 py-2.5 text-sm font-medium text-white">
                  保存角色
                </button>
                <button type="button" onClick={saveConfig} className="rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2.5 text-sm text-slate-100">
                  保存配置
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-[#091321] p-3">
              <div className="mb-2 text-sm font-medium text-white">权限预览</div>
              <div className="flex flex-wrap gap-2">
                {ROLE_PREVIEW_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPreviewRoles(option.roles)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
                      previewRoles.join(",") === option.roles.join(",") ? "border-[#f68f4d]/60 bg-[#f68f4d]/10 text-[#ffb476]" : "border-white/8 bg-[#101b2d] text-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-white/8 bg-[#0b1220] p-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">当前角色</div>
                <div className="mt-1 text-sm text-slate-100">{previewRoles.length > 0 ? previewRoles.join(", ") : "公开"}</div>
                <div className="mt-2 text-xs text-slate-400">
                  {totalVisibleNodes} 个可见节点 / {totalMenuNodes} 个总节点，已隐藏 {Math.max(totalMenuNodes - totalVisibleNodes, 0)} 项
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {previewTree.length > 0 ? (
                  renderPreviewTree(previewTree)
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#0b1220] p-3 text-sm text-slate-500">当前角色暂无可见菜单</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-medium text-white">菜单树</div>
              <div className="flex gap-2">
                <button type="button" onClick={expandAll} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">
                  展开全部
                </button>
                <button type="button" onClick={collapseAll} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">
                  收起全部
                </button>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={saveConfig} className="rounded-lg bg-[#f68f4d] px-2.5 py-1.5 text-[11px] font-medium text-white">
                保存配置
              </button>
              <button type="button" onClick={handleReset} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">
                重置默认
              </button>
              <button type="button" onClick={copyExport} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">
                复制 JSON
              </button>
            </div>
            <div className="space-y-3">{renderTree(items)}</div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            {selectedItem ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#091321] p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#121d32] text-[#ffb476]">
                      {renderLucidePreview(selectedItem.iconName, "h-5 w-5") || selectedItem.icon || "◌"}
                    </span>
                    <div>
                      <div className="text-sm text-slate-400">当前节点</div>
                      <div className="text-lg font-medium text-white">{selectedItem.label}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectedPath && addChildItem(selectedPath)}
                      className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      + 子菜单
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedPath && removeItem(selectedPath)}
                      className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <PropertySection title="基础信息" keyName="basics">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">标题</span>
                      <input
                        value={selectedItem.label}
                        onChange={(e) => selectedPath && updateItem(selectedPath, { label: e.target.value })}
                        className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">分组</span>
                      <select
                        value={selectedItem.group ?? "project"}
                        onChange={(e) => selectedPath && updateItem(selectedPath, { group: e.target.value as "system" | "project" | "personal" })}
                        className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
                      >
                        <option value="system">system</option>
                        <option value="project">project</option>
                        <option value="personal">personal</option>
                      </select>
                    </label>
                  </div>
                </PropertySection>

                <PropertySection title="显示设置" keyName="display">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Lucide 图标</span>
                      <input
                        value={selectedItem.iconName ?? ""}
                        onChange={(e) => selectedPath && updateItem(selectedPath, { iconName: e.target.value || undefined })}
                        className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">emoji</span>
                      <input
                        value={selectedItem.icon ?? ""}
                        onChange={(e) => selectedPath && updateItem(selectedPath, { icon: e.target.value || undefined })}
                        className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
                      />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">路径</span>
                      <input
                        value={selectedItem.path ?? ""}
                        onChange={(e) => selectedPath && updateItem(selectedPath, { path: e.target.value || undefined })}
                        className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
                      />
                    </label>
                  </div>
                </PropertySection>

                <PropertySection title="访问控制" keyName="access">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">快捷策略</div>
                      <div className="flex flex-wrap gap-2">
                        {ROLE_STRATEGIES.map((strategy) => (
                          <button
                            key={strategy.id}
                            type="button"
                            onClick={() => applyRoleStrategy(strategy.roles)}
                            className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200"
                          >
                            {strategy.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">权限模板</div>
                      <div className="space-y-2">
                        {ROLE_TEMPLATES.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => applyPermissionTemplate(template)}
                            className="w-full rounded-xl border border-white/8 bg-[#0b1220] p-2.5 text-left"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium text-slate-100">{template.label}</span>
                              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{template.visible === false ? "隐藏" : "可见"}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">{template.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">批量设置</div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => selectedPath && updateItem(selectedPath, { visible: true })}
                          className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200"
                        >
                          本层可见
                        </button>
                        <button
                          type="button"
                          onClick={() => selectedPath && updateItem(selectedPath, { visible: false })}
                          className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200"
                        >
                          本层隐藏
                        </button>
                      </div>
                    </div>

                    <label className="space-y-1.5 block">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">角色</span>
                      <input
                        value={(selectedItem.roles ?? []).join(",")}
                        onChange={(e) =>
                          selectedPath &&
                          updateItem(selectedPath, {
                            roles: e.target.value
                              ? e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              : undefined,
                          })
                        }
                        className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-200">
                      <span>visible</span>
                      <input
                        type="checkbox"
                        checked={selectedItem.visible !== false}
                        onChange={(e) => selectedPath && updateItem(selectedPath, { visible: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </label>
                  </div>
                </PropertySection>

                <PropertySection title="排序与操作" keyName="actions">
                  <div className="space-y-3">
                    <label className="space-y-1.5 block">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">排序</span>
                      <input
                        type="number"
                        value={selectedItem.sortOrder ?? 0}
                        onChange={(e) => selectedPath && updateItem(selectedPath, { sortOrder: Number(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectedPath && moveItem(selectedPath, "up")}
                        className="rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-200"
                      >
                        上移
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedPath && moveItem(selectedPath, "down")}
                        className="rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-200"
                      >
                        下移
                      </button>
                    </div>
                  </div>
                </PropertySection>
              </div>
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#091321] p-6 text-center text-sm text-slate-400">
                选择左侧菜单节点后，属性编辑器会在这里显示。
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <div className="mb-3 text-base font-medium text-white">导出与导入</div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={copyExport}
                className="w-full rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-100 hover:border-[#f68f4d]/50"
              >
                复制 JSON
              </button>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="粘贴 JSON 进行导入"
                className="min-h-[140px] w-full rounded-xl border border-white/8 bg-[#0b1220] p-3 text-sm text-slate-100 outline-none"
              />
              <button type="button" onClick={importJson} className="w-full rounded-xl bg-[#f68f4d] px-3 py-2 text-sm font-medium text-white">
                导入 JSON
              </button>
              <div className="rounded-xl border border-white/8 bg-[#091321] p-3 text-xs text-slate-300">{statusText || "配置会自动保存到本地存储。"}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <button type="button" onClick={() => setShowJson((v) => !v)} className="mb-3 flex w-full items-center justify-between text-left text-base font-medium text-white">
              <span>当前 JSON</span>
              <span className="text-xs text-slate-400">{showJson ? "收起" : "展开"}</span>
            </button>
            {showJson ? <pre className="overflow-x-auto rounded-xl bg-[#091321] p-3 text-xs text-slate-300">{exportJson}</pre> : null}
          </div>
        </div>
      </div>
    </main>
  )
}
