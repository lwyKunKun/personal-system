"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import * as LucideIcons from "lucide-react"
import { getStoredSidebarItems, SIDEBAR_STORAGE_KEY, type SidebarMenuItem } from "../../lib/sidebar-menu"

const ICON_MAP = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>

type FlattenedRoute = {
  path: string
  label: string
  labelPath: string[]
  group: string
  iconName?: string
  icon?: string
  roles?: string[]
  visible: boolean
  id?: string
  isGroup: boolean
  hasDuplicate: boolean
  isQueryRoute: boolean
  basePath: string
}

function renderIcon(iconName?: string, icon?: string, className = "h-4 w-4") {
  if (iconName) {
    const Icon = ICON_MAP[iconName]
    if (Icon) return <Icon className={className} />
  }
  if (icon) return <span className="text-base leading-none">{icon}</span>
  return <LucideIcons.FileText className={className} />
}

function flattenRoutes(items: SidebarMenuItem[], parents: string[] = [], parentGroup?: string): FlattenedRoute[] {
  const result: FlattenedRoute[] = []
  for (const item of items) {
    const labelPath = [...parents, item.label]
    const group = item.group || parentGroup || "main"
    if (item.path) {
      const basePath = item.path.split("?")[0]
      result.push({
        path: item.path,
        label: item.label,
        labelPath,
        group,
        iconName: item.iconName,
        icon: item.icon,
        roles: item.roles,
        visible: item.visible ?? true,
        id: item.id,
        isGroup: false,
        hasDuplicate: false,
        isQueryRoute: item.path.includes("?"),
        basePath,
      })
    }
    if (item.children && item.children.length > 0) {
      result.push(...flattenRoutes(item.children, labelPath, group))
    }
  }
  return result
}

function markDuplicates(routes: FlattenedRoute[]): FlattenedRoute[] {
  const countMap = new Map<string, number>()
  for (const r of routes) {
    countMap.set(r.basePath, (countMap.get(r.basePath) ?? 0) + 1)
  }
  return routes.map((r) => ({ ...r, hasDuplicate: (countMap.get(r.basePath) ?? 0) > 1 }))
}

const GROUP_LABELS: Record<string, { label: string; color: string }> = {
  system: { label: "系统", color: "#fbbf24" },
  project: { label: "项目", color: "#5ea2ff" },
  personal: { label: "个人", color: "#34d399" },
  main: { label: "主菜单", color: "#f68f4d" },
}

