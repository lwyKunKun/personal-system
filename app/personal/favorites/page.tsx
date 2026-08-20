"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import WorkspaceShell from "../../components/WorkspaceShell"
import { addPersonalEntry, getPersonalState, normalizePersonalPath, removePersonalEntry } from "../../../lib/personal"

export default function PersonalFavoritesPage() {
  const [items, setItems] = useState<string[]>([])
  const [customPath, setCustomPath] = useState("/projects/stock")
  useEffect(() => { setItems(getPersonalState().favorites) }, [])
  const handleAdd = (path?: string) => {
    const value = (path ?? customPath).trim()
    if (!value) return
    const next = addPersonalEntry("favorites", value, 12)
    setItems(next.favorites)
    setCustomPath(value)
  }
  return (
    <WorkspaceShell>
      <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">个人 · 收藏</h1>
            <p className="mt-2 text-slate-300">你的收藏与书签。</p>
          </div>
          <button type="button" onClick={() => handleAdd(window.location.pathname)} className="rounded-xl bg-[#f68f4d] px-3 py-2 text-sm font-medium text-white">收藏当前页</button>
        </div>
        <div className="mb-4 flex gap-3">
          <input value={customPath} onChange={(e) => setCustomPath(e.target.value)} placeholder="输入路径，例如 /system/settings" className="flex-1 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-slate-100 outline-none" />
          <button type="button" onClick={() => handleAdd()} className="rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-100">添加收藏</button>
        </div>
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/8 bg-[#0b1220] p-6 text-slate-400">暂无收藏项目。</div>
          ) : (
            items.map((item) => (
              <div key={item} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0b1220] p-3">
                <Link href={item} className="text-slate-200 hover:text-white">{normalizePersonalPath(item)}</Link>
                <button type="button" onClick={() => { const next = removePersonalEntry("favorites", item); setItems(next.favorites) }} className="text-xs text-rose-200">删除</button>
              </div>
            ))
          )}
        </div>
      </div>
    </WorkspaceShell>
  )
}
