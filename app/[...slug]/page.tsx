"use client"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import WorkspaceShell from "../components/WorkspaceShell"
import { getStoredRoutes, type RouteDefinition } from "../lib/routes"
import { ExternalLink, FileText, Globe, AlertTriangle } from "lucide-react"

export default function DynamicRoutePage() {
  const pathname = usePathname()
  const [route, setRoute] = useState<RouteDefinition | null | undefined>(undefined)
  const [routes, setRoutes] = useState<RouteDefinition[]>([])

  useEffect(() => {
    const allRoutes = getStoredRoutes()
    setRoutes(allRoutes)
    // 精确匹配
    const found = allRoutes.find((r) => r.path === pathname)
    setRoute(found ?? null)
  }, [pathname])

  // 外部链接：立即跳转
  useEffect(() => {
    if (route?.type === "link" && route.url) {
      window.open(route.url, route.target || "_blank")
    }
  }, [route])

  if (route === undefined) {
    return (
      <WorkspaceShell>
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400">加载中...</div>
        </div>
      </WorkspaceShell>
    )
  }

  // 404：未找到路由
  if (route === null) {
    return (
      <WorkspaceShell>
        <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
          <h2 className="text-xl font-semibold text-white">页面未找到</h2>
          <p className="mt-2 text-slate-400">路径 <code className="rounded bg-white/8 px-1.5 py-0.5 text-sm">{pathname}</code> 未在路由表中注册。</p>
          <p className="mt-1 text-sm text-slate-500">请在「系统管理 → 路由管理」中创建对应路由。</p>
        </div>
      </WorkspaceShell>
    )
  }

  // 外部链接类型
  if (route.type === "link") {
    return (
      <WorkspaceShell title={route.title}>
        <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-8 text-center">
          <ExternalLink className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h2 className="text-xl font-semibold text-white">{route.title}</h2>
          <p className="mt-2 text-slate-400">正在跳转到外部链接...</p>
          <a
            href={route.url}
            target={route.target || "_blank"}
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f68f4d] px-4 py-2 text-sm font-medium text-white"
          >
            <Globe className="h-4 w-4" />
            手动跳转：{route.url}
          </a>
        </div>
      </WorkspaceShell>
    )
  }

  // iframe 嵌入类型
  if (route.type === "iframe") {
    return (
      <WorkspaceShell title={route.title}>
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1728]/80" style={{ height: "calc(100vh - 160px)" }}>
          <iframe
            src={route.url || route.path}
            className="h-full w-full border-0 bg-white"
            title={route.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </WorkspaceShell>
    )
  }

  // 自定义页面类型（page）：渲染通用占位页面
  return (
    <WorkspaceShell title={route.title}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f68f4d]/15 text-[#ffb476]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{route.title}</h1>
              {route.description && <p className="mt-0.5 text-sm text-slate-400">{route.description}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
          <h2 className="text-base font-medium text-white">页面信息</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-[#0b1220] p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">路径</div>
              <div className="mt-1 font-mono text-sm text-slate-200">{route.path}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-[#0b1220] p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">类型</div>
              <div className="mt-1 text-sm text-slate-200">
                {route.type === "builtin" ? "内置页面" : route.type === "page" ? "自定义页面" : route.type === "link" ? "外部链接" : "iframe 嵌入"}
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-[#0b1220] p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">路由 ID</div>
              <div className="mt-1 font-mono text-xs text-slate-400">{route.id}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-[#0b1220] p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">分组</div>
              <div className="mt-1 text-sm text-slate-200">{route.group === "system" ? "系统" : route.group === "project" ? "项目" : route.group === "personal" ? "个人" : "未分组"}</div>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-[#0b1220]/50 p-6 text-center">
            <p className="text-sm text-slate-400">这是一个自定义页面占位区。</p>
            <p className="mt-1 text-xs text-slate-500">你可以在这里开发专属的页面内容，或通过路由管理将此路径指向 iframe / 外部链接。</p>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  )
}
