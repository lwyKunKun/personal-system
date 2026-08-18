"use client"

import { useState } from "react"
import Sidebar from "./components/Sidebar"
import SettingsPage from "./settings/page"
import { DEFAULT_SIDEBAR_ITEMS, type SidebarMenuItem } from "./lib/sidebar-menu"

const navItems = DEFAULT_SIDEBAR_ITEMS

const marketStats = [
  { label: "上证指数", value: "4043.64", change: "+0.37%", tone: "positive" },
  { label: "深证成指", value: "15597.51", change: "+0.64%", tone: "positive" },
  { label: "创业板指", value: "4019.93", change: "+0.07%", tone: "positive" },
  { label: "沪深300", value: "4842.17", change: "+0.62%", tone: "positive" },
]

const globalMarkets = [
  { label: "道琼斯 美股", value: "52900.07", change: "+1.14%", tone: "positive" },
  { label: "标普500 美股", value: "7483.24", change: "0%", tone: "neutral" },
  { label: "纳斯达克 美股", value: "25832.67", change: "-0.8%", tone: "negative" },
  { label: "恒生指数 港股", value: "23350.03", change: "+1.28%", tone: "positive" },
  { label: "恒生科技 港股", value: "4499", change: "+1%", tone: "positive" },
]

const featuredStocks = [
  { symbol: "平安银行", value: "10.29", change: "+0.1%", tone: "positive" },
  { symbol: "招商银行", value: "39.45", change: "+0.7%", tone: "positive" },
  { symbol: "中国平安", value: "44.81", change: "+0.5%", tone: "positive" },
]

const insightTags = [
  "AI / 大模型 71",
  "半导体 / 芯片 46",
  "机器人 / 自动化 23",
  "汽车 / 新能源车 28",
  "能源 / 新能源 54",
  "生物医药 / 健康 30",
  "网络安全 25",
  "科创 / 互联网 91",
  "消费电子 / 数码 42",
  "财经 / 宏观 62",
  "科学 / 前沿 45",
]

const aiNews = [
  { time: "07-05 04:55", source: "TechCrunch", title: "New Google commercial imagines a Declaration of Independence written with help from AI" },
  { time: "07-05 02:30", source: "TechCrunch", title: "Midjourney wants Hollywood studios to reveal the details of their AI usage" },
  { time: "07-05 00:52", source: "TechCrunch", title: "Alibaba reportedly bans employees from using Claude Code" },
  {
    time: "07-05 00:21",
    source: "MarkTechPost",
    title: "Anthropic Launches Claude Science Beta: A Multi-Agent AI Workbench for Reproducible Genomics, Proteomics, and Cheminformatics Pipelines",
  },
  { time: "07-05 00:14", source: "MarkTechPost", title: "NVIDIA HIRON: A Hands-Free Agent that Evolves Git Worktrees and Hits 100% RTL Benchmark" },
]

function SystemWorkspace() {
  const [activeTab, setActiveTab] = useState("system-menus")

  const tabMap: Record<string, { label: string; description: string; content: React.ReactNode }> = {
    "system-menus": { label: "菜单管理", description: "配置导航结构、分组、排序与权限", content: <SettingsPage /> },
    "system-routes": {
      label: "路由管理",
      description: "管理页面映射与入口定义",
      content: (
        <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
          <h2 className="text-2xl font-semibold text-white">系统 · 路由管理</h2>
          <p className="mt-3 text-slate-300">管理页面入口、路由映射与导航归属。</p>
        </div>
      ),
    },
    "system-permissions": {
      label: "权限管理",
      description: "定义角色策略与访问控制",
      content: (
        <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
          <h2 className="text-2xl font-semibold text-white">系统 · 权限管理</h2>
          <p className="mt-3 text-slate-300">配置角色、权限策略和可见范围。</p>
        </div>
      ),
    },
    "system-settings": {
      label: "设置",
      description: "系统基础配置与运行参数",
      content: (
        <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
          <h2 className="text-2xl font-semibold text-white">系统 · 设置</h2>
          <p className="mt-3 text-slate-300">配置主题、同步、日志与基础参数。</p>
        </div>
      ),
    },
  }

  const current = tabMap[activeTab] ?? tabMap["system-menus"]

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1628] shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
      <div className="border-b border-white/8 bg-[#0b1220] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">当前模块</div>
            <div className="mt-1 text-lg font-medium text-white">{current.label}</div>
          </div>
          <div className="rounded-full border border-white/8 bg-[#0d1628] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-300">{current.description}</div>
        </div>
      </div>
      <div className="p-4 md:p-5">{current.content}</div>
    </div>
  )
}

function WorkspacePanel({ selectedItem }: { selectedItem?: SidebarMenuItem }) {
  if (!selectedItem) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
        <h2 className="text-2xl font-semibold text-white">系统概览</h2>
        <p className="mt-3 text-slate-300">从左侧菜单选择一个模块，内容会在这里直接展示，不会打开新的页面。</p>
      </div>
    )
  }

  if (selectedItem.path?.startsWith("/system")) {
    return <SystemWorkspace />
  }

  if (selectedItem.id === "project-stock") {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
        <h2 className="text-2xl font-semibold text-white">股票</h2>
        <p className="mt-3 text-slate-300">模块内容在右侧展示，保持与左侧菜单同一工作区。</p>
      </div>
    )
  }

  if (selectedItem.id === "project-bookshelf") {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
        <h2 className="text-2xl font-semibold text-white">书架</h2>
        <p className="mt-3 text-slate-300">书籍与笔记区域。</p>
      </div>
    )
  }

  if (selectedItem.id === "project-llm-wiki") {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
        <h2 className="text-2xl font-semibold text-white">llm-wiki</h2>
        <p className="mt-3 text-slate-300">知识库内容区域。</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
      <h2 className="text-2xl font-semibold text-white">{selectedItem.label}</h2>
      <p className="mt-3 text-slate-300">当前模块已在右侧工作区展示。</p>
    </div>
  )
}

