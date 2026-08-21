"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import Sidebar from "./Sidebar"
import { DEFAULT_SIDEBAR_ITEMS, getStoredSidebarItems, type SidebarMenuItem } from "../lib/sidebar-menu"
import { getStoredRoutes, type RouteDefinition } from "../lib/routes"
import { getCurrentUserProfile, isLoggedIn, logoutUser, ensureLoggedIn } from "../lib/user"
import { getStoredRoles } from "../lib/roles"
import { hasRoutePermission } from "../lib/permissions"
import { LucideLogOut, LucideUser, LucideShield, LucideChevronDown, LucideSwitchCamera, LucideLock } from "lucide-react"

interface WorkspaceShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  action?: React.ReactNode
  /** 是否在右侧顶部显示面包屑标题栏 */
  showHeader?: boolean
}

export default function WorkspaceShell({ children, title, subtitle, action, showHeader = true }: WorkspaceShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [items, setItems] = useState<SidebarMenuItem[]>(DEFAULT_SIDEBAR_ITEMS)
  const [routes, setRoutes] = useState<RouteDefinition[]>([])
  const [currentUser, setCurrentUser] = useState(getCurrentUserProfile())
  const [currentTitle, setCurrentTitle] = useState(title ?? "")
  const [checked, setChecked] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const loadData = () => {
      setItems(getStoredSidebarItems())
      setRoutes(getStoredRoutes())
    }
    loadData()

    const syncUser = () => setCurrentUser(getCurrentUserProfile())
    syncUser()

    window.addEventListener("vibe:sidebar-updated", loadData)
    window.addEventListener("vibe:routes-updated", loadData)
    window.addEventListener("vibe:user-updated", syncUser)
    return () => {
      window.removeEventListener("vibe:sidebar-updated", loadData)
      window.removeEventListener("vibe:routes-updated", loadData)
      window.removeEventListener("vibe:user-updated", syncUser)
    }
  }, [])

  // 登录状态检查（含自动迁移/自动登录）
  useEffect(() => {
    if (ensureLoggedIn()) {
      setChecked(true)
      setCurrentUser(getCurrentUserProfile())
    } else if (!isLoggedIn()) {
      router.replace("/login")
    } else {
      setChecked(true)
    }
  }, [router, pathname])

  const handleLogout = () => {
    setUserMenuOpen(false)
    logoutUser()
    router.push("/login")
  }

  const handleSwitchUser = () => {
    setUserMenuOpen(false)
    logoutUser()
    router.push("/login")
  }

  // 根据当前路径查找对应的路由/菜单标题
  useEffect(() => {
    if (title) {
      setCurrentTitle(title)
      return
    }
    const route = routes.find((r) => r.path === pathname)
    if (route) {
      setCurrentTitle(route.title)
    } else {
      const findLabel = (list: SidebarMenuItem[]): string | null => {
        for (const item of list) {
          if (item.routeId) {
            const r = routes.find((rr) => rr.id === item.routeId)
            if (r && r.path === pathname) return item.label
          }
          if (item.path === pathname) return item.label
          if (item.children) {
            const found = findLabel(item.children)
            if (found) return found
          }
        }
        return null
      }
      setCurrentTitle(findLabel(items) ?? "")
    }
  }, [pathname, routes, items, title])

  // 点击外部关闭用户菜单
  useEffect(() => {
    if (!userMenuOpen) return
    const handler = () => setUserMenuOpen(false)
    setTimeout(() => document.addEventListener("click", handler), 0)
    return () => document.removeEventListener("click", handler)
  }, [userMenuOpen])

  const isAdmin = currentUser.roles.includes("admin")

  // 计算当前用户的权限集合，用于路由守卫
  const userPermissionIds = useMemo(() => {
    if (isAdmin) return new Set<string>()
    const allRoles = getStoredRoles()
    const permSet = new Set<string>()
    for (const code of currentUser.roles) {
      const role = allRoles.find((r) => r.code === code)
      if (role) {
        role.permissions.forEach((p) => permSet.add(p))
      }
    }
    return permSet
  }, [currentUser, isAdmin])

  // 路由权限守卫：检查当前页面是否有权限访问
  const hasAccess = useMemo(() => {
    if (!checked) return true
    return hasRoutePermission(pathname, userPermissionIds, isAdmin)
  }, [pathname, userPermissionIds, isAdmin, checked])

  // 获取用户角色名称
  const roles = getStoredRoles()
  const getUserRoleNames = () => {
    return currentUser.roles
      .map((code) => roles.find((r) => r.code === code)?.name || code)
      .join("、")
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050b17]">
        <div className="text-sm text-slate-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b17] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside className="w-[268px] shrink-0 border-r border-white/8 bg-[#060d18] px-4 py-5 flex flex-col">
          <div className="mb-6 flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[radial-gradient(circle_at_30%_30%,#ffb199_0%,#ec6b3d_30%,#b23d2d_100%)] text-lg font-bold text-white shadow-[0_0_18px_rgba(255,112,67,0.35)]">
              V
            </div>
            <div className="text-[15px] font-semibold text-[#f4f5f8]">Vibe-Research</div>
          </div>

          <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#2d3746] bg-[#111a2b] px-3 py-2 text-[12px] text-slate-300">
            <span className="text-base text-orange-300">◌</span>
            <span>个人AI投研系统 · A股/美股/港股</span>
          </div>

          <div className="px-1 flex-1 overflow-y-auto">
            <Sidebar items={items} />
          </div>

          <div className="mt-4 border-t border-white/8 pt-3">
            <div className="text-[11px] text-slate-600 px-1">
              <div>联系作者：simonlin.net</div>
              <div className="mt-0.5">v0.2.0 · 路由管理版</div>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(32,60,100,0.32),transparent_40%),linear-gradient(180deg,#050b17,#071320_60%,#040b14)] p-6">
          {showHeader && (
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/8 bg-[#0b1628]/80 px-4 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="text-[12px] uppercase tracking-[0.18em] text-slate-400">当前页面</div>
                <div className="text-2xl font-semibold text-white">{hasAccess ? (currentTitle || "概览") : "无访问权限"}</div>
                {subtitle && <div className="text-sm text-slate-400">{subtitle}</div>}
              </div>
              <div className="flex items-center gap-3">
                {hasAccess && action}
                {hasAccess && !action && (
                  <Link
                    href="/"
                    className="rounded-xl bg-[linear-gradient(135deg,#ff9c5b_0%,#f05d2e_50%,#e74b2a_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(240,93,46,0.28)]"
                  >
                    返回首页
                  </Link>
                )}

                {/* 用户切换按钮 - 放在顶部右侧 */}
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen) }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                      isAdmin
                        ? "border-[#f68f4d]/30 bg-[#f68f4d]/10 text-[#f68f4d] hover:bg-[#f68f4d]/15"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                      isAdmin ? "bg-[#f68f4d]/20" : "bg-white/10"
                    }`}>
                      {isAdmin ? <LucideShield className="h-3.5 w-3.5" /> : <LucideUser className="h-3.5 w-3.5" />}
                    </div>
                    <span className="font-medium">{currentUser.name}</span>
                    <span className={`text-[10px] rounded px-1.5 py-0.5 ${
                      isAdmin ? "bg-[#f68f4d]/20" : "bg-white/10"
                    }`}>
                      {getUserRoleNames()}
                    </span>
                    <LucideChevronDown className={`h-3.5 w-3.5 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {userMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0f1828] shadow-xl shadow-black/40 z-50"
                    >
                      <div className="border-b border-white/8 px-3 py-2.5">
                        <div className="text-sm font-medium text-slate-200">{currentUser.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">当前角色：{getUserRoleNames()}</div>
                      </div>
                      <button
                        onClick={handleSwitchUser}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <LucideSwitchCamera className="h-4 w-4 text-slate-400" />
                        切换用户 / 切换角色
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 border-t border-white/8 px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/5"
                      >
                        <LucideLogOut className="h-4 w-4" />
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {hasAccess ? children : (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 mb-6">
                <LucideLock className="h-8 w-8 text-red-400" />
              </div>
              <div className="text-xl font-semibold text-white mb-2">无访问权限</div>
              <div className="text-sm text-slate-400 mb-6">您当前的角色（{getUserRoleNames()}）无权访问此页面</div>
              <Link
                href="/"
                className="rounded-xl bg-[linear-gradient(135deg,#ff9c5b_0%,#f05d2e_50%,#e74b2a_100%)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_24px_rgba(240,93,46,0.28)]"
              >
                返回首页
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
