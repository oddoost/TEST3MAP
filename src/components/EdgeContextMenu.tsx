import React from 'react'
import { MarkerType, Edge } from 'reactflow'

type Props = {
  edge: Edge
  x: number
  y: number
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Edge>) => void
  onDelete: (id: string) => void
}

export default function EdgeContextMenu({ edge, x, y, onClose, onUpdate, onDelete }: Props) {
  const hasEndArrow = !!edge.markerEnd
  const hasStartArrow = !!edge.markerStart

  function setForward() {
    onUpdate(edge.id, {
      markerEnd: { type: MarkerType.Arrow },
      markerStart: undefined,
    } as any)
    onClose()
  }

  function setBackward() {
    onUpdate(edge.id, {
      markerEnd: undefined,
      markerStart: { type: MarkerType.Arrow },
    } as any)
    onClose()
  }

  function setBidirectional() {
    onUpdate(edge.id, {
      markerEnd: { type: MarkerType.Arrow },
      markerStart: { type: MarkerType.Arrow },
    } as any)
    onClose()
  }

  function setNone() {
    onUpdate(edge.id, {
      markerEnd: undefined,
      markerStart: undefined,
    } as any)
    onClose()
  }

  function handleDelete() {
    onDelete(edge.id)
    onClose()
  }

  return (
    <>
      {/* Backdrop to close menu */}
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div
        className="fixed z-[101] bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[160px]"
        style={{ left: x, top: y }}
      >
        <button onClick={setForward} className="edge-menu-item">
          <span className="edge-menu-icon">→</span>
          Forward arrow
          {hasEndArrow && !hasStartArrow ? <span className="edge-menu-check">✓</span> : null}
        </button>
        <button onClick={setBackward} className="edge-menu-item">
          <span className="edge-menu-icon">←</span>
          Backward arrow
          {hasStartArrow && !hasEndArrow ? <span className="edge-menu-check">✓</span> : null}
        </button>
        <button onClick={setBidirectional} className="edge-menu-item">
          <span className="edge-menu-icon">↔</span>
          Both directions
          {hasEndArrow && hasStartArrow ? <span className="edge-menu-check">✓</span> : null}
        </button>
        <button onClick={setNone} className="edge-menu-item">
          <span className="edge-menu-icon">—</span>
          No arrow
          {!hasEndArrow && !hasStartArrow ? <span className="edge-menu-check">✓</span> : null}
        </button>
        <div className="border-t border-slate-600 my-1" />
        <button onClick={handleDelete} className="edge-menu-item text-red-400 hover:!bg-red-500/20">
          <span className="edge-menu-icon">✕</span>
          Remove connection
        </button>
      </div>
    </>
  )
}
