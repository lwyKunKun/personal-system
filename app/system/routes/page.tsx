"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import * as LucideIcons from "lucide-react"
import SystemShell from "../../components/SystemShell"
import {
  createRoute,
  deleteRoute,
  getStoredRoutes,
  resetRoutes,
  updateRoute,
  type RouteDefinition,
  type RouteType,
} from "../../lib/routes"
import { findMenuItemsByRouteId, getStoredSidebarItems, saveStoredSidebarItems, type SidebarMenuItem } from "../../lib/sidebar-menu"

const ICON_MAP = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>

const ROUTE_TYPE_LABEL: Record<RouteType, { label: string; color: string }> = {
  builtin: { label: "内置", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  page: { label: "页面", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  link: { label: "外链", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  iframe: { label: "嵌入", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
}

const LUCIDE_ICON_OPTIONS = [
  "Home", "TrendingUp", "BarChart3", "LayoutDashboard", "BookOpenText", "BriefcaseBusiness",
  "Bot", "BrainCircuit", "CandlestickChart", "ChartColumnBig", "CircleDollarSign", "ClipboardList",
  "FolderOpen", "Library", "LineChart", "NotebookPen", "Rocket", "Search", "Settings", "ShieldCheck",
  "Sparkles", "Target", "Wallet", "Newspaper", "Activity", "CalendarRange", "Cpu", "ExternalLink",
  "Globe", "PanelTop", "Route", "SlidersHorizontal", "Star", "Clock3", "UserRound",
]

function renderIcon(iconName?: string, className = "h-4 w-4") {
  if (!iconName) return null
  const Icon = ICON_MAP[iconName]
  if (!Icon) return <span className="text-[10px] font-semibold">{iconName.slice(0, 2)}</span>
  return <Icon className={className} />
}

// 新增/编辑路由弹窗
function RouteFormModal({
  editing,
  onClose,
  onSave,
}: {
  editing?: RouteDefinition | null
  onClose: () => void
  onSave: () => void
}) {
  const isEdit = !!editing
  const isBuiltin = editing?.builtin
  const [form, setForm] = useState({
    title: editing?.title ?? "",
    path: editing?.path ?? "",
    type: (editing?.type ?? "page") as RouteType,
    iconName: editing?.iconName ?? "",
    group: editing?.group ?? "project" as "system" | "project" | "personal",
    url: editing?.url ?? "",
    visible: editing?.visible ?? true,
    rolesText: (editing?.roles ?? []).join(","),
    description: editing?.description ?? "",
    target: editing?.target ?? "_self" as "_self" | "_blank",
  })

  const handleSave = () => {
    if (!form.title.trim()) { alert("请输入路由标题"); return }
    if (!form.path.trim()) { alert("请输入路由路径"); return }
    const roles = form.rolesText.trim() ? form.rolesText.split(",").map((s) => s.trim()).filter(Boolean) : []
    const payload = {
      title: form.title.trim(),
      path: form.path.trim(),
      type: form.type,
      iconName: form.iconName.trim() || undefined,
      group: form.group,
      url: form.type === "link" || form.type === "iframe" ? form.url.trim() || form.path.trim() : undefined,
      visible: form.visible,
      roles,
      description: form.description.trim() || undefined,
      target: form.target,
    }
    if (isEdit && editing) {
      updateRoute(editing.id, payload)
    } else {
      createRoute(payload)
    }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d1628] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{isEdit ? "编辑路由" : "新增路由"}</h3>
          {isBuiltin && <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-300">内置路由（部分字段不可修改）</span>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">标题 *</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">类型 *</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RouteType })} disabled={isBuiltin} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none disabled:opacity-60">
              <option value="builtin">内置页面</option>
              <option value="page">自定义页面</option>
              <option value="link">外部链接</option>
              <option value="iframe">iframe 嵌入</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">分组</span>
            <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value as any })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none">
              <option value="system">系统</option>
              <option value="project">项目</option>
              <option value="personal">个人</option>
            </select>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">路径 * {form.type === "link" ? "(外链 URL)" : form.type === "iframe" ? "(嵌入页面 URL)" : "(如 /projects/demo)"}</span>
            <input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} disabled={isBuiltin} placeholder={form.type === "link" ? "https://..." : "/projects/demo"} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none disabled:opacity-60" />
          </label>

          {(form.type === "link" || form.type === "iframe") && (
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{form.type === "link" ? "跳转目标" : "嵌入 URL"}</span>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="留空则使用路径" className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
            </label>
          )}

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Lucide 图标</span>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/8 bg-[#0b1220] p-2">
              <button type="button" onClick={() => setForm({ ...form, iconName: "" })} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${!form.iconName ? "border-[#f68f4d] bg-[#f68f4d]/15 text-[#ffb476]" : "border-white/8 text-slate-400"}`}>×</button>
              {LUCIDE_ICON_OPTIONS.map((name) => {
                const Icon = ICON_MAP[name]
                const active = form.iconName === name
                return (
                  <button key={name} type="button" title={name} onClick={() => setForm({ ...form, iconName: name })} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${active ? "border-[#f68f4d] bg-[#f68f4d]/15 text-[#ffb476]" : "border-white/8 text-slate-200 hover:border-[#f68f4d]/40"}`}>
                    {Icon ? <Icon className="h-4 w-4" /> : name.slice(0, 2)}
                  </button>
                )
              })}
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">打开方式</span>
            <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as any })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none">
              <option value="_self">当前窗口</option>
              <option value="_blank">新窗口</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">角色限制（逗号分隔）</span>
            <input value={form.rolesText} onChange={(e) => setForm({ ...form, rolesText: e.target.value })} placeholder="admin,user" className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} className="h-4 w-4" />
            在菜单中可见
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">描述</span>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/8 bg-[#101b2d] px-4 py-2 text-sm text-slate-200">取消</button>
          <button type="button" onClick={handleSave} className="rounded-xl bg-[#f68f4d] px-4 py-2 text-sm font-medium text-white">{isEdit ? "保存修改" : "创建路由"}</button>
        </div>
      </div>
    </div>
  )
}

