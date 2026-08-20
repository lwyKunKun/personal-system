"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, PanelTop, Route, ShieldCheck, SlidersHorizontal } from "lucide-react"
import WorkspaceShell from "./WorkspaceShell"

const SYSTEM_NAV = [
  { id: "menus", path: "/system/menus", label: "菜单管理", description: "配置导航结构、分组、排序与权限", Icon: PanelTop, accent: "#f68f4d" },
  { id: "routes", path: "/system/routes", label: "路由管理", description: "管理页面映射与入口定义", Icon: Route, accent: "#5ea2ff" },
  { id: "permissions", path: "/system/permissions", label: "权限管理", description: "定义角色策略与访问控制", Icon: ShieldCheck, accent: "#34d399" },
  { id: "settings", path: "/system/settings", label: "系统设置", description: "系统基础配置与运行参数", Icon: SlidersHorizontal, accent: "#fbbf24" },
]

interface SystemShellProps {
  children: React.ReactNode
}

export default function SystemShell({ children }: SystemShellProps) {
  const pathname = usePathname()

  return (
    <WorkspaceShell showHeader={false}>
      <div className="space-y-5">
        {/* 系统页面头部 */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#0b1628]/80 px-5 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">system</div>
            <h1 className="mt-1 text-2xl font-semibold text-white">系统管理中心</h1>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-[#0d1628] px-3.5 py-2 text-sm text-slate-200 hover:text-white">
            <Home className="h-4 w-4" />
            返回首页
          </Link>
        </div>

        {/* 主体：左侧系统子导航 + 右侧内容 */}
        <div className="grid gap-4 xl:grid-cols-[200px_1fr]">
          <aside className="rounded-2xl border border-white/8 bg-[#0d1628] p-3">
            <div className="mb-3 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">系统导航</div>
            <div className="space-y-2">
              {SYSTEM_NAV.map((nav) => {
                const isActive = pathname.startsWith(nav.path)
                return (
                  <Link
                    key={nav.id}
                    href={nav.path}
                    className={`block rounded-xl border px-3 py-2.5 text-left transition ${
                      isActive ? "border-[#f68f4d]/60 bg-[#f68f4d]/12 text-[#ffb476]" : "border-white/8 bg-[#101b2d] text-slate-200 hover:border-[#f68f4d]/40"
                    }`}
                    style={isActive ? { boxShadow: `inset 0 0 0 1px ${nav.accent}33` } : undefined}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <nav.Icon className="h-4 w-4" />
                      {nav.label}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">{nav.description}</div>
                  </Link>
                )
              })}
            </div>
          </aside>

          <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1628] shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
            <div className="p-4 md:p-5">{children}</div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  )
}
