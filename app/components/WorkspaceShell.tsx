"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Sidebar from "./Sidebar"
import { DEFAULT_SIDEBAR_ITEMS, getStoredSidebarItems, type SidebarMenuItem } from "../lib/sidebar-menu"
import { getStoredRoutes, type RouteDefinition } from "../lib/routes"
import { getCurrentUserProfile } from "../lib/user"

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
  const [items, setItems] = useState<SidebarMenuItem[]>(DEFAULT_SIDEBAR_ITEMS)
  const [routes, setRoutes] = useState<RouteDefinition[]>([])
  const [currentUser, setCurrentUser] = useState(getCurrentUserProfile())
  const [currentTitle, setCurrentTitle] = useState(title ?? "")

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
      // 在菜单树中查找
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

  return (
    <div className="min-h-screen bg-[#050b17] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside className="w-[268px] shrink-0 border-r border-white/8 bg-[#060d18] px-4 py-5">
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

          <div className="px-1">
            <Sidebar items={items} />
          </div>

          <div className="mt-8 border-t border-white/8 pt-4">
            <div className="flex items-center justify-between px-2 pb-3 text-xs text-slate-400">
              <span>{currentUser.name || "访客"}</span>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] text-slate-300">
                  {currentUser.roles.length > 0 ? currentUser.roles.join(",") : "公开"}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[12px] text-slate-400">
              <div>联系作者：simonlin.net</div>
              <div className="mt-2">v0.2.0 · 路由管理版</div>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(32,60,100,0.32),transparent_40%),linear-gradient(180deg,#050b17,#071320_60%,#040b14)] p-6">
          {showHeader && (
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/8 bg-[#0b1628]/80 px-3 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="text-[12px] uppercase tracking-[0.18em] text-slate-400">当前页面</div>
                <div className="text-2xl font-semibold text-white">{currentTitle || "概览"}</div>
                {subtitle && <div className="text-sm text-slate-400">{subtitle}</div>}
              </div>
              {action ?? (
                <Link
                  href="/"
                  className="rounded-xl bg-[linear-gradient(135deg,#ff9c5b_0%,#f05d2e_50%,#e74b2a_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(240,93,46,0.28)]"
                >
                  返回首页
                </Link>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
