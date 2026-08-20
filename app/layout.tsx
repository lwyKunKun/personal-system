/**
 * 根布局组件（RootLayout）
 * - 作用：为应用的所有页面提供统一的 HTML 结构、字体和全局样式
 * - 注意：Next.js 的 layout 会包裹同一路由及其子路由，因此适合放置侧边栏、顶部导航等全局 UI
 */

import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Vibe-Research",
  description: "AI 投研资讯与市场复盘界面",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-[#050b17] text-slate-100">{children}</body>
    </html>
  )
}
