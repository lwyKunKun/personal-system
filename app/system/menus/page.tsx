"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import * as LucideIcons from "lucide-react"
import SystemShell from "../../components/SystemShell"
import { filterSidebarItemsByRoles } from "../../lib/access"
import { DEFAULT_SIDEBAR_ITEMS, getStoredSidebarItems, saveStoredSidebarItems, type SidebarMenuItem } from "../../lib/sidebar-menu"
import { DEFAULT_USER_PROFILE, getCurrentUserProfile, saveCurrentUserProfile } from "../../lib/user"
import { createRoute, getStoredRoutes, type RouteDefinition, type RouteType } from "../../lib/routes"

const LUCIDE_ICON_OPTIONS = [
  "TrendingUp", "BarChart3", "LayoutDashboard", "BookOpenText", "BriefcaseBusiness", "Bot", "BrainCircuit",
  "CandlestickChart", "ChartColumnBig", "CircleDollarSign", "ClipboardList", "FolderOpen", "Home", "Library",
  "LineChart", "NotebookPen", "Rocket", "Search", "Settings", "ShieldCheck", "Sparkles", "Target", "Wallet",
  "Newspaper", "Activity", "CalendarRange", "Cpu", "PanelTop", "Route", "SlidersHorizontal", "Star", "Clock3",
  "UserRound", "ExternalLink", "Globe",
] as const

const ROLE_STRATEGIES = [
  { id: "public", label: "全部开放", roles: [] as string[] },
  { id: "admin", label: "管理员", roles: ["admin"] },
  { id: "user", label: "普通用户", roles: ["user"] },
  { id: "admin-user", label: "管理员 + 用户", roles: ["admin", "user"] },
]

const ROLE_TEMPLATES = [
  { id: "full-control", label: "全控端", description: "系统 + 项目 + 个人全部启用", roles: ["admin", "user"], visible: true },
  { id: "admin-only", label: "管理员端", description: "仅面向管理员", roles: ["admin"], visible: true },
  { id: "member-readonly", label: "成员端", description: "成员可见，管理员保留控制", roles: ["user"], visible: true },
  { id: "public-readonly", label: "公开端", description: "无权限门槛，适合概览菜单", roles: [], visible: true },
  { id: "internal-hidden", label: "内控隐藏", description: "隐藏系统管理节点，保留对外入口", roles: ["admin", "user"], visible: false },
]

const ROLE_PREVIEW_OPTIONS = [
  { id: "admin-user", label: "管理员 + 用户", roles: ["admin", "user"] },
  { id: "admin", label: "管理员", roles: ["admin"] },
  { id: "user", label: "普通用户", roles: ["user"] },
  { id: "public", label: "公开视图", roles: [] as string[] },
]

const MENU_TEMPLATES = [
  { id: "default", label: "默认导航", items: DEFAULT_SIDEBAR_ITEMS },
]

const ICON_MAP = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>
const renderLucidePreview = (iconName?: string, className = "h-4 w-4") => {
  const value = iconName?.trim()
  if (!value) return <span className="text-base">◌</span>
  const Icon = ICON_MAP[value]
  if (!Icon) return <span className="text-[11px] font-semibold">{value.slice(0, 1)}</span>
  return <Icon className={className} />
}

const getParentAndIndex = (nodes: SidebarMenuItem[], path: number[]) => {
  if (path.length === 0) return { parent: nodes, index: -1 }
  let current = nodes
  for (let i = 0; i < path.length - 1; i++) { const item = current[path[i]]; if (!item) return null; current = item.children ?? [] }
  return { parent: current, index: path[path.length - 1] }
}
const getItemByPath = (nodes: SidebarMenuItem[], path: number[]) => {
  if (path.length === 0) return undefined
  let current = nodes; let result: SidebarMenuItem | undefined
  for (const idx of path) { const item = current[idx]; if (!item) return undefined; result = item; current = item.children ?? [] }
  return result
}