export default function Home() {
  const [selectedItem, setSelectedItem] = useState<SidebarMenuItem | undefined>({
    id: "system-menus",
    label: "菜单管理",
    group: "system",
    path: "/system?tab=menus",
  })

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
            <Sidebar
              defaultItems={navItems}
              selectedId={selectedItem?.id}
              onSelect={(item) => {
                setSelectedItem(item)
              }}
            />
          </div>

          <div className="mt-8 border-t border-white/8 pt-4">
            <div className="flex items-center justify-between px-2 pb-3 text-xs text-slate-400">
              <span>亮色</span>
              <div className="flex items-center gap-3">
                <span>◐</span>
                <span>⌁</span>
                <span>◫</span>
              </div>
            </div>
            <div className="mt-2 text-[12px] text-slate-400">
              <div>联系作者：simonlin.net</div>
              <div className="mt-2">v0.1.0 · 不停歇 · 不预测 · 无顾问</div>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(32,60,100,0.32),transparent_40%),linear-gradient(180deg,#050b17,#071320_60%,#040b14)] p-6">
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/8 bg-[#0b1628]/80 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="text-[12px] uppercase tracking-[0.18em] text-slate-400">当前选中</div>
              <div className="text-2xl font-semibold text-white">{selectedItem?.label ?? "系统概览"}</div>
            </div>
            <button
              type="button"
              className="rounded-xl bg-[linear-gradient(135deg,#ff9c5b_0%,#f05d2e_50%,#e74b2a_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(240,93,46,0.28)]"
            >
              与 AI 对话
            </button>
          </div>

          {selectedItem?.path?.startsWith("/system") ? (
            <SystemWorkspace />
          ) : (
            <div className="space-y-6">
              <section className="mb-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold text-white">大盘指数</h2>
                  <button type="button" className="text-slate-400">
                    ↻
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {marketStats.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/8 bg-[#0e1a2d]/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                      <div className="mb-3 text-[12px] text-slate-400">{item.label}</div>
                      <div className="flex items-end justify-between gap-4">
                        <div className="text-[18px] font-semibold text-white">{item.value}</div>
                        <div className={`text-[12px] font-medium ${item.tone === "positive" ? "text-[#27d17f]" : "text-[#ff5d78]"}`}>{item.change}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold text-white">全球市场</h2>
                  <div className="text-xs text-slate-400">A股常见股指 · 港股 · 美股</div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {globalMarkets.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/8 bg-[#0c1827]/80 p-4">
                      <div className="mb-3 text-[12px] text-slate-400">{item.label}</div>
                      <div className="flex items-end justify-between gap-4">
                        <div className="text-[18px] font-semibold text-white">{item.value}</div>
                        <div className={`text-[12px] font-medium ${item.tone === "positive" ? "text-[#27d17f]" : item.tone === "negative" ? "text-[#ff5d78]" : "text-slate-300"}`}>
                          {item.change}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-white">关注股票</h2>
                    <button type="button" className="text-xs text-slate-400">
                      实时关注
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {featuredStocks.map((stock) => (
                      <div key={stock.symbol} className="rounded-xl border border-white/8 bg-[#0b1220] p-3">
                        <div className="mb-3 text-[12px] text-slate-400">{stock.symbol}</div>
                        <div className="flex items-end justify-between gap-4">
                          <div className="text-[17px] font-semibold text-white">{stock.value}</div>
                          <div className={`text-[12px] font-medium ${stock.tone === "positive" ? "text-[#27d17f]" : "text-[#ff5d78]"}`}>{stock.change}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-5">
                  <div className="mb-4 text-[16px] font-semibold text-white">热点主题</div>
                  <div className="flex flex-wrap gap-2">
                    {insightTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/8 bg-[#101a2b] px-2.5 py-1.5 text-[11px] text-slate-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.6fr_0.85fr]">
                <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-white">AI 新闻</h2>
                    <button type="button" className="text-xs text-slate-400">
                      更多
                    </button>
                  </div>
                  <div className="space-y-3">
                    {aiNews.map((item) => (
                      <div key={`${item.time}-${item.title}`} className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5">
                        <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{item.time}</span>
                          <span>•</span>
                          <span>{item.source}</span>
                        </div>
                        <div className="text-[14px] leading-6 text-slate-200">{item.title}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-5">
                  <div className="mb-4 text-[16px] font-semibold text-white">AI 对话</div>
                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="rounded-xl border border-[#2d3746] bg-[#111a2b] p-3">当前热点：AI 产业链继续走强，龙头企业估值修复。</div>
                    <div className="rounded-xl border border-[#2d3746] bg-[#111a2b] p-3">建议：关注产业链上游与应用端的同步回调机会。</div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
