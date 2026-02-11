import create from 'zustand'
import { Node, Edge } from 'reactflow'
import { saveFlowToDB, loadFlowFromDB } from './db'

type FlowState = {
  nodes: Node[]
  edges: Edge[]
  title: string
  description: string
  descSize: { width?: number; height?: number }
  showOutline: boolean
  isEditing: boolean
  isConnecting: boolean
  locked: boolean
  showDesc: boolean
  links: Array<{ id: string; label: string; url: string }>
  footerText: string
  setTitle: (v: string) => void
  setDescription: (v: string) => void
  setDescSize: (v: { width?: number; height?: number }) => void
  setIsEditing: (v: boolean) => void
  setIsConnecting: (v: boolean) => void
  setLocked: (v: boolean) => void
  toggleLocked: () => void
  setShowDesc: (v: boolean) => void
  toggleShowDesc: () => void
  setLinks: (v: Array<{ id: string; label: string; url: string }>) => void
  addLink: (link: { id: string; label: string; url: string }) => void
  updateLink: (id: string, patch: Partial<{ label: string; url: string }>) => void
  removeLink: (id: string) => void
  setFooterText: (v: string) => void
  setShowOutline: (v: boolean) => void
  toggleShowOutline: () => void
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void
  addNode: (node: Node) => void
  updateNode: (id: string, data: any) => void
  addEdge: (edge: Edge) => void
  updateEdge: (id: string, patch: Partial<Edge>) => void
  removeEdge: (id: string) => void
  save: () => Promise<void>
  load: () => Promise<void>
  exportJSON: () => void
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  title: 'Untitled Canvas',
  description: '',
  descSize: {},
  showOutline: false,
  isEditing: false,
  isConnecting: false,
  locked: false,
  showDesc: true,
  links: [],
  footerText: '',
  setTitle: (v: string) => set({ title: v }),
  setDescription: (v: string) => set({ description: v }),
  setDescSize: (v: { width?: number; height?: number }) => set({ descSize: v }),
  setIsEditing: (v: boolean) => set({ isEditing: v }),
  setIsConnecting: (v: boolean) => set({ isConnecting: v }),
  setLocked: (v: boolean) => set({ locked: v }),
  toggleLocked: () => set((s) => ({ locked: !s.locked })),
  setShowDesc: (v: boolean) => set({ showDesc: v }),
  toggleShowDesc: () => set((s) => ({ showDesc: !s.showDesc })),
  setLinks: (v) => set({ links: v }),
  addLink: (link) => set((s) => ({ links: [...s.links, link] })),
  updateLink: (id, patch) => set((s) => ({ links: s.links.map(l => l.id === id ? { ...l, ...patch } : l) })),
  removeLink: (id) => set((s) => ({ links: s.links.filter(l => l.id !== id) })),
  setFooterText: (v: string) => set({ footerText: v }),
  setShowOutline: (v: boolean) => set({ showOutline: v }),
  toggleShowOutline: () => set((s) => ({ showOutline: !s.showOutline })),
  setNodes: (nodes) => set((s) => ({ nodes: typeof nodes === 'function' ? (nodes as any)(s.nodes) : nodes })),
  setEdges: (edges) => set((s) => ({ edges: typeof edges === 'function' ? (edges as any)(s.edges) : edges })),
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
  updateNode: (id, patch) => set((s) => ({ nodes: s.nodes.map(n => {
    if (n.id !== id) return n
    const { position, draggable, selected, ...rest } = (patch || {}) as any
    const updated: any = { ...n }
    if (typeof position !== 'undefined') updated.position = position
    if (typeof draggable !== 'undefined') updated.draggable = draggable
    if (typeof selected !== 'undefined') updated.selected = selected
    updated.data = { ...n.data, ...rest }
    return updated
  }) })),
  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),
  updateEdge: (id, patch) => set((s) => ({ edges: s.edges.map(e => e.id === id ? { ...e, ...patch } : e) })),
  removeEdge: (id) => set((s) => ({ edges: s.edges.filter(e => e.id !== id) })),
  save: async () => {
    const { nodes, edges, title, description, descSize, links, footerText } = get()
    await saveFlowToDB({ nodes, edges, title, description, descSize, links, footerText })
  },
  load: async () => {
    const loaded = await loadFlowFromDB()
    if (loaded) {
      // Valid handle IDs for current node setup
      const validHandleIds = new Set([undefined, null, '', 'left-src', 'left-tgt', 'right-src', 'right-tgt'])
      const cleanEdges = (loaded.edges || []).filter((e: any) => {
        const srcOk = !e.sourceHandle || validHandleIds.has(e.sourceHandle)
        const tgtOk = !e.targetHandle || validHandleIds.has(e.targetHandle)
        return srcOk && tgtOk
      })
      set({ nodes: loaded.nodes || [], edges: cleanEdges, title: loaded.title || 'Untitled Canvas', description: loaded.description || '', descSize: loaded.descSize || {}, links: loaded.links || [], footerText: loaded.footerText || '' })
    }
  },
  exportJSON: () => {
    const { nodes, edges, title, description, descSize, links, footerText } = get()
    const data = JSON.stringify({ nodes, edges, title, description, descSize, links, footerText }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
}))

// Autosave: debounced 2s after any relevant state change
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
useFlowStore.subscribe(
  (state, prev) => {
    // Only autosave if data fields changed (not UI-only fields like showDesc, locked, isEditing, etc.)
    const dataChanged =
      state.nodes !== prev.nodes ||
      state.edges !== prev.edges ||
      state.title !== prev.title ||
      state.description !== prev.description ||
      state.descSize !== prev.descSize ||
      state.footerText !== prev.footerText ||
      state.links !== prev.links
    if (!dataChanged) return
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => {
      useFlowStore.getState().save()
    }, 2000)
  }
)
