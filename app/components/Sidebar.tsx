"use client"
import Link from "next/link"
import React, { useEffect, useState } from "react"
import * as LucideIcons from "lucide-react"
import { getStoredSidebarItems, type SidebarMenuItem } from "../lib/sidebar-menu"

// Sidebar 客户端组件
// 作用：
// - 读取并渲染用户自定义的左侧菜单
// - 递归展示子菜单层级
// - 使用 Lucide React 组件渲染图标
// - 提供入口跳转到独立的菜单管理设置页

interface Props {
  defaultItems: SidebarMenuItem[]
}

const normalizeIconClass = (value?: string) => {
  const trimmed = value?.trim()
  if (!trimmed) return ""
  return /^iconfont\s+/i.test(trimmed) ? trimmed : `iconfont ${trimmed}`
}

const ICON_MAP = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>

const renderLucideIcon = (iconName?: string) => {
  if (!iconName) return <span className="text-base">◌</span>

  const Icon = ICON_MAP[iconName]
  if (!Icon) {
    return <span className="text-[11px] font-semibold">{iconName.slice(0, 1)}</span>
  }

  return <Icon className="h-4 w-4" />
}

export default function Sidebar({ defaultItems }: Props) {
  // 本地状态：用来渲染菜单列表
  const [items, setItems] = useState<SidebarMenuItem[]>(defaultItems || [])

  // 页面加载时读取本地持久化菜单；如果没有则使用默认菜单
  useEffect(() => {
    const stored = getStoredSidebarItems()
    setItems(stored)
  }, [defaultItems])

  const renderIcon = (item: SidebarMenuItem) => {
    if (item.iconName) {
      return renderLucideIcon(item.iconName)
    }

    if (item.iconClass) {
      return <span className={normalizeIconClass(item.iconClass)} aria-hidden="true" />
    }

    return <span className="text-base">{item.icon || "◌"}</span>
  }

  const renderItem = (item: SidebarMenuItem, depth = 0): React.ReactNode => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0

    return (
      <div key={`${item.label}-${depth}`} className={depth > 0 ? "ml-3 border-l border-white/8 pl-3" : ""}>
        <button
          type="button"
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition ${
            item.active ? "bg-[#f68f4d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_12px_20px_rgba(246,143,77,0.22)]" : "text-slate-200 hover:bg-[#111a2b]"
          }`}
        >
          <span className="flex w-4 justify-center text-center">{renderIcon(item)}</span>
          <span className="truncate">{item.label}</span>
          {hasChildren ? <span className="ml-auto text-[10px] text-slate-400">▾</span> : null}
        </button>

        {hasChildren ? <div className="mt-1 space-y-1">{item.children?.map((child) => renderItem(child, depth + 1))}</div> : null}
      </div>
    )
  }

  return (
    <div>
      {/* 菜单列表：递归展示主菜单和子菜单 */}
      <nav className="space-y-1.5">{items.map((item) => renderItem(item))}</nav>

      {/* 菜单管理页入口：编辑功能统一收口到独立设置页 */}
      <div className="mt-4">
        <Link
          href="/settings"
          className="block rounded-xl border border-white/8 bg-[#0f1a2d] px-3 py-2 text-center text-sm text-slate-200 transition hover:border-[#f68f4d]/60 hover:text-white"
        >
          菜单管理
        </Link>
      </div>
    </div>
  )
}
