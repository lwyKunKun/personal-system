"use client"
import SystemShell from "../../components/SystemShell"
export default function SystemPermissionsPage() {
  return (
    <SystemShell>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">权限管理</h2>
        <p className="text-slate-300">配置角色、权限策略和可见范围。</p>
        <div className="grid gap-4 md:grid-cols-3">
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
    </SystemShell>
  )
}
