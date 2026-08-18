"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { addPersonalEntry, getPersonalState, normalizePersonalPath, removePersonalEntry, savePersonalState } from "../../lib/personal"

const DEFAULT_COMMON_ITEMS = ["/projects/stock", "/projects/bookshelf", "/system/menus", "/personal/favorites"]

export default function PersonalCommonPage() {
  const [items, setItems] = useState<string[]>([])

  useEffect(() => {
    const state = getPersonalState()
    if (state.common.length === 0) {
      const updated = { ...state, common: DEFAULT_COMMON_ITEMS }
      savePersonalState(updated)
      setItems(updated.common)
    } else {
      setItems(state.common)
    }
  }, [])

  const addCommon = (path: string) => {
    const next = addPersonalEntry("common", path, 12)
    setItems(next.common)
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1728]/80 p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">个人 · 常用</h1>
          <p className="mt-3 text-slate-300">常用工具与快捷入口。</p>
        </div>
        <button type="button" onClick={() => addCommon("/projects/ai")} className="rounded-xl bg-[#f68f4d] px-3 py-2 text-sm font-medium text-white">
          添加 AI 入口
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/8 bg-[#0b1220] p-6 text-slate-400">暂无常用入口。</div>
        ) : (
          items.map((item) => (
            <div key={item} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0b1220] p-3">
              <Link href={item} className="text-slate-200 hover:text-white">
                {normalizePersonalPath(item)}
              </Link>
              <button
                type="button"
                onClick={() => {
                  const next = removePersonalEntry("common", item)
                  setItems(next.common)
                }}
                className="text-xs text-rose-200"
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
