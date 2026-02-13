import React, { useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useFlowStore } from '../../store'
import { GRID_DOT_COLOR } from '../../config'

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i
const VIDEO_DATA_PREFIX = /^data:video\//i

function isVideoSrc(src: string): boolean {
  if (!src) return false
  return VIDEO_EXTENSIONS.test(src) || VIDEO_DATA_PREFIX.test(src)
}

export default function ImageNode({ id, data, selected }: NodeProps) {
  const updateNode = useFlowStore((s) => s.updateNode)
  const enableDragSelected = useFlowStore((s) => s.enableDragSelected)
  const disableDragAll = useFlowStore((s) => s.disableDragAll)
  const snapshot = useFlowStore((s) => s.snapshot)
  const globalShowOutline = useFlowStore((s) => s.showOutline)
  const locked = useFlowStore((s) => s.locked)
  const outline = data?.showOutline ?? globalShowOutline
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const setIsEditing = useFlowStore((s) => s.setIsEditing)
  const width = data?.width || 220
  const height = data?.height || 160

  function toggleOutline(e: React.MouseEvent) {
    e.stopPropagation()
    updateNode(id, { showOutline: !outline })
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
      if (dir.includes('e')) newW = Math.max(80, Math.round(startW + dx))
      if (dir.includes('s')) newH = Math.max(60, Math.round(startH + dy))
      if (dir.includes('w')) newW = Math.max(80, Math.round(startW - dx))
      if (dir.includes('n')) newH = Math.max(60, Math.round(startH - dy))

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

  const showSrc = data?.showSrc

  function toggleShow(e: React.MouseEvent) {
    e.stopPropagation()
    updateNode(id, { showSrc: !showSrc })
  }

  const showResizers = hovered || !!selected

  return (
    <div style={{ width, height }} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} className={`relative p-0 bg-transparent rounded border-none shadow-none ${outline ? '' : ''}`}>

      {/* Edge drag handles (top/bottom/left/right) - dragging only enabled when dragging from these */}
      <div className="node-edge-handle top" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />
      <div className="node-edge-handle bottom" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />
      <div className="node-edge-handle left" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />
      <div className="node-edge-handle right" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />

      { (hovered || selected) ? (
    <div className="absolute top-[-36px] left-1/2 transform -translate-x-1/2 flex gap-1 z-50 pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
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
          <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); updateNode(id, { selected: true }) }} onClick={(e) => { e.stopPropagation(); updateNode(id, { selected: true }); toggleShow(e) }} title="Edit image" className="icon-btn !w-5 !h-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 2.99 2.99L9 16l-4 1 1-4 10.5-9z" />
            </svg>
            </button>
        </div>
      ) : null }

      {data?.censored && locked ? (
        <div className="h-full w-full bg-black flex items-center justify-center rounded" style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          <span className="text-slate-400 text-sm font-medium tracking-wide uppercase">Censored on request</span>
        </div>
      ) : (
      <div className="h-full w-full flex items-center justify-center bg-transparent overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>
        {data?.src ? (
          isVideoSrc(data.src) ? (
            <video
              onMouseDown={(e) => { e.stopPropagation() }}
              onPointerDown={(e) => { e.stopPropagation() }}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleShow(e) }}
              src={data.src}
              className="w-full h-full object-contain"
              controls
              loop
              muted
              playsInline
            />
          ) : (
            <img
              onMouseDown={(e) => { e.stopPropagation() }}
              onPointerDown={(e) => { e.stopPropagation() }}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleShow(e) }}
              src={data.src}
              alt="node-img"
              className="w-full h-full object-contain"
            />
          )
        ) : (
          <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleShow(e) }} className="text-slate-400 text-sm">No media</div>
        )}
      </div>
      )}

      {showSrc ? (
        <div className="absolute bottom-1 left-1 right-1">
          <input
            className="w-full p-1 bg-slate-800 text-slate-100 border border-slate-700 rounded"
            value={data?.src || ''}
            onMouseDown={(e) => { e.stopPropagation() }}
            onPointerDown={(e) => { e.stopPropagation(); try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId) } catch {} }}
            onPointerUp={(e) => { try { (e.currentTarget as Element).releasePointerCapture?.(e.pointerId) } catch {} }}
            onFocus={(e) => { setEditing(true); setIsEditing(true); updateNode(id, { draggable: false }) }}
            onBlur={(e) => { setEditing(false); setIsEditing(false); updateNode(id, { draggable: false }) }}
            onChange={(e) => updateNode(id, { src: e.target.value })}
            placeholder="Image, GIF, SVG, or video URL"
          />
        </div>
      ) : null}

      <Handle type="target" position={Position.Top} isConnectable />
      <Handle type="source" position={Position.Bottom} isConnectable />

      {/* Left side: target first (below), source second (on top) at same spot */}
      <Handle id="left-tgt" type="target" position={Position.Left} isConnectable style={{ top: '50%' }} />
      <Handle id="left-src" type="source" position={Position.Left} isConnectable style={{ top: '50%' }} />

      {/* Right side: target first (below), source second (on top) at same spot */}
      <Handle id="right-tgt" type="target" position={Position.Right} isConnectable style={{ top: '50%' }} />
      <Handle id="right-src" type="source" position={Position.Right} isConnectable style={{ top: '50%' }} />

      {outline ? (
        <div style={{ pointerEvents: 'none', boxSizing: 'border-box', border: `1px solid ${GRID_DOT_COLOR}`, position: 'absolute', inset: 0, borderRadius: 6 }} />
      ) : null}

      {showResizers && !editing ? (
          <div>
            <div onPointerDown={(e) => startResize(e, 'nw')} className="resizer-dot" style={{ position: 'absolute', left: -4, top: -4, cursor: 'nwse-resize', zIndex: 30 }} />
            <div onPointerDown={(e) => startResize(e, 'ne')} className="resizer-dot" style={{ position: 'absolute', right: -4, top: -4, cursor: 'nesw-resize', zIndex: 30 }} />
            <div onPointerDown={(e) => startResize(e, 'sw')} className="resizer-dot" style={{ position: 'absolute', left: -4, bottom: -4, cursor: 'nesw-resize', zIndex: 30 }} />
            <div onPointerDown={(e) => startResize(e, 'se')} className="resizer-dot" style={{ position: 'absolute', right: -4, bottom: -4, cursor: 'nwse-resize', zIndex: 30 }} />
          </div>
      ) : null}
    </div>
  )
}
