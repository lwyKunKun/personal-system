"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React, { useEffect, useMemo, useState } from "react"
import * as LucideIcons from "lucide-react"
import { filterSidebarItemsByRoles } from "../lib/access"
import { getCurrentUserProfile } from "../lib/user"
import { getPersonalState, savePersonalState } from "../lib/personal"
import { resolveMenuPath, type SidebarMenuItem } from "../lib/sidebar-menu"
import { getStoredRoutes, type RouteDefinition } from "../lib/routes"
import { getAllPermissionIds } from "../lib/permissions"
import { initializeDefaultRolePermissions } from "../lib/roles"

interface SidebarProps {
  items: SidebarMenuItem[]
}

const ICON_MAP = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>

const renderLucideIcon = (iconName?: string) => {
  if (!iconName) return <span className="text-base">◌</span>
  const Icon = ICON_MAP[iconName]
  if (!Icon) return <span className="text-[11px] font-semibold">{iconName.slice(0, 1)}</span>
  return <Icon className="h-4 w-4" />
}

const normalizeIconClass = (value?: string) => {
  const trimmed = value?.trim()
  if (!trimmed) return ""
  return /^iconfont\s+/i.test(trimmed) ? trimmed : `iconfont ${trimmed}`
}

// 判断路径是否激活（精确匹配或子路径匹配）
function isPathActive(currentPath: string, itemPath: string): boolean {
  if (itemPath === "/" ) return currentPath === "/"
  if (!itemPath) return false
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/") || currentPath.startsWith(itemPath + "?")
}

export default function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname()
  const [routes, setRoutes] = useState<RouteDefinition[]>([])
  const [currentUser, setCurrentUser] = useState(getCurrentUserProfile())
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loadRoutes = () => setRoutes(getStoredRoutes())
    loadRoutes()
    const syncUser = () => setCurrentUser(getCurrentUserProfile())
    syncUser()
    // 初始化默认角色权限
    initializeDefaultRolePermissions(getAllPermissionIds())
    window.addEventListener("vibe:routes-updated", loadRoutes)
    window.addEventListener("vibe:user-updated", syncUser)
    window.addEventListener("vibe:roles-updated", syncUser)
    return () => {
      window.removeEventListener("vibe:routes-updated", loadRoutes)
      window.removeEventListener("vibe:user-updated", syncUser)
      window.removeEventListener("vibe:roles-updated", syncUser)
    }
  }, [])

  // 根据当前路径自动展开包含当前页面的分组
  useEffect(() => {
    const shouldExpand: Record<string, boolean> = {}
    const checkExpand = (list: SidebarMenuItem[], parentId?: string) => {
      for (const item of list) {
        const resolved = resolveMenuPath(item, routes)
        if (resolved.href && isPathActive(pathname, resolved.href) && parentId) {
          shouldExpand[parentId] = true
        }
        if (item.children && item.children.length > 0) {
          checkExpand(item.children, item.id)
        }
      }
    }
    checkExpand(items)
    setExpanded((prev) => ({ ...prev, ...shouldExpand }))
  }, [pathname, items, routes])

  const currentRoles = currentUser.roles
  const visibleItems = useMemo(() => filterSidebarItemsByRoles(items, currentRoles), [items, currentRoles])

  const recordRecentVisit = (href: string) => {
    if (!href || href.startsWith("/system")) return
    if (href === "/" ) return
    const state = getPersonalState()
    const recent = [href, ...state.recent.filter((item) => item !== href)].slice(0, 12)
    savePersonalState({ ...state, recent })
  }

  const renderIcon = (item: SidebarMenuItem) => {
    // 优先使用路由定义中的图标，fallback 到菜单自身图标
    const route = item.routeId ? routes.find((r) => r.id === item.routeId) : undefined
    const iconName = item.iconName ?? route?.iconName
    const icon = item.icon ?? route?.icon
    const iconClass = item.iconClass

    if (iconName) return renderLucideIcon(iconName)
    if (iconClass) return <span className={normalizeIconClass(iconClass)} aria-hidden="true" />
    return <span className="text-base">{icon || "◌"}</span>
  }

  const renderItem = (item: SidebarMenuItem, depth = 0): React.ReactNode => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0
    const resolved = resolveMenuPath(item, routes)
    const isActive = resolved.href ? isPathActive(pathname, resolved.href) : false
    const isExpanded = item.id ? (expanded[item.id] !== false) : true
    const isLink = resolved.href && !hasChildren
    const isExternal = resolved.isExternal

    const containerClass = depth > 0 ? "ml-3 border-l border-white/8 pl-3" : ""
    const baseButtonClass = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition ${
      isActive ? "bg-[#f68f4d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_12px_20px_rgba(246,143,77,0.22)]" : "text-slate-200 hover:bg-[#111a2b]"
    }`

    const toggleExpand = () => {
      if (item.id && hasChildren) {
        setExpanded((prev) => {
          const key = item.id as string
          return { ...prev, [key]: !(prev[key] ?? true) }
        })
      }
    }

    const handleClick = () => {
      if (resolved.href) recordRecentVisit(resolved.href)
      if (hasChildren) toggleExpand()
    }

    const content = (
      <>
        <span className="flex w-4 justify-center text-center">{renderIcon(item)}</span>
        <span className="truncate">{item.label}</span>
        {hasChildren ? <span className="ml-auto text-[10px] text-slate-400">{isExpanded ? "▾" : "▸"}</span> : null}
        {isExternal && !hasChildren ? <span className="ml-auto text-[10px] text-slate-400">↗</span> : null}
      </>
    )

    return (
      <div key={`${item.id || item.label}-${depth}`} className={containerClass}>
        {isLink && !hasChildren ? (
          isExternal ? (
            <a
              href={resolved.href}
              target={resolved.target || "_blank"}
              rel="noopener noreferrer"
              className={baseButtonClass}
              onClick={handleClick}
            >
              {content}
            </a>
          ) : (
            <Link href={resolved.href} className={baseButtonClass} onClick={handleClick}>
              {content}
            </Link>
          )
        ) : (
          <button type="button" className={baseButtonClass} onClick={handleClick}>
            {content}
          </button>
        )}

        {hasChildren && isExpanded ? (
          <div className="mt-1 space-y-1">{item.children?.map((child) => renderItem(child, depth + 1))}</div>
        ) : null}
      </div>
    )
  }

  return (
    <nav className="space-y-1.5">
      {/* 首页入口 */}
      <Link
        href="/"
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition ${
          pathname === "/" ? "bg-[#f68f4d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_12px_20px_rgba(246,143,77,0.22)]" : "text-slate-200 hover:bg-[#111a2b]"
        }`}
      >
        <span className="flex w-4 justify-center text-center">{renderLucideIcon("Home")}</span>
        <span className="truncate">首页</span>
      </Link>
      {visibleItems.map((item) => renderItem(item))}
    </nav>
  )
}
