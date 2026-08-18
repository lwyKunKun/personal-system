/**
 * 根布局组件（RootLayout）
 * - 作用：为应用的所有页面提供统一的 HTML 结构、字体和全局样式
 * - 注意：Next.js 的 layout 会包裹同一路由及其子路由，因此适合放置侧边栏、顶部导航等全局 UI
 */

import type { Metadata } from "next"
import "./globals.css" // 引入全局样式

// 页面元信息（title / description），用于 SEO 与浏览器标题栏
export const metadata: Metadata = {
  title: "Vibe-Research",
  description: "AI 投研资讯与市场复盘界面",
}

// RootLayout 组件：包裹所有页面内容，并设置语言与基础 class
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      {/* body 使用深色背景并应用全局文本颜色 */}
      <body className="min-h-full bg-[#050b17] text-slate-100">{children}</body>
    </html>
  )
}
