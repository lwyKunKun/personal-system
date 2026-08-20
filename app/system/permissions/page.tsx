"use client"
import { useEffect, useMemo, useState } from "react"
import SystemShell from "../../components/SystemShell"
import { getStoredRoles, createRole, updateRole, deleteRole, type Role } from "../../lib/roles"
import { getStoredUsers, createUser, updateUser, deleteUser, type User } from "../../lib/users"
import { buildPermissionTree, type PermissionNode } from "../../lib/permissions"
import { getStoredRoutes, type RouteDefinition } from "../../lib/routes"
import { getCurrentUserProfile, saveCurrentUserProfile } from "../../lib/user"
import { ShieldCheck, Users, Plus, Trash2, Edit3, Save, X, ChevronRight, ChevronDown, Eye, Check, Lock, UserPlus } from "lucide-react"

type TabType = "roles" | "users"

function useForceUpdate() {
  const [, setTick] = useState(0)
  return () => setTick((t) => t + 1)
}

// ==================== 权限树组件 ====================
function PermissionTree({
  nodes,
  selected,
  onChange,
  expanded,
  onToggleExpand,
  depth = 0,
}: {
  nodes: PermissionNode[]
  selected: Set<string>
  onChange: (id: string, checked: boolean) => void
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  depth?: number
}) {
  return (
    <div className={depth > 0 ? "ml-5 mt-1 space-y-0.5" : "space-y-0.5"}>
      {nodes.map((node) => {
        const hasChildren = node.children && node.children.length > 0
        const isExpanded = expanded.has(node.id)
        const isGroup = node.type === "group"
        const isButton = node.type === "button"

        // 计算该节点下所有子权限ID
        const childIds: string[] = []
        const collectIds = (n: PermissionNode) => {
          if (n.type !== "group") childIds.push(n.id)
          n.children?.forEach(collectIds)
        }
        if (hasChildren) collectIds(node)

        const allChecked = !isGroup && childIds.length > 0 && childIds.every((id) => selected.has(id))
        const someChecked = !allChecked && !isGroup && childIds.some((id) => selected.has(id))

        return (
          <div key={node.id}>
            <div
              className={`flex items-center gap-1.5 rounded-lg py-1 px-1.5 hover:bg-white/5 ${isGroup ? "mt-2 first:mt-0" : ""}`}
              style={{ paddingLeft: depth > 0 ? undefined : undefined }}
            >
              {hasChildren ? (
                <button onClick={() => onToggleExpand(node.id)} className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-400 hover:text-slate-200">
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              ) : (
                <span className="h-4 w-4 shrink-0" />
              )}

              {isGroup ? (
                <span className={`text-xs font-semibold uppercase tracking-wider ${depth === 0 ? "text-slate-300" : "text-slate-400"}`}>
                  {node.name}
                </span>
              ) : (
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked }}
                    onChange={(e) => {
                      const checked = e.target.checked
                      if (childIds.length > 0) {
                        childIds.forEach((id) => onChange(id, checked))
                      } else {
                        onChange(node.id, checked)
                      }
                    }}
                    className="h-3.5 w-3.5 shrink-0 rounded border-slate-500 accent-[#f68f4d]"
                  />
                  <span className={`text-sm ${isButton ? "text-slate-400" : "text-slate-200"}`}>
                    {node.name}
                  </span>
                  {isButton && <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">按钮</span>}
                </label>
              )}
            </div>
            {hasChildren && isExpanded && (
              <PermissionTree
                nodes={node.children!}
                selected={selected}
                onChange={onChange}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                depth={depth + 1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ==================== 角色编辑弹窗 ====================
function RoleEditor({
  role,
  permissionTree,
  onSave,
  onCancel,
}: {
  role: Role | null
  permissionTree: PermissionNode[]
  onSave: (data: { name: string; code: string; description: string; permissions: string[] }) => void
  onCancel: () => void
}) {
  const isNew = !role
  const [name, setName] = useState(role?.name || "")
  const [code, setCode] = useState(role?.code || "")
  const [description, setDescription] = useState(role?.description || "")
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions || []))
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const all = new Set<string>()
    const collect = (nodes: PermissionNode[]) => { for (const n of nodes) { all.add(n.id); if (n.children) collect(n.children) } }
    collect(permissionTree)
    return all
  })

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleChange = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id); else next.delete(id)
      return next
    })
  }

  // 统计选中的菜单/按钮数
  const stats = useMemo(() => {
    let menus = 0, buttons = 0
    for (const id of selected) {
      if (id.startsWith("menu:")) menus++
      else if (id.startsWith("btn:")) buttons++
    }
    return { menus, buttons }
  }, [selected])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1628] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">{isNew ? "新增角色" : "编辑角色"}</h3>
          <button onClick={onCancel} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs text-slate-400">角色名称 *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="如：编辑" className="mt-1 w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400">角色标识 *</label>
              <input value={code} onChange={e => setCode(e.target.value.toLowerCase().replace(/\s+/g, "_"))} placeholder="如：editor" disabled={role?.isSystem} className="mt-1 w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none disabled:opacity-50" />
            </div>
            <div>
              <label className="text-xs text-slate-400">描述</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="角色说明" className="mt-1 w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none" />
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-white">权限分配</label>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="text-[#f68f4d]">{stats.menus} 个菜单</span>
                <span className="text-[#5ea2ff]">{stats.buttons} 个按钮</span>
              </div>
            </div>
            <div className="max-h-[350px] overflow-y-auto rounded-xl border border-white/8 bg-[#0b1220] p-3">
              <PermissionTree nodes={permissionTree} selected={selected} onChange={handleChange} expanded={expanded} onToggleExpand={toggleExpand} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/8 px-5 py-3">
          <button onClick={onCancel} className="rounded-xl border border-white/8 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">取消</button>
          <button
            onClick={() => {
              if (!name.trim() || !code.trim()) return
              onSave({ name: name.trim(), code: code.trim(), description: description.trim(), permissions: [...selected] })
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#f68f4d] px-4 py-2 text-sm font-medium text-white hover:bg-[#e87d3d]"
          >
            <Save className="h-4 w-4" />保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== 用户编辑弹窗 ====================
function UserEditor({
  user,
  roles,
  onSave,
  onCancel,
}: {
  user: User | null
  roles: Role[]
  onSave: (data: { username: string; name: string; password: string; roleIds: string[]; status: "active" | "disabled" }) => void
  onCancel: () => void
}) {
  const isNew = !user
  const [username, setUsername] = useState(user?.username || "")
  const [name, setName] = useState(user?.name || "")
  const [password, setPassword] = useState(user?.password || "123456")
  const [roleIds, setRoleIds] = useState<string[]>(user?.roleIds || [])
  const [status, setStatus] = useState<"active" | "disabled">(user?.status || "active")

  const toggleRole = (id: string) => {
    setRoleIds((prev) => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d1628] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">{isNew ? "新增用户" : "编辑用户"}</h3>
          <button onClick={onCancel} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs text-slate-400">用户名 *</label>
            <input value={username} onChange={e => setUsername(e.target.value)} disabled={!isNew} placeholder="登录用户名" className="mt-1 w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none disabled:opacity-50" />
          </div>
          <div>
            <label className="text-xs text-slate-400">显示名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="用户姓名" className="mt-1 w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none" />
          </div>
          <div>
            <label className="text-xs text-slate-400">密码</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="text" placeholder="登录密码" className="mt-1 w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none" />
          </div>
          <div>
            <label className="text-xs text-slate-400">分配角色</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {roles.map((r) => (
                <button key={r.id} onClick={() => toggleRole(r.id)} className={`rounded-lg border px-3 py-1.5 text-xs transition ${roleIds.includes(r.id) ? "border-[#f68f4d]/50 bg-[#f68f4d]/15 text-[#ffb476]" : "border-white/8 bg-[#0b1220] text-slate-300 hover:border-white/20"}`}>
                  {roleIds.includes(r.id) && <Check className="mr-1 inline h-3 w-3" />}
                  {r.name} <span className="text-slate-500">({r.code})</span>
                </button>
              ))}
            </div>
          </div>
          {!isNew && (
            <div>
              <label className="text-xs text-slate-400">状态</label>
              <div className="mt-1 flex gap-2">
                <button onClick={() => setStatus("active")} className={`rounded-lg border px-3 py-1.5 text-xs ${status === "active" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/8 bg-[#0b1220] text-slate-300"}`}>启用</button>
                <button onClick={() => setStatus("disabled")} className={`rounded-lg border px-3 py-1.5 text-xs ${status === "disabled" ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-white/8 bg-[#0b1220] text-slate-300"}`}>禁用</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/8 px-5 py-3">
          <button onClick={onCancel} className="rounded-xl border border-white/8 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">取消</button>
          <button
            onClick={() => {
              if (!username.trim() || !name.trim()) return
              onSave({ username: username.trim(), name: name.trim(), password, roleIds, status })
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#f68f4d] px-4 py-2 text-sm font-medium text-white hover:bg-[#e87d3d]"
          >
            <Save className="h-4 w-4" />保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== 权限预览组件 ====================
function PermissionPreview({ role, permissionTree, routes }: { role: Role; permissionTree: PermissionNode[]; routes: RouteDefinition[] }) {
  const permSet = new Set(role.permissions)

  const renderPreviewTree = (nodes: PermissionNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      if (node.type === "group") {
        const visibleChildren = node.children?.filter(c => c.type !== "group" ? permSet.has(c.id) : c.children?.some(gc => gc.type !== "group" && permSet.has(gc.id)))
        if (!visibleChildren || visibleChildren.length === 0) return null
        return (
          <div key={node.id} className={depth > 0 ? "ml-4" : ""}>
            <div className={`text-xs font-semibold uppercase tracking-wider text-slate-400 ${depth > 0 ? "mt-2" : "mt-1"}`}>{node.name}</div>
            <div className="mt-1 space-y-0.5">
              {renderPreviewTree(visibleChildren, depth + 1)}
            </div>
          </div>
        )
      }
      if (node.type === "menu") {
        const hasPerm = permSet.has(node.id)
        const route = node.routeId ? routes.find(r => r.id === node.routeId) : null
        const btnPerms = (node.children || []).filter(c => c.type === "button" && permSet.has(c.id))
        return (
          <div key={node.id} className="ml-2">
            <div className={`flex items-center gap-2 text-sm ${hasPerm ? "text-slate-200" : "text-slate-600 line-through"}`}>
              <span>{node.name}</span>
              {route?.path && <span className="font-mono text-[10px] text-slate-500">{route.path}</span>}
            </div>
            {btnPerms.length > 0 && (
              <div className="ml-4 mt-0.5 flex flex-wrap gap-1">
                {btnPerms.map(b => (
                  <span key={b.id} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{b.name}</span>
                ))}
              </div>
            )}
            {node.children?.filter(c => c.type === "group") && (
              <div className="ml-2">{renderPreviewTree(node.children.filter(c => c.type === "group"), depth + 1)}</div>
            )}
          </div>
        )
      }
      return null
    })
  }

  const menuCount = [...permSet].filter(p => p.startsWith("menu:")).length
  const btnCount = [...permSet].filter(p => p.startsWith("btn:")).length

  return (
    <div className="rounded-xl border border-white/8 bg-[#0b1220] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-white">权限预览</span>
        </div>
        <div className="flex gap-3 text-[11px] text-slate-400">
          <span>{menuCount} 菜单</span>
          <span>{btnCount} 按钮</span>
        </div>
      </div>
      {role.code === "admin" ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-400">
          <Lock className="mr-1.5 inline h-3.5 w-3.5" />
          管理员拥有系统全部权限，包括所有菜单和按钮。
        </div>
      ) : (
        <div className="max-h-[280px] overflow-y-auto space-y-2">
          {renderPreviewTree(permissionTree)}
        </div>
      )}
    </div>
  )
}

// ==================== 主页面 ====================
export default function SystemPermissionsPage() {
  const [tab, setTab] = useState<TabType>("roles")
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [routes, setRoutes] = useState<RouteDefinition[]>([])
  const [permissionTree, setPermissionTree] = useState<PermissionNode[]>([])
  const [editingRole, setEditingRole] = useState<Role | null | undefined>(undefined)
  const [editingUser, setEditingUser] = useState<User | null | undefined>(undefined)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [switchIdentity, setSwitchIdentity] = useState(false)
  const forceUpdate = useForceUpdate()

  useEffect(() => {
    setRoles(getStoredRoles())
    setUsers(getStoredUsers())
    setRoutes(getStoredRoutes())
    setPermissionTree(buildPermissionTree())
  }, [])

  const refresh = () => {
    setRoles(getStoredRoles())
    setUsers(getStoredUsers())
    setRoutes(getStoredRoutes())
    setPermissionTree(buildPermissionTree())
    forceUpdate()
  }

  const handleSaveRole = (data: { name: string; code: string; description: string; permissions: string[] }) => {
    if (editingRole) {
      updateRole(editingRole.id, data)
    } else {
      createRole(data)
    }
    setEditingRole(undefined)
    refresh()
  }

  const handleSaveUser = (data: { username: string; name: string; password: string; roleIds: string[]; status: "active" | "disabled" }) => {
    if (editingUser) {
      updateUser(editingUser.id, data)
    } else {
      const u = createUser(data)
      if (!u) { alert("用户名已存在"); return }
    }
    setEditingUser(undefined)
    refresh()
  }

  const handleDeleteRole = (role: Role) => {
    if (role.isSystem) return
    if (confirm(`确定删除角色「${role.name}」？`)) {
      deleteRole(role.id)
      if (selectedRole?.id === role.id) setSelectedRole(null)
      refresh()
    }
  }

  const handleDeleteUser = (user: User) => {
    if (user.isSystem) return
    if (confirm(`确定删除用户「${user.name}」？`)) {
      deleteUser(user.id)
      refresh()
    }
  }

  const handleSwitchIdentity = (roleCode: string) => {
    saveCurrentUserProfile({ name: roleCode === "admin" ? "管理员" : "普通用户", roles: [roleCode] })
    window.location.href = "/"
  }

  const currentUser = getCurrentUserProfile()

  return (
    <SystemShell>
      <div className="space-y-4">
        {/* Tab 头部 */}
        <div className="flex items-center gap-2 border-b border-white/8 pb-3">
          <button
            onClick={() => setTab("roles")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "roles" ? "bg-[#f68f4d]/15 text-[#ffb476]" : "text-slate-400 hover:text-slate-200"}`}
          >
            <ShieldCheck className="h-4 w-4" />角色管理
          </button>
          <button
            onClick={() => setTab("users")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "users" ? "bg-[#f68f4d]/15 text-[#ffb476]" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Users className="h-4 w-4" />用户管理
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setSwitchIdentity(!switchIdentity)}
            className="rounded-lg border border-white/8 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
          >
            当前身份：{currentUser.roles.join(", ")}
          </button>
        </div>

        {/* 切换身份面板 */}
        {switchIdentity && (
          <div className="rounded-xl border border-white/8 bg-[#0b1220] p-3">
            <div className="mb-2 text-xs text-slate-400">快速切换身份（测试权限效果）：</div>
            <div className="flex gap-2">
              {roles.map((r) => (
                <button key={r.id} onClick={() => handleSwitchIdentity(r.code)} className={`rounded-lg px-3 py-1.5 text-xs ${currentUser.roles.includes(r.code) ? "bg-[#f68f4d] text-white" : "border border-white/8 bg-[#101b2d] text-slate-300 hover:border-[#f68f4d]/40"}`}>
                  切换为 {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========== 角色管理 Tab ========== */}
        {tab === "roles" && (
          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            {/* 左侧角色列表 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">共 {roles.length} 个角色</div>
                <button onClick={() => setEditingRole(null)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#f68f4d] px-3 py-2 text-sm font-medium text-white hover:bg-[#e87d3d]">
                  <Plus className="h-4 w-4" />新增角色
                </button>
              </div>
              <div className="space-y-2">
                {roles.map((role) => {
                  const menuCount = role.permissions.filter(p => p.startsWith("menu:")).length
                  const btnCount = role.permissions.filter(p => p.startsWith("btn:")).length
                  return (
                    <div
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      className={`cursor-pointer rounded-xl border p-4 transition ${selectedRole?.id === role.id ? "border-[#f68f4d]/50 bg-[#f68f4d]/8" : "border-white/8 bg-[#0d1628] hover:border-white/20"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-white">{role.name}</span>
                            {role.isSystem && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">系统</span>}
                            <span className="font-mono text-xs text-slate-500">{role.code}</span>
                          </div>
                          {role.description && <div className="mt-0.5 text-sm text-slate-400">{role.description}</div>}
                          <div className="mt-2 flex gap-3 text-xs text-slate-500">
                            <span>{menuCount} 个菜单权限</span>
                            <span>{btnCount} 个按钮权限</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditingRole(role) }} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          {!role.isSystem && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(role) }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 右侧权限预览 */}
            <div>
              {selectedRole ? (
                <PermissionPreview role={selectedRole} permissionTree={permissionTree} routes={routes} />
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-[#0b1220]/50 p-8 text-center text-sm text-slate-500">
                  <Eye className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  选择一个角色查看权限预览
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== 用户管理 Tab ========== */}
        {tab === "users" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">共 {users.length} 个用户</div>
              <button onClick={() => setEditingUser(null)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#f68f4d] px-3 py-2 text-sm font-medium text-white hover:bg-[#e87d3d]">
                <UserPlus className="h-4 w-4" />新增用户
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/8 bg-[#0d1628]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-[#0b1220] text-left text-xs text-slate-400">
                    <th className="px-4 py-3">用户名</th>
                    <th className="px-4 py-3">显示名称</th>
                    <th className="px-4 py-3">角色</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-slate-200">{u.username}</td>
                      <td className="px-4 py-3 text-slate-200">{u.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roleIds.map(rid => {
                            const r = roles.find(role => role.id === rid)
                            return r ? <span key={rid} className="rounded bg-[#f68f4d]/15 px-1.5 py-0.5 text-[10px] text-[#ffb476]">{r.name}</span> : null
                          })}
                          {u.roleIds.length === 0 && <span className="text-xs text-slate-500">未分配</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${u.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                          {u.status === "active" ? "启用" : "禁用"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setEditingUser(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {!u.isSystem && (
                          <button onClick={() => handleDeleteUser(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 弹窗 */}
      {editingRole !== undefined && (
        <RoleEditor
          role={editingRole}
          permissionTree={permissionTree}
          onSave={handleSaveRole}
          onCancel={() => setEditingRole(undefined)}
        />
      )}
      {editingUser !== undefined && (
        <UserEditor
          user={editingUser}
          roles={roles}
          onSave={handleSaveUser}
          onCancel={() => setEditingUser(undefined)}
        />
      )}
    </SystemShell>
  )
}