export default function RouteManager() {
  const [routes, setRoutes] = useState<FlattenedRoute[]>([])
  const [search, setSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  const refresh = () => {
    const items = getStoredSidebarItems()
    setRoutes(markDuplicates(flattenRoutes(items)))
  }

  useEffect(() => {
    refresh()
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SIDEBAR_STORAGE_KEY) refresh()
    }
    window.addEventListener("storage", handleStorage)
    const handleCustom = () => refresh()
    window.addEventListener("vibe:sidebar-updated", handleCustom)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("vibe:sidebar-updated", handleCustom)
    }
  }, [])

  const stats = useMemo(() => {
    const total = routes.length
    const visible = routes.filter((r) => r.visible).length
    const hidden = total - visible
    const withRoles = routes.filter((r) => r.roles && r.roles.length > 0).length
    const duplicates = routes.filter((r) => r.hasDuplicate).length
    const queryRoutes = routes.filter((r) => r.isQueryRoute).length
    const byGroup = routes.reduce<Record<string, number>>((acc, r) => {
      acc[r.group] = (acc[r.group] ?? 0) + 1
      return acc
    }, {})
    return { total, visible, hidden, withRoles, duplicates, queryRoutes, byGroup }
  }, [routes])

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (groupFilter !== "all" && r.group !== groupFilter) return false
      if (statusFilter === "visible" && !r.visible) return false
      if (statusFilter === "hidden" && r.visible) return false
      if (statusFilter === "duplicate" && !r.hasDuplicate) return false
      if (statusFilter === "withRoles" && (!r.roles || r.roles.length === 0)) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          r.path.toLowerCase().includes(q) ||
          r.label.toLowerCase().includes(q) ||
          r.labelPath.join(" ").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [routes, search, groupFilter, statusFilter])

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <StatCard label="路由总数" value={stats.total} accent="#f68f4d" icon={<LucideIcons.Route className="h-4 w-4" />} />
        <StatCard label="可见路由" value={stats.visible} accent="#34d399" icon={<LucideIcons.Eye className="h-4 w-4" />} />
        <StatCard label="隐藏路由" value={stats.hidden} accent="#6b7280" icon={<LucideIcons.EyeOff className="h-4 w-4" />} />
        <StatCard label="带权限" value={stats.withRoles} accent="#5ea2ff" icon={<LucideIcons.ShieldCheck className="h-4 w-4" />} />
        <StatCard label="路径冲突" value={stats.duplicates} accent={stats.duplicates > 0 ? "#ef4444" : "#34d399"} icon={<LucideIcons.AlertTriangle className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(stats.byGroup).map(([g, count]) => {
          const info = GROUP_LABELS[g] ?? { label: g, color: "#94a3b8" }
          return (
            <span key={g} className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-[#101b2d] px-3 py-1 text-xs" style={{ borderColor: info.color + "33" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info.color }} />
              <span className="text-slate-300">{info.label}</span>
              <span className="text-slate-500">{count}</span>
            </span>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <LucideIcons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索路径或菜单名称..."
            className="w-full rounded-xl border border-white/8 bg-[#0b1220] py-2 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#f68f4d]/40"
          />
        </div>
        <div className="flex gap-2">
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#f68f4d]/40">
            <option value="all">全部分组</option>
            <option value="system">系统</option>
            <option value="project">项目</option>
            <option value="personal">个人</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#f68f4d]/40">
            <option value="all">全部状态</option>
            <option value="visible">可见</option>
            <option value="hidden">隐藏</option>
            <option value="duplicate">路径冲突</option>
            <option value="withRoles">带权限控制</option>
          </select>
          <button onClick={refresh} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-200 hover:border-[#f68f4d]/40 transition" title="刷新路由列表">
            <LucideIcons.RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1728]/80">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-[#0b1220]">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">路径</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">菜单层级</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">分组</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">权限</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">状态</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">{routes.length === 0 ? "暂无路由数据" : "没有匹配的路由"}</td></tr>
              ) : (
                filteredRoutes.map((route) => {
                  const groupInfo = GROUP_LABELS[route.group] ?? { label: route.group, color: "#94a3b8" }
                  const isSelected = selectedRoute === route.path
                  return (
                    <tr key={route.path + route.labelPath.join("/")} className={`border-b border-white/5 transition hover:bg-white/[0.02] ${isSelected ? "bg-[#f68f4d]/5" : ""}`} onClick={() => setSelectedRoute(isSelected ? null : route.path)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#f68f4d]/60">{renderIcon(route.iconName, route.icon, "h-4 w-4 text-slate-400")}</span>
                          <code className="rounded bg-[#0b1220] px-2 py-0.5 font-mono text-xs text-slate-200">{route.path}</code>
                          {route.hasDuplicate && <span title="路径冲突"><LucideIcons.AlertTriangle className="h-3.5 w-3.5 text-yellow-400" /></span>}
                          {route.isQueryRoute && <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-300">query</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-slate-300">
                          {route.labelPath.map((label, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && <LucideIcons.ChevronRight className="h-3 w-3 text-slate-600" />}
                              <span className={i === route.labelPath.length - 1 ? "text-white" : "text-slate-400"}>{label}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: groupInfo.color + "15", color: groupInfo.color }}>{groupInfo.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {route.roles && route.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {route.roles.map((role) => (<span key={role} className="rounded bg-[#1e293b] px-1.5 py-0.5 text-[10px] text-slate-300">{role}</span>))}
                          </div>
                        ) : (<span className="text-slate-500 text-xs">公开</span>)}
                      </td>
                      <td className="px-4 py-3">
                        {route.visible ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#34d399]"><LucideIcons.Eye className="h-3 w-3" /> 可见</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500"><LucideIcons.EyeOff className="h-3 w-3" /> 隐藏</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={route.path} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1 text-xs text-slate-200 hover:border-[#f68f4d]/40 hover:text-[#ffb476] transition">
                          <LucideIcons.ExternalLink className="h-3 w-3" /> 预览
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRoute && (() => {
        const route = routes.find((r) => r.path === selectedRoute)
        if (!route) return null
        const groupInfo = GROUP_LABELS[route.group] ?? { label: route.group, color: "#94a3b8" }
        return (
          <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">路由详情</h3>
              <button onClick={() => setSelectedRoute(null)} className="text-slate-500 hover:text-slate-300"><LucideIcons.X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <DetailItem label="路径"><code className="text-[#f68f4d]">{route.path}</code></DetailItem>
              <DetailItem label="菜单名称">{route.label}</DetailItem>
              <DetailItem label="菜单 ID"><code className="text-slate-400">{route.id || "（无）"}</code></DetailItem>
              <DetailItem label="所属分组"><span style={{ color: groupInfo.color }}>{groupInfo.label}</span></DetailItem>
              <DetailItem label="可见性">{route.visible ? "可见" : "隐藏"}</DetailItem>
              <DetailItem label="权限角色">{route.roles && route.roles.length > 0 ? route.roles.join(", ") : "公开（无权限限制）"}</DetailItem>
              <DetailItem label="路径类型">
                {route.isQueryRoute ? "Query 参数路由" : "静态路径"}
                {route.hasDuplicate && <span className="ml-2 text-yellow-400 text-xs">⚠ 与其他菜单路径冲突</span>}
              </DetailItem>
              <DetailItem label="菜单层级">
                <div className="flex items-center gap-1">
                  {route.labelPath.map((label, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <LucideIcons.ChevronRight className="h-3 w-3 text-slate-600" />}
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
              </DetailItem>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={route.path} className="inline-flex items-center gap-1.5 rounded-xl bg-[#f68f4d] px-3 py-2 text-xs font-medium text-white hover:bg-[#f68f4d]/90 transition">
                <LucideIcons.ExternalLink className="h-3.5 w-3.5" /> 打开该页面
              </Link>
              <Link href="/system?tab=menus" className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-xs text-slate-200 hover:border-[#f68f4d]/40 transition">
                <LucideIcons.SlidersHorizontal className="h-3.5 w-3.5" /> 去菜单管理修改
              </Link>
            </div>
          </div>
        )
      })()}

      <div className="rounded-2xl border border-white/8 bg-[#0b1220] p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <LucideIcons.Info className="h-4 w-4 text-[#5ea2ff]" /> 说明
        </h3>
        <ul className="space-y-1.5 text-xs text-slate-400">
          <li>• 路由数据来源于侧边栏菜单配置，在「菜单管理」中新增/修改/删除菜单会同步到这里。</li>
          <li>• <span className="text-blue-300">query</span> 标记表示该路由使用了 URL 查询参数（如 <code>/system?tab=routes</code>）。</li>
          <li>• <span className="text-yellow-400">⚠</span> 标记表示多个菜单项指向了同一个基础路径，可能导致导航高亮异常。</li>
          <li>• 路由的新增/删除/修改请前往「菜单管理」页面操作，本页面专注于路由查看与诊断。</li>
        </ul>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent, icon }: { label: string; value: number; accent: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0d1728]/80 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold" style={{ color: accent }}>{value}</div>
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-200">{children}</div>
    </div>
  )
}