export default function RoutesManagerPage() {
  const router = useRouter()
  const [routes, setRoutes] = useState<RouteDefinition[]>([])
  const [menus, setMenus] = useState<SidebarMenuItem[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | RouteType>("all")
  const [groupFilter, setGroupFilter] = useState<"all" | "system" | "project" | "personal">("all")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<RouteDefinition | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const refresh = () => {
    setRoutes(getStoredRoutes())
    setMenus(getStoredSidebarItems())
  }

  useEffect(() => {
    refresh()
    window.addEventListener("vibe:routes-updated", refresh)
    window.addEventListener("vibe:sidebar-updated", refresh)
    return () => {
      window.removeEventListener("vibe:routes-updated", refresh)
      window.removeEventListener("vibe:sidebar-updated", refresh)
    }
  }, [])

  // 计算每个路由的引用计数
  const refCount = useMemo(() => {
    const map: Record<string, number> = {}
    const count = (items: SidebarMenuItem[]) => {
      for (const item of items) {
        if (item.routeId) map[item.routeId] = (map[item.routeId] || 0) + 1
        if (item.children) count(item.children)
      }
    }
    count(menus)
    return map
  }, [menus])

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false
      if (groupFilter !== "all" && (r.group ?? "project") !== groupFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return r.title.toLowerCase().includes(q) || r.path.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
      }
      return true
    })
  }, [routes, search, typeFilter, groupFilter])

  const stats = useMemo(() => ({
    total: routes.length,
    builtin: routes.filter((r) => r.type === "builtin").length,
    page: routes.filter((r) => r.type === "page").length,
    link: routes.filter((r) => r.type === "link").length,
    visible: routes.filter((r) => r.visible !== false).length,
    unreferenced: routes.filter((r) => !refCount[r.id] && !r.builtin).length,
  }), [routes, refCount])

  const selectedRoute = selectedId ? routes.find((r) => r.id === selectedId) : null
  const selectedRefs = selectedId ? findMenuItemsByRouteId(selectedId, menus) : []

  const handleDelete = (route: RouteDefinition) => {
    if (route.builtin) { alert("内置路由不可删除"); return }
    const refs = refCount[route.id] || 0
    if (refs > 0) {
      if (!confirm(`该路由被 ${refs} 个菜单项引用，删除后这些菜单将丢失关联。确定删除？`)) return
      // 删除引用该路由的菜单条目（将 routeId 置空）
      const removeRef = (items: SidebarMenuItem[]): SidebarMenuItem[] =>
        items.map((item) => {
          const next = { ...item }
          if (next.routeId === route.id) next.routeId = undefined
          if (next.children) next.children = removeRef(next.children)
          return next
        })
      const nextMenus = removeRef(menus)
      saveStoredSidebarItems(nextMenus)
    } else {
      if (!confirm(`确定删除路由「${route.title}」？`)) return
    }
    deleteRoute(route.id)
    if (selectedId === route.id) setSelectedId(null)
    refresh()
  }

  const handleReset = () => {
    if (confirm("重置将恢复所有内置路由并删除自定义路由，确定？")) {
      resetRoutes()
      refresh()
    }
  }

  return (
    <SystemShell>
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid gap-3 md:grid-cols-5">
          <StatCard label="路由总数" value={stats.total} color="#5ea2ff" />
          <StatCard label="内置" value={stats.builtin} color="#3b82f6" />
          <StatCard label="自定义" value={stats.page + stats.link} color="#10b981" />
          <StatCard label="可见" value={stats.visible} color="#22c55e" />
          <StatCard label="未引用" value={stats.unreferenced} valueColor={stats.unreferenced > 0 ? "#f59e0b" : undefined} color="#f59e0b" />
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索标题/路径/ID..." className="flex-1 min-w-[200px] rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none">
            <option value="all">全部类型</option>
            <option value="builtin">内置</option>
            <option value="page">页面</option>
            <option value="link">外链</option>
            <option value="iframe">嵌入</option>
          </select>
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value as any)} className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none">
            <option value="all">全部分组</option>
            <option value="system">系统</option>
            <option value="project">项目</option>
            <option value="personal">个人</option>
          </select>
          <button type="button" onClick={refresh} className="rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-200">刷新</button>
          <button type="button" onClick={handleReset} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">重置</button>
          <button type="button" onClick={() => { setEditing(null); setShowModal(true) }} className="rounded-xl bg-[#f68f4d] px-4 py-2 text-sm font-medium text-white">+ 新增路由</button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          {/* 路由表格 */}
          <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0b1220]">
            <table className="w-full text-sm">
              <thead className="bg-[#0f1a2d] text-[11px] uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">路径</th>
                  <th className="px-4 py-3 text-left">标题</th>
                  <th className="px-4 py-3 text-left">类型</th>
                  <th className="px-4 py-3 text-left">分组</th>
                  <th className="px-4 py-3 text-center">引用</th>
                  <th className="px-4 py-3 text-center">状态</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">暂无匹配的路由</td></tr>
                ) : filteredRoutes.map((route) => {
                  const refs = refCount[route.id] || 0
                  const isSelected = selectedId === route.id
                  const typeInfo = ROUTE_TYPE_LABEL[route.type]
                  return (
                    <tr
                      key={route.id}
                      className={`border-t border-white/5 transition hover:bg-white/5 ${isSelected ? "bg-[#f68f4d]/10" : ""}`}
                      onClick={() => setSelectedId(route.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          {renderIcon(route.iconName)}
                          <span className="truncate max-w-[240px]" title={route.path}>{route.path}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-100">{route.title}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${typeInfo.color}`}>{typeInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{route.group ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        {refs > 0 ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">{refs}</span> : <span className="text-slate-600">0</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {route.visible !== false ? <span className="text-emerald-400">可见</span> : <span className="text-slate-500">隐藏</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {route.type !== "link" && <Link href={route.path} className="rounded px-2 py-1 text-xs text-blue-300 hover:bg-blue-500/10">预览</Link>}
                          {route.type === "link" && <a href={route.url || route.path} target="_blank" rel="noopener noreferrer" className="rounded px-2 py-1 text-xs text-blue-300 hover:bg-blue-500/10">访问</a>}
                          <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(route); setShowModal(true) }} className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-white/10">编辑</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(route) }} disabled={route.builtin} className="rounded px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-30">删除</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 详情面板 */}
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            {selectedRoute ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#121d32] text-[#ffb476]">
                    {renderIcon(selectedRoute.iconName, "h-5 w-5") || "◌"}
                  </span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">路由详情</div>
                    <div className="text-lg font-medium text-white">{selectedRoute.title}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <InfoRow label="ID" value={<code className="text-xs text-slate-300">{selectedRoute.id}</code>} />
                  <InfoRow label="路径" value={<code className="text-xs text-slate-300 break-all">{selectedRoute.path}</code>} />
                  <InfoRow label="类型" value={<span className={`rounded-full border px-2 py-0.5 text-[10px] ${ROUTE_TYPE_LABEL[selectedRoute.type].color}`}>{ROUTE_TYPE_LABEL[selectedRoute.type].label}</span>} />
                  <InfoRow label="分组" value={selectedRoute.group ?? "-"} />
                  <InfoRow label="可见" value={selectedRoute.visible !== false ? "是" : "否"} />
                  <InfoRow label="打开方式" value={selectedRoute.target ?? "_self"} />
                  {selectedRoute.roles && selectedRoute.roles.length > 0 && <InfoRow label="角色" value={selectedRoute.roles.join(", ")} />}
                  {selectedRoute.builtin && <InfoRow label="系统内置" value="是" />}
                </div>

                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">引用该路由的菜单 ({selectedRefs.length})</div>
                  {selectedRefs.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/10 bg-[#0b1220] p-3 text-xs text-slate-500">暂无菜单引用此路由</div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedRefs.map((ref, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-[#0b1220] px-3 py-2 text-xs">
                          <span className="text-slate-300">{ref.labelPath.join(" > ")}</span>
                          <Link href="/system/menus" className="text-[#f68f4d] hover:underline">去菜单管理</Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => { setEditing(selectedRoute); setShowModal(true) }} className="flex-1 rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-200">编辑路由</button>
                  <button type="button" onClick={() => handleDelete(selectedRoute)} disabled={selectedRoute.builtin} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 disabled:opacity-30">删除</button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center text-sm text-slate-500">
                <LucideIcons.Route className="mb-3 h-10 w-10 text-slate-600" />
                选择左侧路由查看详情
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && <RouteFormModal editing={editing} onClose={() => { setShowModal(false); setEditing(null) }} onSave={() => { setShowModal(false); setEditing(null); refresh() }} />}
    </SystemShell>
  )
}

function StatCard({ label, value, color, valueColor }: { label: string; value: number; color: string; valueColor?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0d1628] p-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold" style={{ color: valueColor ?? color }}>{value}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}
