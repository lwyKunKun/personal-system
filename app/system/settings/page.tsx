"use client"
import SystemShell from "../../components/SystemShell"
export default function SystemSettingsPage() {
  return (
    <SystemShell>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">系统设置</h2>
        <p className="text-slate-300">配置主题、同步、日志与基础参数。</p>
        <div className="space-y-3">
          <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4 text-sm text-slate-200">主题：深色模式</div>
          <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4 text-sm text-slate-200">同步：本地存储已启用</div>
          <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4 text-sm text-slate-200">日志：保留最近 30 天</div>
        </div>
      </div>
    </SystemShell>
  )
}
