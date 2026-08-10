import { useEffect, useState } from 'react'
import { motion as m } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useCategoryStore } from '../../stores/categoryStore'
import { query } from '../../lib/alaSqlService'
import { MessageBox } from '../ui/MessageBox'

const COLOR_PRESETS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16']
const EMOJI_LIST = ['💼', '✈️', '🏋️', '📚', '🎨', '🎵', '🍽️', '🏠', '❤️', '⭐', '🌙', '☀️', '🌈', '🔥', '💡', '🎬', '📝', '🧘', '🎮', '🌿']

export function CategoryManagePage() {
  const { categories, loadCategories, createCategory, updateCategory, deleteCategory } = useCategoryStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_PRESETS[0])
  const [icon, setIcon] = useState(EMOJI_LIST[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [usageCount, setUsageCount] = useState(0)
  const [usageMap, setUsageMap] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    query<{ tags: string }>('SELECT tags FROM dreams').then((rows) => {
      try {
        const map: Record<string, number> = {}
        for (const row of rows) {
          if (!row.tags) continue
          try {
            const ids: string[] = JSON.parse(row.tags)
            for (const id of ids) map[id] = (map[id] || 0) + 1
          } catch { /* ignore malformed tags */ }
        }
        setUsageMap(map)
      } catch (e) {
        console.error(e)
        setUsageMap({})
      }
    })
  }, [])

  const handleAdd = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await createCategory(name.trim(), color, icon)
      setName('')
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const startEdit = (cat: { id: string; name: string; color: string; icon: string }) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
    setEditIcon(cat.icon)
  }

  const handleUpdate = async () => {
    if (!editingId || saving) return
    setSaving(true)
    try {
      await updateCategory(editingId, { name: editName, color: editColor, icon: editIcon })
      setEditingId(null)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const confirmDelete = (id: string) => {
    setUsageCount(usageMap[id] || 0)
    setDeleteConfirm(id)
  }

  const handleDelete = async () => {
    if (!deleteConfirm || saving) return
    setSaving(true)
    try {
      await deleteCategory(deleteConfirm)
      setDeleteConfirm(null)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
    >
      <Link to="/calendar" className="text-xs text-gray-400 hover:text-gray-600 tracking-wider transition-colors inline-block mb-6">
        ← 返回日曆
      </Link>
      <h1 className="text-xl font-serif tracking-widest text-gray-700 mb-6">類別管理</h1>

      <div className="bg-gray-50 rounded-lg p-5 mb-8">
        <div className="grid grid-cols-2 gap-5 mb-4">
          <div>
            <p className="text-[10px] text-gray-300 tracking-wider mb-1">名稱</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="類別名稱"
              className="w-full text-xs text-gray-600 bg-transparent border-b border-gray-200 pb-1 focus:outline-none focus:border-gray-400 placeholder-gray-200" />
          </div>
          <div>
            <p className="text-[10px] text-gray-300 tracking-wider mb-1">顏色</p>
            <div className="flex gap-1">
              {COLOR_PRESETS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-4 h-4 rounded-full transition-transform ${color === c ? 'scale-125 ring-1 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-[10px] text-gray-300 tracking-wider mb-1">圖示</p>
          <div className="flex gap-0.5 flex-wrap">
            {EMOJI_LIST.map((e) => (
              <button key={e} onClick={() => setIcon(e)}
                className={`text-sm w-6 h-6 flex items-center justify-center rounded ${icon === e ? 'bg-gray-100' : ''}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <m.button whileTap={{ scale: 0.97 }} onClick={handleAdd} disabled={saving || !name.trim()}
            className="px-5 py-2 bg-gray-800 text-white text-[11px] tracking-wider hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {saving ? '新增中...' : '新增'}
          </m.button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-4 py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors">
            {editingId === cat.id ? (
              <>
                <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="w-8 text-xs bg-transparent border-b border-gray-200" />
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-xs text-gray-600 bg-transparent border-b border-gray-200 flex-1 focus:outline-none focus:border-gray-400" />
                <div className="flex gap-1">
                  {COLOR_PRESETS.map((c) => (
                    <button key={c} onClick={() => setEditColor(c)}
                      className={`w-3.5 h-3.5 rounded-full ${editColor === c ? 'ring-1 ring-gray-400' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <m.button whileTap={{ scale: 0.97 }} onClick={handleUpdate} disabled={saving}
                  className="text-[10px] tracking-wider text-white bg-gray-800 px-3 py-1 rounded hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  {saving ? '儲存中...' : '儲存'}
                </m.button>
                <button onClick={() => !saving ? setEditingId(null) : undefined} className="text-[10px] text-gray-300 hover:text-gray-500 tracking-wider">取消</button>
              </>
            ) : (
              <>
                <span>{cat.icon}</span>
                <span className="text-xs text-gray-600 flex-1">{cat.name}</span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[10px] text-gray-300 tracking-wider">{usageMap[cat.id] || 0} 次</span>
                <button onClick={() => startEdit(cat)} className="text-[10px] text-gray-300 hover:text-gray-500 tracking-wider">編輯</button>
                <button onClick={() => confirmDelete(cat.id)} className="text-[10px] text-gray-300 hover:text-red-400 tracking-wider">刪除</button>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-xs text-gray-300 tracking-wider text-center py-8">尚未建立任何類別</p>
        )}
      </div>

      <MessageBox
        open={deleteConfirm !== null}
        title="刪除類別"
        message={usageCount > 0 ? `此類別已被 ${usageCount} 則夢境使用。刪除後這些夢境中的標籤將顯示為「未知類別」。確定刪除？` : '確定刪除此類別？'}
        confirmText={saving ? '刪除中...' : '確定'}
        onConfirm={handleDelete}
        onCancel={() => !saving ? setDeleteConfirm(null) : undefined}
      />
    </m.div>
  )
}
