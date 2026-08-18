"use client"
import Link from "next/link"
import React, { useEffect, useState } from "react"
import * as LucideIcons from "lucide-react"
import { filterSidebarItemsByRoles } from "../lib/access"
import { getCurrentUserProfile } from "../lib/user"
import { getPersonalState, savePersonalState } from "../lib/personal"
import { getStoredSidebarItems, type SidebarMenuItem } from "../lib/sidebar-menu"

// Sidebar 客户端组件
// 作用：
// - 读取并渲染用户自定义的左侧菜单
// - 递归展示子菜单层级
// - 使用 Lucide React 组件渲染图标
// - 提供入口跳转到独立的菜单管理设置页

interface Props {
  defaultItems: SidebarMenuItem[]
  selectedId?: string
  onSelect?: (item: SidebarMenuItem) => void
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

export default function Sidebar({ defaultItems, selectedId, onSelect }: Props) {
  // 本地状态：用来渲染菜单列表
  const [items, setItems] = useState<SidebarMenuItem[]>(defaultItems || [])
  const [currentUser, setCurrentUser] = useState(getCurrentUserProfile())

  // 页面加载时读取本地持久化菜单；如果没有则使用默认菜单
  useEffect(() => {
    const stored = getStoredSidebarItems()
    setItems(stored)

    const syncUser = () => setCurrentUser(getCurrentUserProfile())
    syncUser()
    window.addEventListener("vibe:user-updated", syncUser)
    return () => window.removeEventListener("vibe:user-updated", syncUser)
  }, [defaultItems])

  const currentRoles = currentUser.roles
  const visibleItems = filterSidebarItemsByRoles(items, currentRoles)

  const recordRecentVisit = (path?: string) => {
    if (!path) return
    const state = getPersonalState()
    const recent = [path, ...state.recent.filter((item) => item !== path)].slice(0, 12)
    savePersonalState({ ...state, recent })
  }

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
    const isSelected = selectedId === item.id
    const isSystemTab = item.path?.startsWith("/system")

    const containerClass = depth > 0 ? "ml-3 border-l border-white/8 pl-3" : ""
    const baseButtonClass = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition ${
      isSelected || item.active ? "bg-[#f68f4d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_12px_20px_rgba(246,143,77,0.22)]" : "text-slate-200 hover:bg-[#111a2b]"
    }`

    const handleClick = () => {
      if (item.path && onSelect) {
        if (isSystemTab) {
          onSelect(item)
          recordRecentVisit(item.path)
          return
        }
      }

      if (item.path) {
        recordRecentVisit(item.path)
      }
    }

    const content = (
      <>
        <span className="flex w-4 justify-center text-center">{renderIcon(item)}</span>
        <span className="truncate">{item.label}</span>
        {hasChildren ? <span className="ml-auto text-[10px] text-slate-400">▾</span> : null}
      </>
    )

    return (
      <div key={`${item.label}-${depth}`} className={containerClass}>
        {item.path && !isSystemTab ? (
          <Link href={item.path} className={baseButtonClass} onClick={handleClick}>
            {content}
          </Link>
        ) : (
          <button
            type="button"
            className={baseButtonClass}
            onClick={() => {
              handleClick()
              if (onSelect && item.id) onSelect(item)
            }}
          >
            {content}
          </button>
        )}

        {hasChildren ? <div className="mt-1 space-y-1">{item.children?.map((child) => renderItem(child, depth + 1))}</div> : null}
      </div>
    )
  }

  return (
    <div>
      {/* 菜单列表：递归展示主菜单和子菜单 */}
      <nav className="space-y-1.5">{visibleItems.map((item) => renderItem(item))}</nav>
    </div>
  )
}
