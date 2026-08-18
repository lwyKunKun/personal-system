"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import SettingsPage from "../settings/page"

const SYSTEM_TABS = [
  { id: "menus", label: "菜单管理", description: "配置导航结构、分组、排序与权限", accent: "#f68f4d" },
  { id: "routes", label: "路由管理", description: "管理页面映射与入口定义", accent: "#5ea2ff" },
  { id: "permissions", label: "权限管理", description: "定义角色策略与访问控制", accent: "#34d399" },
  { id: "settings", label: "设置", description: "系统基础配置与运行参数", accent: "#fbbf24" },
] as const

function SystemOverviewStats() {
  return (
    <div className="mb-5 grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">总菜单数</div>
        <div className="mt-2 text-2xl font-semibold text-white">18</div>
      </div>
      <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">分组</div>
        <div className="mt-2 text-2xl font-semibold text-white">3</div>
      </div>
      <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">角色策略</div>
        <div className="mt-2 text-2xl font-semibold text-white">4</div>
      </div>
      <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">状态</div>
        <div className="mt-2 text-2xl font-semibold text-[#34d399]">在线</div>
      </div>
    </div>
  )
}

function SystemRoutePanel() {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
      <h2 className="text-2xl font-semibold text-white">系统 · 路由管理</h2>
      <p className="mt-3 text-slate-300">管理页面入口、路由映射与导航归属。</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">已配置路由</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li> / </li>
            <li> /projects/stock </li>
            <li> /projects/bookshelf </li>
            <li> /system?tab=menus </li>
            <li> /system?tab=permissions </li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">管理建议</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>菜单路由采用统一命名规范</li>
            <li>系统页面通过 tab 视图展示，避免页面碎片化</li>
            <li>权限与菜单配置应保持联动</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function SystemPermissionPanel() {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
      <h2 className="text-2xl font-semibold text-white">系统 · 权限管理</h2>
      <p className="mt-3 text-slate-300">配置角色、权限策略和可见范围。</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">管理员</div>
          <div className="mt-2 text-lg font-semibold text-white">全部权限</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">普通用户</div>
          <div className="mt-2 text-lg font-semibold text-white">项目与个人</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">访客</div>
          <div className="mt-2 text-lg font-semibold text-white">公开入口</div>
        </div>
      </div>
    </div>
  )
}

function SystemSettingsPanel() {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
      <h2 className="text-2xl font-semibold text-white">系统 · 设置</h2>
      <p className="mt-3 text-slate-300">配置主题、同步、日志与基础参数。</p>
      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4 text-sm text-slate-200">主题：深色模式</div>
        <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4 text-sm text-slate-200">同步：本地存储已启用</div>
        <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4 text-sm text-slate-200">日志：保留最近 30 天</div>
      </div>
    </div>
  )
}

function SystemShell() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "menus")

  useEffect(() => {
    const nextTab = searchParams.get("tab") ?? "menus"
    setActiveTab(nextTab)
  }, [searchParams])

  const currentTab = SYSTEM_TABS.find((tab) => tab.id === activeTab) ?? SYSTEM_TABS[0]
  const tabConfig: Record<string, React.ReactNode> = {
    menus: <SettingsPage />,
    routes: <SystemRoutePanel />,
    permissions: <SystemPermissionPanel />,
    settings: <SystemSettingsPanel />,
  }

  const handleSelectTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tabId)
    setActiveTab(tabId)
    router.replace(`/system?${params.toString()}`, { scroll: false })
  }

  return (
    <main className="min-h-screen bg-[#050b17] p-5 text-slate-100 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">system</div>
            <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">系统管理中心</h1>
          </div>
          <Link href="/" className="rounded-xl border border-white/8 bg-[#0d1628] px-3.5 py-2 text-sm text-slate-200 hover:text-white">
            返回首页
          </Link>
        </div>

        <SystemOverviewStats />

        <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-white/8 bg-[#0d1628] p-3">
            <div className="mb-3 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">系统导航</div>
            <div className="space-y-2">
              {SYSTEM_TABS.map((tab) => {
                const isActive = currentTab.id === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectTab(tab.id)}
                    className={`block w-full rounded-xl border px-3 py-2.5 text-left transition ${
                      isActive ? "border-[#f68f4d]/60 bg-[#f68f4d]/12 text-[#ffb476]" : "border-white/8 bg-[#101b2d] text-slate-200 hover:border-[#f68f4d]/40"
                    }`}
                    style={isActive ? { boxShadow: `inset 0 0 0 1px ${tab.accent}33` } : undefined}
                  >
                    <div className="text-sm font-medium">{tab.label}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{tab.description}</div>
                  </button>
                )
              })}
            </div>
          </aside>

          <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1628] shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
            <div className="border-b border-white/8 bg-[#0b1220] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">当前模块</div>
                  <div className="mt-1 text-lg font-medium text-white">{currentTab.label}</div>
                </div>
                <div className="rounded-full border border-white/8 bg-[#0d1628] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-300">{currentTab.description}</div>
              </div>
            </div>

            <div className="p-4 md:p-5">{tabConfig[activeTab] ?? tabConfig.menus}</div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function SystemPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050b17] p-5 text-slate-100">Loading system...</div>}>
      <SystemShell />
    </Suspense>
  )
}
