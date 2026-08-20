"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import WorkspaceShell from "../../components/WorkspaceShell"
import { getPersonalState, normalizePersonalPath, removePersonalEntry, savePersonalState } from "../../../lib/personal"

export default function PersonalRecentPage() {
  const [items, setItems] = useState<string[]>([])
  useEffect(() => { setItems(getPersonalState().recent) }, [])
  const clearRecent = () => {
    const next = getPersonalState()
    savePersonalState({ ...next, recent: [] })
    setItems([])
  }
  return (
    <WorkspaceShell>
      <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">个人 · 最近</h1>
            <p className="mt-2 text-slate-300">最近访问过的页面会自动记录在这里。</p>
          </div>
          <button type="button" onClick={clearRecent} className="rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-100">清空</button>
        </div>
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/8 bg-[#0b1220] p-6 text-slate-400">暂无最近访问记录。</div>
          ) : (
            items.map((item) => (
              <div key={item} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0b1220] p-3">
                <Link href={item} className="text-slate-200 hover:text-white">{normalizePersonalPath(item)}</Link>
                <button type="button" onClick={() => { const next = removePersonalEntry("recent", item); setItems(next.recent) }} className="text-xs text-rose-200">删除</button>
              </div>
            ))
          )}
        </div>
      </div>
    </WorkspaceShell>
  )
}
