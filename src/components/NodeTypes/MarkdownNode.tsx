import React, { useState, useEffect } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import ReactMarkdown from 'react-markdown'
import { useFlowStore } from '../../store'
import { GRID_DOT_COLOR } from '../../config'

export default function MarkdownNode(props: NodeProps) {
  const { id, data, selected } = props
  const updateNode = useFlowStore((s) => s.updateNode)
  const enableDragSelected = useFlowStore((s) => s.enableDragSelected)
  const disableDragAll = useFlowStore((s) => s.disableDragAll)
  const snapshot = useFlowStore((s) => s.snapshot)
  const globalShowOutline = useFlowStore((s) => s.showOutline)
  const locked = useFlowStore((s) => s.locked)
  const showOutline = data?.showOutline ?? globalShowOutline
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const setIsEditing = useFlowStore((s) => s.setIsEditing)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const width = data?.width || 300
  const height = data?.height || 120

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })
    }
  }, [editing])

  function toggleOutline(e: React.MouseEvent) {
    e.stopPropagation()
    updateNode(id, { showOutline: !showOutline })
  }

  function startResize(e: React.PointerEvent, dir: string) {
    e.stopPropagation()
    e.preventDefault()

    const node = useFlowStore.getState().nodes.find((n) => n.id === id)
    const startPos = node?.position || { x: 0, y: 0 }

    const el = e.currentTarget as Element
    try { el.setPointerCapture?.(e.pointerId) } catch {}
    const pointerId = e.pointerId

    const startX = e.clientX
    const startY = e.clientY
    const startW = width
    const startH = height
    // set a resize cursor
    const prevCursor = document.body.style.cursor
    document.body.style.cursor = dir.includes('n') || dir.includes('s') ? 'ns-resize' : dir.includes('e') || dir.includes('w') ? 'ew-resize' : 'nwse-resize'
    const prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    function onMove(ev: PointerEvent) {
      ev.preventDefault()
      let dx = ev.clientX - startX
      let dy = ev.clientY - startY
      let newW = startW
      let newH = startH
      if (dir.includes('e')) newW = Math.max(100, Math.round(startW + dx))
      if (dir.includes('s')) newH = Math.max(60, Math.round(startH + dy))
      if (dir.includes('w')) newW = Math.max(100, Math.round(startW - dx))
      if (dir.includes('n')) newH = Math.max(60, Math.round(startH - dy))

      // compute opposite corner to pin
      const oppX = dir.includes('w') ? startPos.x + startW : startPos.x
      const oppY = dir.includes('n') ? startPos.y + startH : startPos.y
      const newX = dir.includes('w') ? Math.round(oppX - newW) : Math.round(oppX)
      const newY = dir.includes('n') ? Math.round(oppY - newH) : Math.round(oppY)

      updateNode(id, { width: newW, height: newH, position: { x: newX, y: newY } })
    }

    function onUp(ev?: PointerEvent) {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      try { el.releasePointerCapture?.(pointerId) } catch {}
      document.body.style.cursor = prevCursor
      document.body.style.userSelect = prevUserSelect
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const showResizers = hovered || !!selected

  return (
    <div
      style={{ width, height }}
      className={`relative p-0 bg-transparent text-slate-100`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >

      {/* Edge drag handles (top/bottom/left/right) - dragging only enabled when dragging from these */}
      <div className="node-edge-handle top" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />
      <div className="node-edge-handle bottom" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />
      <div className="node-edge-handle left" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />
      <div className="node-edge-handle right" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />

      {/* Top-centered controls positioned above node border */}
      <div className="absolute top-[-36px] left-1/2 transform -translate-x-1/2 flex gap-1 z-50 pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
        {editing ? (
          <>
            <button
              title="Bold"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={(e) => { e.stopPropagation(); const ta = textareaRef.current; if (!ta) return; const start = ta.selectionStart; const end = ta.selectionEnd; const val = ta.value; const selected = val.slice(start, end); const replaced = `**${selected || 'bold'}**`; const newVal = val.slice(0, start) + replaced + val.slice(end); updateNode(id, { content: newVal }); requestAnimationFrame(() => { ta.selectionStart = start + 2; ta.selectionEnd = start + 2 + (selected ? selected.length : 4); ta.focus(); }) }}
              className="icon-btn !w-5 !h-5">
              <span style={{ fontSize: 12, lineHeight: '12px' }}><strong>B</strong></span>
            </button>
            <button
              title="Italic"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={(e) => { e.stopPropagation(); const ta = textareaRef.current; if (!ta) return; const start = ta.selectionStart; const end = ta.selectionEnd; const val = ta.value; const selected = val.slice(start, end); const replaced = `*${selected || 'i'}*`; const newVal = val.slice(0, start) + replaced + val.slice(end); updateNode(id, { content: newVal }); requestAnimationFrame(() => { ta.selectionStart = start + 1; ta.selectionEnd = start + 1 + (selected ? selected.length : 1); ta.focus(); }) }}
              className="icon-btn !w-5 !h-5">
              <span style={{ fontSize: 12, lineHeight: '12px' }}><em>i</em></span>
            </button>
            <button
              title="H1"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={(e) => { e.stopPropagation(); const ta = textareaRef.current; if (!ta) return; const start = ta.selectionStart; const val = ta.value; const before = val.lastIndexOf('\n', start - 1) + 1; const newVal = val.slice(0, before) + '# ' + val.slice(before); updateNode(id, { content: newVal }); requestAnimationFrame(() => { ta.focus() }) }}
              className="icon-btn !w-5 !h-5">
              <span style={{ fontSize: 12, lineHeight: '12px' }}>H1</span>
            </button>
          </>
        ) : null}

        {(hovered || selected) ? (
          <>
            <button onMouseDown={(e) => { e.stopPropagation(); updateNode(id, { selected: true }) }} onClick={(e) => { e.stopPropagation(); updateNode(id, { selected: true }); toggleOutline(e) }} title="Toggle outline" className="icon-btn !w-5 !h-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <rect x="7" y="7" width="10" height="10" />
              </svg>
            </button>
            {!locked && (
              <button onMouseDown={(e) => { e.stopPropagation(); updateNode(id, { selected: true }) }} onClick={(e) => { e.stopPropagation(); updateNode(id, { censored: !data?.censored }) }} title="Toggle censored" className={`icon-btn !w-5 !h-5 ${data?.censored ? 'bg-white/20' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            )}
          </>
        ) : null}
      </div>

      {data?.censored && locked ? (
        <div className="h-full w-full bg-black flex items-center justify-center rounded" style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          <span className="text-slate-400 text-sm font-medium tracking-wide uppercase">Censored on request</span>
        </div>
      ) : (
        <div className="h-full overflow-auto" onPointerDown={(e) => e.stopPropagation()}>
          {editing ? (
            <textarea
              ref={textareaRef}
              className="w-full h-full p-2 bg-transparent text-slate-100 border-none resize-none outline-none"
              value={data?.content || ''}
              onMouseDown={(e) => { e.stopPropagation() }}
              onPointerDown={(e) => { e.stopPropagation(); try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId) } catch {} }}
              onPointerUp={(e) => { try { (e.currentTarget as Element).releasePointerCapture?.(e.pointerId) } catch {} }}
              onPointerCancel={(e) => { try { (e.currentTarget as Element).releasePointerCapture?.(e.pointerId) } catch {} }}
              onFocus={() => { setEditing(true); setIsEditing(true); updateNode(id, { draggable: false }) }}
              onBlur={() => { setEditing(false); setIsEditing(false); updateNode(id, { draggable: false }) }}
              onChange={(e) => updateNode(id, { content: e.target.value })}
            />
          ) : (
            <div
              className="w-full h-full p-2 prose prose-invert prose-sm max-w-none cursor-text"
              onClick={() => { setEditing(true); setIsEditing(true) }}
            >
              <ReactMarkdown>{data?.content || ''}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Top} isConnectable />
      <Handle type="source" position={Position.Bottom} isConnectable />

      {/* Left side: target first (below), source second (on top) at same spot */}
      <Handle id="left-tgt" type="target" position={Position.Left} isConnectable style={{ top: '50%' }} />
      <Handle id="left-src" type="source" position={Position.Left} isConnectable style={{ top: '50%' }} />

      {/* Right side: target first (below), source second (on top) at same spot */}
      <Handle id="right-tgt" type="target" position={Position.Right} isConnectable style={{ top: '50%' }} />
      <Handle id="right-src" type="source" position={Position.Right} isConnectable style={{ top: '50%' }} />

      {showOutline ? (
        <div style={{ pointerEvents: 'none', boxSizing: 'border-box', border: `1px solid ${GRID_DOT_COLOR}`, position: 'absolute', inset: 0, borderRadius: 6 }} />
      ) : null}

      {showResizers && !editing ? (
        <>
          <div onPointerDown={(e) => startResize(e, 'nw')} className="resizer-dot" style={{ position: 'absolute', left: -4, top: -4, cursor: 'nwse-resize', zIndex: 30 }} />
          <div onPointerDown={(e) => startResize(e, 'ne')} className="resizer-dot" style={{ position: 'absolute', right: -4, top: -4, cursor: 'nesw-resize', zIndex: 30 }} />
          <div onPointerDown={(e) => startResize(e, 'sw')} className="resizer-dot" style={{ position: 'absolute', left: -4, bottom: -4, cursor: 'nesw-resize', zIndex: 30 }} />
          <div onPointerDown={(e) => startResize(e, 'se')} className="resizer-dot" style={{ position: 'absolute', right: -4, bottom: -4, cursor: 'nwse-resize', zIndex: 30 }} />
        </>
      ) : null}
    </div>
  )

}
