import Dexie from 'dexie'
import { Node, Edge } from 'reactflow'

type FlowRecord = {
  id?: string
  nodes: Node[]
  edges: Edge[]
  title?: string
  description?: string
  descSize?: { width?: number; height?: number }
  links?: Array<{ id: string; label: string; url: string }>
  footerText?: string
}

class FlowDB extends Dexie {
  flows!: Dexie.Table<FlowRecord, string>
  constructor() {
    super('FlowDB')
    this.version(1).stores({ flows: 'id' })
  }
}

const db = new FlowDB()

export async function saveFlowToDB(flow: { nodes: Node[]; edges: Edge[]; title?: string; description?: string; descSize?: { width?: number; height?: number }; links?: Array<{ id: string; label: string; url: string }>; footerText?: string }) {
  await db.table('flows').put({ id: 'default', nodes: flow.nodes, edges: flow.edges, title: flow.title, description: flow.description, descSize: flow.descSize, links: flow.links, footerText: flow.footerText })
}

export async function loadFlowFromDB(): Promise<{ nodes: Node[]; edges: Edge[]; title?: string; description?: string; descSize?: { width?: number; height?: number }; links?: Array<{ id: string; label: string; url: string }>; footerText?: string } | null> {
  const rec = await db.table('flows').get('default')
  if (!rec) return null
  return { nodes: rec.nodes || [], edges: rec.edges || [], title: rec.title, description: rec.description, descSize: rec.descSize, links: rec.links, footerText: rec.footerText }
}