// 快速新建路由弹窗
function QuickCreateRouteModal({ onClose, onCreated }: { onClose: () => void; onCreated: (route: RouteDefinition) => void }) {
  const [form, setForm] = useState({ title: "", path: "", type: "page" as RouteType, iconName: "", group: "project" as "system" | "project" | "personal" })
  const handleCreate = () => {
    if (!form.title.trim() || !form.path.trim()) { alert("标题和路径不能为空"); return }
    const route = createRoute({
      title: form.title.trim(), path: form.path.trim(), type: form.type,
      iconName: form.iconName.trim() || undefined, group: form.group,
      visible: true,
    })
    onCreated(route)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1628] p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-white">快速新建路由</h3>
        <div className="space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="路由标题" className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
          <input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="路径（如 /projects/demo 或 https://...）" className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RouteType })} className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none">
              <option value="page">自定义页面</option><option value="link">外部链接</option><option value="iframe">iframe 嵌入</option>
            </select>
            <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value as any })} className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none">
              <option value="system">系统</option><option value="project">项目</option><option value="personal">个人</option>
            </select>
          </div>
          <input value={form.iconName} onChange={(e) => setForm({ ...form, iconName: e.target.value })} placeholder="Lucide 图标名（可选）" className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/8 bg-[#101b2d] px-4 py-2 text-sm text-slate-200">取消</button>
          <button type="button" onClick={handleCreate} className="rounded-xl bg-[#f68f4d] px-4 py-2 text-sm font-medium text-white">创建并关联</button>
        </div>
      </div>
    </div>
  )
}

export default function MenusManagerPage() {
  const [items, setItems] = useState<SidebarMenuItem[]>([])
  const [routes, setRoutes] = useState<RouteDefinition[]>([])
  const [newLabel, setNewLabel] = useState("")
  const [newIcon, setNewIcon] = useState("")
  const [newIconName, setNewIconName] = useState("")
  const [newRouteId, setNewRouteId] = useState("")
  const [newRoles, setNewRoles] = useState("")
  const [newVisible, setNewVisible] = useState(true)
  const [jsonText, setJsonText] = useState("")
  const [showJson, setShowJson] = useState(false)
  const [statusText, setStatusText] = useState("")
  const [selectedPath, setSelectedPath] = useState<number[] | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [propertySections, setPropertySections] = useState({ basics: true, display: true, access: true, actions: true })
  const [profileName, setProfileName] = useState(DEFAULT_USER_PROFILE.name)
  const [profileRoles, setProfileRoles] = useState(DEFAULT_USER_PROFILE.roles.join(", "))
  const [previewRoles, setPreviewRoles] = useState<string[]>(DEFAULT_USER_PROFILE.roles)
  const [showQuickCreate, setShowQuickCreate] = useState<{ onCreated: (r: RouteDefinition) => void } | null>(null)

  useEffect(() => {
    const load = () => { setItems(getStoredSidebarItems()); setRoutes(getStoredRoutes()) }
    load()
    const user = getCurrentUserProfile(); setProfileName(user.name); setProfileRoles(user.roles.join(", "))
    window.addEventListener("vibe:sidebar-updated", load)
    window.addEventListener("vibe:routes-updated", load)
    return () => { window.removeEventListener("vibe:sidebar-updated", load); window.removeEventListener("vibe:routes-updated", load) }
  }, [])

  const exportJson = useMemo(() => JSON.stringify(items, null, 2), [items])
  const previewTree = useMemo(() => filterSidebarItemsByRoles(items, previewRoles), [items, previewRoles])
  const countVisibleNodes = (nodes: SidebarMenuItem[]): number => nodes.reduce((c, item) => c + 1 + countVisibleNodes(item.children ?? []), 0)
  const totalVisibleNodes = countVisibleNodes(previewTree), totalMenuNodes = countVisibleNodes(items)

  const persist = (next: SidebarMenuItem[]) => { setItems(next); saveStoredSidebarItems(next) }
  const saveConfig = () => { persist(items); setStatusText("已保存菜单配置") }

  const applyRoleStrategy = (roles: string[]) => {
    if (!selectedPath) { setStatusText("请先在左侧选择一个菜单节点"); return }
    updateItem(selectedPath, { roles: roles.length > 0 ? roles : undefined })
    setStatusText(`已应用权限策略：${roles.length ? roles.join(", ") : "公开"}`)
  }

  const applyPermissionTemplate = (template: { roles: string[]; visible?: boolean }) => {
    if (!selectedPath) { setStatusText("请先在左侧选择一个菜单节点"); return }
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]
      const ref = getParentAndIndex(next, selectedPath); if (!ref || ref.index < 0) return prev
      const apply = (node: SidebarMenuItem): SidebarMenuItem => ({ ...node, roles: template.roles.length ? [...template.roles] : undefined, visible: template.visible ?? node.visible ?? true, children: node.children?.map(apply) })
      ref.parent[ref.index] = apply(ref.parent[ref.index]); saveStoredSidebarItems(next); return next
    })
    setStatusText(`已应用权限模板`)
  }

  const applyMenuTemplate = (template: SidebarMenuItem[]) => {
    persist(template.map(i => ({ ...i, children: i.children?.map(c => ({ ...c })) })))
    setSelectedPath(template.length > 0 ? [0] : null); setStatusText(`已应用模板`)
  }

  const addItem = () => {
    const label = newLabel.trim(); if (!label) { setStatusText("菜单名称不能为空"); return }
    const next = [...items, { label, icon: newIcon.trim() || undefined, iconName: newIconName.trim() || undefined, routeId: newRouteId || undefined, roles: newRoles.trim() ? newRoles.split(",").map(s => s.trim()).filter(Boolean) : undefined, visible: newVisible, sortOrder: items.length, active: false }]
    persist(next); setNewLabel(""); setNewIcon(""); setNewIconName(""); setNewRouteId(""); setNewRoles(""); setNewVisible(true); setStatusText("已添加菜单分组")
  }

  const addChildItem = (path: number[]) => {
    const label = newLabel.trim(); if (!label) { setStatusText("子菜单名称不能为空"); return }
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]; const target = getItemByPath(next, path); if (!target) return prev
      target.children = [...(target.children ?? []), { label, icon: newIcon.trim() || undefined, iconName: newIconName.trim() || undefined, visible: newVisible, sortOrder: target.children?.length ?? 0, routeId: newRouteId || undefined, roles: newRoles.trim() ? newRoles.split(",").map(s => s.trim()).filter(Boolean) : undefined, active: false }]
      saveStoredSidebarItems(next); return next
    })
    setNewLabel(""); setNewIcon(""); setNewIconName(""); setNewRouteId(""); setNewRoles(""); setNewVisible(true); setStatusText("已添加子菜单")
  }

  const updateItem = (path: number[], patch: Partial<SidebarMenuItem>) => {
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]; const ref = getParentAndIndex(next, path)
      if (!ref || ref.index < 0) return prev
      ref.parent[ref.index] = { ...ref.parent[ref.index], ...patch }; saveStoredSidebarItems(next); return next
    })
  }

  const removeItem = (path: number[]) => {
    setItems((prev) => { const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]; const ref = getParentAndIndex(next, path); if (!ref || ref.index < 0) return prev; ref.parent.splice(ref.index, 1); saveStoredSidebarItems(next); return next })
    setStatusText("已删除菜单项")
  }

  const moveItem = (path: number[], direction: "up" | "down") => {
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]; const ref = getParentAndIndex(next, path); if (!ref || ref.index < 0) return prev
      const tIdx = direction === "up" ? ref.index - 1 : ref.index + 1; if (tIdx < 0 || tIdx >= ref.parent.length) return prev
      ;[ref.parent[ref.index], ref.parent[tIdx]] = [ref.parent[tIdx], ref.parent[ref.index]]; saveStoredSidebarItems(next); return next
    })
  }

  const importJson = () => {
    try { const parsed = JSON.parse(jsonText) as SidebarMenuItem[]; if (!Array.isArray(parsed) || parsed.some(i => !i.label)) throw new Error("格式错误"); persist(parsed); setStatusText("导入成功") }
    catch { setStatusText("导入失败：JSON 格式错误") }
  }
  const handleReset = () => { persist(DEFAULT_SIDEBAR_ITEMS); setStatusText("已恢复默认菜单配置") }
  const saveProfile = () => {
    const roles = profileRoles.split(",").map(i => i.trim()).filter(Boolean)
    saveCurrentUserProfile({ name: profileName.trim() || DEFAULT_USER_PROFILE.name, roles: roles.length ? roles : DEFAULT_USER_PROFILE.roles })
    setStatusText("已保存用户角色与名称")
  }
  const copyExport = async () => { try { await navigator.clipboard.writeText(exportJson); setStatusText("已复制 JSON") } catch { setStatusText("复制失败") } }

  const flattenTreeKeys = (nodes: SidebarMenuItem[], path: number[] = []): string[] => nodes.flatMap((item, idx) => { const cur = [...path, idx]; const key = cur.join("."); return [key, ...(item.children?.length ? flattenTreeKeys(item.children, cur) : [])] })
  const toggleNode = (path: number[]) => { const key = path.join("."); setExpanded(prev => ({ ...prev, [key]: !(prev[key] ?? true) })) }
  const expandAll = () => setExpanded(Object.fromEntries(flattenTreeKeys(items).map(k => [k, true])))
  const collapseAll = () => setExpanded(Object.fromEntries(flattenTreeKeys(items).map(k => [k, false])))

  const reorderTree = (source: number[], target: number[]) => {
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]; const sp = getParentAndIndex(next, source); const tp = getParentAndIndex(next, target)
      if (!sp || !tp || sp.index < 0 || tp.index < 0) return prev
      if (sp.parent === tp.parent && sp.index === tp.index) return prev
      const [moved] = sp.parent.splice(sp.index, 1); tp.parent.splice(tp.index, 0, moved); saveStoredSidebarItems(next); return next
    })
  }

  const getRouteById = (id: string) => routes.find(r => r.id === id)

  const renderTree = (nodes: SidebarMenuItem[], path: number[] = []) => nodes.map((item, index) => {
    const cur = [...path, index]; const key = cur.join("."); const hasChildren = !!item.children?.length; const isExpanded = expanded[key] !== false; const isSelected = selectedPath?.join(".") === key
    const route = item.routeId ? getRouteById(item.routeId) : null
    return (
      <div key={key} className="space-y-2">
        <div draggable onDragStart={() => {}} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); /* drag source not tracked */ }}
          className={`flex items-center gap-2 rounded-xl border px-2 py-2 transition ${isSelected ? "border-[#f68f4d]/60 bg-[#121d32]" : "border-white/8 bg-[#0b1220] hover:border-white/12"}`}>
          <button type="button" onClick={() => hasChildren && toggleNode(cur)} className="flex h-6 w-6 items-center justify-center rounded-md border border-white/8 bg-[#101b2d] text-xs text-slate-200">{hasChildren ? (isExpanded ? "▾" : "▸") : "•"}</button>
          <button type="button" onClick={() => setSelectedPath(cur)} className="flex flex-1 items-center gap-2 overflow-hidden text-left">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111d2d] text-[#ffb476]">{renderLucidePreview(item.iconName || route?.iconName) || item.icon || "◌"}</span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm font-medium ${item.visible === false ? "text-slate-500 line-through" : "text-slate-100"}`}>{item.label}</span>
              <span className="block text-[10px] uppercase tracking-wide text-slate-500">{route ? route.path : item.path || "未绑定路由"}</span>
            </span>
          </button>
          <button type="button" onClick={() => addChildItem(cur)} className="rounded-md border border-white/8 bg-[#101b2d] px-2 py-1 text-[10px] text-slate-200">+</button>
        </div>
        {hasChildren && isExpanded ? <div className="ml-4 border-l border-white/8 pl-2">{renderTree(item.children ?? [], cur)}</div> : null}
      </div>
    )
  })

  const selectedItem = selectedPath ? getItemByPath(items, selectedPath) : undefined
  const selectedItemRoute = selectedItem?.routeId ? getRouteById(selectedItem.routeId) : null
  const toggleSection = (key: string) => setPropertySections(prev => ({ ...prev, [key]: !(prev as any)[key] }))
  const PropertySection = ({ title, keyName, children }: { title: string; keyName: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-white/8 bg-[#091321] p-3">
      <button type="button" onClick={() => toggleSection(keyName)} className="flex w-full items-center justify-between text-left text-sm font-medium text-white"><span>{title}</span><span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{(propertySections as any)[keyName] !== false ? "收起" : "展开"}</span></button>
      {(propertySections as any)[keyName] !== false ? <div className="mt-3">{children}</div> : null}
    </div>
  )

  return (
    <SystemShell>
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-medium text-white">新增菜单</div>
              <div className="flex gap-2 text-[11px] text-slate-400">
                <span className="rounded-full border border-white/8 px-2 py-1">{items.length} 组</span>
                <span className="rounded-full border border-white/8 px-2 py-1">{routes.length} 路由</span>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">{MENU_TEMPLATES.map(t => (<button key={t.id} type="button" onClick={() => applyMenuTemplate(t.items)} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">{t.label}</button>))}</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1.5fr_auto_auto]">
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="菜单名称（新分组或子项）" className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
              <select value={newRouteId} onChange={e => setNewRouteId(e.target.value)} className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none">
                <option value="">选择路由（可选）...</option>
                {routes.filter(r => r.visible !== false || r.type === "builtin").map(r => (<option key={r.id} value={r.id}>{r.title} ({r.path})</option>))}
              </select>
              <button type="button" onClick={() => setShowQuickCreate({ onCreated: (r) => { setNewRouteId(r.id); setNewLabel(newLabel || r.title) } })} className="rounded-xl border border-dashed border-[#f68f4d]/50 bg-[#f68f4d]/5 px-3 py-2.5 text-xs text-[#ffb476]">+ 新建路由</button>
              <button type="button" onClick={addItem} className="rounded-xl bg-[#f68f4d] px-4 py-2.5 text-sm font-medium text-white">添加</button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input value={newRoles} onChange={e => setNewRoles(e.target.value)} placeholder="角色限制（可选，如 admin,user）" className="w-56 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none" />
              <label className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-xs text-slate-200"><input type="checkbox" checked={newVisible} onChange={e => setNewVisible(e.target.checked)} className="h-3.5 w-3.5" />可见</label>
              <span className="text-xs text-slate-500">提示：选中菜单树中的节点后点击 + 可添加子菜单</span>
            </div>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input value={newIconName} onChange={e => setNewIconName(e.target.value)} placeholder="Lucide icon" className="w-36 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none" />
                <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="emoji" className="w-24 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none" />
                <label className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-xs text-slate-200"><input type="checkbox" checked={newVisible} onChange={e => setNewVisible(e.target.checked)} className="h-3.5 w-3.5" />可见</label>
              </div>
              <div className="flex flex-wrap gap-2">{LUCIDE_ICON_OPTIONS.map(n => {
                const Icon = ICON_MAP[n]
                const act = newIconName === n
                return (
                  <button key={n} type="button" title={n} onClick={() => setNewIconName(n)} className={`flex h-8 w-8 items-center justify-center rounded-lg border ${act ? "border-[#f68f4d] bg-[#f68f4d]/15 text-[#ffb476]" : "border-white/8 bg-[#0b1220] text-slate-200 hover:border-[#f68f4d]/40"}`}>
                    {Icon ? <Icon className="h-4 w-4" /> : n[0]}
                  </button>
                )
              })}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <div className="mb-3 text-base font-medium text-white">用户角色</div>
            <div className="grid gap-3">
              <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="用户名" className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
              <input value={profileRoles} onChange={e => setProfileRoles(e.target.value)} placeholder="角色：admin,user" className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
              <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={saveProfile} className="rounded-xl bg-[#f68f4d] px-3 py-2.5 text-sm font-medium text-white">保存角色</button><button type="button" onClick={saveConfig} className="rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2.5 text-sm text-slate-100">保存配置</button></div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-[#091321] p-3">
              <div className="mb-2 text-sm font-medium text-white">权限预览</div>
              <div className="flex flex-wrap gap-2">{ROLE_PREVIEW_OPTIONS.map(o => (<button key={o.id} type="button" onClick={() => setPreviewRoles(o.roles)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${previewRoles.join(",") === o.roles.join(",") ? "border-[#f68f4d]/60 bg-[#f68f4d]/10 text-[#ffb476]" : "border-white/8 bg-[#101b2d] text-slate-200"}`}>{o.label}</button>))}</div>
              <div className="mt-3 rounded-xl border border-white/8 bg-[#0b1220] p-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">当前角色</div>
                <div className="mt-1 text-sm text-slate-100">{previewRoles.length > 0 ? previewRoles.join(", ") : "公开"}</div>
                <div className="mt-2 text-xs text-slate-400">{totalVisibleNodes} 个可见节点 / {totalMenuNodes} 个总节点，已隐藏 {Math.max(totalMenuNodes - totalVisibleNodes, 0)} 项</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-medium text-white">菜单树</div>
              <div className="flex gap-2">
                <button type="button" onClick={expandAll} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">展开全部</button>
                <button type="button" onClick={collapseAll} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">收起全部</button>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={saveConfig} className="rounded-lg bg-[#f68f4d] px-2.5 py-1.5 text-[11px] font-medium text-white">保存配置</button>
              <button type="button" onClick={handleReset} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">重置默认</button>
              <button type="button" onClick={copyExport} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">复制 JSON</button>
              <Link href="/system/routes" className="rounded-lg border border-[#5ea2ff]/40 bg-[#5ea2ff]/10 px-2.5 py-1.5 text-[11px] text-blue-200">管理路由 →</Link>
            </div>
            <div className="space-y-3">{renderTree(items)}</div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            {selectedItem ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#091321] p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#121d32] text-[#ffb476]">{renderLucidePreview(selectedItem.iconName || selectedItemRoute?.iconName, "h-5 w-5") || selectedItem.icon || "◌"}</span>
                    <div><div className="text-sm text-slate-400">当前节点</div><div className="text-lg font-medium text-white">{selectedItem.label}</div></div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => selectedPath && addChildItem(selectedPath)} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-xs text-slate-200">+ 子菜单</button>
                    <button type="button" onClick={() => selectedPath && removeItem(selectedPath)} className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200">删除</button>
                  </div>
                </div>

                <PropertySection title="基础信息" keyName="basics">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1.5"><span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">标题</span><input value={selectedItem.label} onChange={e => selectedPath && updateItem(selectedPath, { label: e.target.value })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" /></label>
                    <label className="space-y-1.5"><span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">分组</span><select value={selectedItem.group ?? "project"} onChange={e => selectedPath && updateItem(selectedPath, { group: e.target.value as any })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none"><option value="system">system</option><option value="project">project</option><option value="personal">personal</option></select></label>
                  </div>
                </PropertySection>

                <PropertySection title="路由绑定" keyName="route">
                  <div className="space-y-3">
                    <label className="space-y-1.5 block">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">关联路由</span>
                      <div className="flex gap-2">
                        <select value={selectedItem.routeId ?? ""} onChange={e => selectedPath && updateItem(selectedPath, { routeId: e.target.value || undefined, path: undefined })} className="flex-1 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none">
                          <option value="">-- 不绑定 --</option>
                          {routes.map(r => (<option key={r.id} value={r.id}>{r.title} → {r.path}</option>))}
                        </select>
                        <button type="button" onClick={() => setShowQuickCreate({ onCreated: (r) => { selectedPath && updateItem(selectedPath, { routeId: r.id }); setRoutes(getStoredRoutes()) } })} className="rounded-xl border border-[#f68f4d]/40 bg-[#f68f4d]/10 px-3 py-2 text-xs text-[#ffb476]">+ 新建</button>
                      </div>
                    </label>
                    {selectedItemRoute && (
                      <div className="rounded-xl border border-white/8 bg-[#0b1220] p-3 text-xs text-slate-300">
                        <div className="flex items-center justify-between">
                          <span>路径：<code className="text-slate-200">{selectedItemRoute.path}</code></span>
                          <Link href={selectedItemRoute.type === "link" ? (selectedItemRoute.url || selectedItemRoute.path) : selectedItemRoute.path} target={selectedItemRoute.target === "_blank" ? "_blank" : undefined} className="text-[#f68f4d] hover:underline">预览 →</Link>
                        </div>
                        <div className="mt-1 text-slate-500">类型：{selectedItemRoute.type}{selectedItemRoute.builtin ? " · 内置" : ""}</div>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500">提示：菜单绑定路由后，路径将从路由表读取，修改路由路径会自动同步到所有引用该路由的菜单项。</div>
                  </div>
                </PropertySection>

                <PropertySection title="显示设置" keyName="display">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1.5"><span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Lucide 图标</span><input value={selectedItem.iconName ?? ""} onChange={e => selectedPath && updateItem(selectedPath, { iconName: e.target.value || undefined })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" /></label>
                    <label className="space-y-1.5"><span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">emoji</span><input value={selectedItem.icon ?? ""} onChange={e => selectedPath && updateItem(selectedPath, { icon: e.target.value || undefined })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" /></label>
                  </div>
                </PropertySection>

                <PropertySection title="访问控制" keyName="access">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">{ROLE_STRATEGIES.map(s => (<button key={s.id} type="button" onClick={() => applyRoleStrategy(s.roles)} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">{s.label}</button>))}</div>
                    <div className="space-y-2">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">权限模板</div>
                      {ROLE_TEMPLATES.map(t => (<button key={t.id} type="button" onClick={() => applyPermissionTemplate(t)} className="block w-full rounded-xl border border-white/8 bg-[#0b1220] p-2.5 text-left"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-100">{t.label}</span><span className="text-[10px] uppercase tracking-wide text-slate-400">{t.visible === false ? "隐藏" : "可见"}</span></div><div className="mt-1 text-[11px] text-slate-400">{t.description}</div></button>))}
                    </div>
                    <label className="space-y-1.5 block"><span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">角色</span><input value={(selectedItem.roles ?? []).join(",")} onChange={e => selectedPath && updateItem(selectedPath, { roles: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : undefined })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" /></label>
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-200"><span>可见</span><input type="checkbox" checked={selectedItem.visible !== false} onChange={e => selectedPath && updateItem(selectedPath, { visible: e.target.checked })} className="h-4 w-4" /></label>
                  </div>
                </PropertySection>

                <PropertySection title="排序与操作" keyName="actions">
                  <div className="space-y-3">
                    <label className="space-y-1.5 block"><span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">排序</span><input type="number" value={selectedItem.sortOrder ?? 0} onChange={e => selectedPath && updateItem(selectedPath, { sortOrder: Number(e.target.value) || 0 })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" /></label>
                    <div className="flex gap-2"><button type="button" onClick={() => selectedPath && moveItem(selectedPath, "up")} className="rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-200">上移</button><button type="button" onClick={() => selectedPath && moveItem(selectedPath, "down")} className="rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-200">下移</button></div>
                  </div>
                </PropertySection>
              </div>
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#091321] p-6 text-center text-sm text-slate-400">选择左侧菜单节点后，属性编辑器会在这里显示。</div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <div className="mb-3 text-base font-medium text-white">导出与导入</div>
            <div className="space-y-3">
              <button type="button" onClick={copyExport} className="w-full rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-100">复制 JSON</button>
              <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder="粘贴 JSON 进行导入" className="min-h-[140px] w-full rounded-xl border border-white/8 bg-[#0b1220] p-3 text-sm text-slate-100 outline-none" />
              <button type="button" onClick={importJson} className="w-full rounded-xl bg-[#f68f4d] px-3 py-2 text-sm font-medium text-white">导入 JSON</button>
              <div className="rounded-xl border border-white/8 bg-[#091321] p-3 text-xs text-slate-300">{statusText || "配置会自动保存到本地存储。"}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <button type="button" onClick={() => setShowJson(v => !v)} className="mb-3 flex w-full items-center justify-between text-left text-base font-medium text-white"><span>当前 JSON</span><span className="text-xs text-slate-400">{showJson ? "收起" : "展开"}</span></button>
            {showJson ? <pre className="overflow-x-auto rounded-xl bg-[#091321] p-3 text-xs text-slate-300">{exportJson}</pre> : null}
          </div>
        </div>
      </div>

      {showQuickCreate && <QuickCreateRouteModal onClose={() => setShowQuickCreate(null)} onCreated={(r) => { const cb = showQuickCreate.onCreated; setShowQuickCreate(null); cb(r) }} />}
    </SystemShell>
  )
}
