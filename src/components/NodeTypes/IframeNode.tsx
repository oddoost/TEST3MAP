import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useFlowStore } from '../../store'
import { GRID_DOT_COLOR } from '../../config'

/** Convert common URLs to their embeddable equivalents */
function toEmbedUrl(raw: string): string {
  if (!raw) return raw
  let url = raw.trim()

  // YouTube: watch, shorts, youtu.be → /embed/ID
  let m = url.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/)
  if (m) return `https://www.youtube.com/embed/${m[1]}`

  // YouTube already embed
  if (/youtube\.com\/embed\//.test(url)) return url

  // Vimeo: vimeo.com/12345 → player.vimeo.com/video/12345
  m = url.match(/vimeo\.com\/(\d+)/)
  if (m && !url.includes('player.vimeo.com')) return `https://player.vimeo.com/video/${m[1]}`

  // Spotify: open.spotify.com/track|album|playlist/ID → embed
  m = url.match(/open\.spotify\.com\/(track|album|playlist)\/([\w]+)/)
  if (m && !url.includes('/embed/')) return `https://open.spotify.com/embed/${m[1]}/${m[2]}`

  // Google Maps: /maps/place/... or /maps?q= → /maps/embed
  if (/google\.[a-z.]+\/maps/.test(url) && !url.includes('/maps/embed')) {
    return `https://maps.google.com/maps?output=embed&q=${encodeURIComponent(url)}`
  }

  // Figma: figma.com/file/... or figma.com/design/... → embed
  if (/figma\.com\/(file|design)\//.test(url) && !url.includes('figma.com/embed')) {
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
  }

  // CodePen: codepen.io/USER/pen/ID → /embed/ID
  m = url.match(/codepen\.io\/([\w-]+)\/pen\/([\w]+)/)
  if (m) return `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result`

  // Twitter/X status → platform embed (limited but works)
  // Most social sites won't embed — leave as-is

  return url
}

/** Check if a URL is an Instagram post/reel */
function getInstagramId(raw: string): string | null {
  if (!raw) return null
  const m = raw.trim().match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/)
  return m ? m[1] : null
}

/** Check if a URL is a Twitter/X post */
function getTweetId(raw: string): string | null {
  if (!raw) return null
  const m = raw.trim().match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
  return m ? m[1] : null
}

/** Twitter/X embed component — uses their blockquote + widgets.js approach */
function TweetEmbed({ tweetId, url }: { tweetId: string; url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = `
      <blockquote class="twitter-tweet" data-conversation="none">
        <a href="${url.replace(/x\.com/, 'twitter.com')}">Loading…</a>
      </blockquote>
    `
    const win = window as any
    if (win.twttr && win.twttr.widgets) {
      win.twttr.widgets.load(containerRef.current)
    } else {
      const script = document.createElement('script')
      script.src = 'https://platform.twitter.com/widgets.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [tweetId, url])

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto bg-white"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    />
  )
}

/** Instagram embed component — uses Instagram's /embed endpoint in an iframe */
function InstagramEmbed({ shortcode }: { url: string; shortcode: string }) {
  return (
    <iframe
      src={`https://www.instagram.com/p/${shortcode}/embed/`}
      className="w-full h-full border-none"
      allowTransparency
      allow="encrypted-media"
      title="Instagram embed"
      style={{ background: 'white', minHeight: 400 }}
    />
  )
}

export default function IframeNode({ id, data, selected }: NodeProps) {
  const updateNode = useFlowStore((s) => s.updateNode)
  const enableDragSelected = useFlowStore((s) => s.enableDragSelected)
  const disableDragAll = useFlowStore((s) => s.disableDragAll)
  const snapshot = useFlowStore((s) => s.snapshot)
  const globalShowOutline = useFlowStore((s) => s.showOutline)
  const locked = useFlowStore((s) => s.locked)
  const outline = data?.showOutline ?? globalShowOutline
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const setIsEditing = useFlowStore((s) => s.setIsEditing)

  const embedUrl = toEmbedUrl(data?.url || '')
  const instagramId = getInstagramId(data?.url || '')
  const tweetId = getTweetId(data?.url || '')
  const width = data?.width || 480
  const height = data?.height || 320

  // Reset error state when URL changes
  useEffect(() => {
    setLoadError(false)
  }, [embedUrl])

  const onIframeLoad = useCallback(() => {
    // Try to detect if the iframe was blocked.
    // If it loaded an error page / about:blank due to X-Frame-Options,
    // accessing contentWindow.location will throw or return about:blank.
    try {
      const loc = iframeRef.current?.contentWindow?.location?.href
      if (loc === 'about:blank' && embedUrl && embedUrl !== 'about:blank') {
        setLoadError(true)
      }
    } catch {
      // Cross-origin — means the page DID load (good)
    }
  }, [embedUrl])

  function getDomain(url: string): string {
    try { return new URL(url).hostname } catch { return url }
  }

  function getFavicon(url: string): string {
    try {
      const u = new URL(url)
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`
    } catch { return '' }
  }

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
      if (dir.includes('e')) newW = Math.max(160, Math.round(startW + dx))
      if (dir.includes('s')) newH = Math.max(120, Math.round(startH + dy))
      if (dir.includes('w')) newW = Math.max(160, Math.round(startW - dx))
      if (dir.includes('n')) newH = Math.max(120, Math.round(startH - dy))

      const oppX = dir.includes('w') ? startPos.x + startW : startPos.x
      const oppY = dir.includes('n') ? startPos.y + startH : startPos.y
      const newX = dir.includes('w') ? Math.round(oppX - newW) : Math.round(oppX)
      const newY = dir.includes('n') ? Math.round(oppY - newH) : Math.round(oppY)

      updateNode(id, { width: newW, height: newH, position: { x: newX, y: newY } })
    }

    function onUp() {
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
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className="relative p-0 bg-transparent rounded border-none shadow-none"
    >
      {/* Edge drag handles */}
      <div className="node-edge-handle top" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />
      <div className="node-edge-handle bottom" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />
      <div className="node-edge-handle left" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />
      <div className="node-edge-handle right" onPointerDown={(e) => { e.stopPropagation(); snapshot(); enableDragSelected(id); window.addEventListener('pointerup', function __up(){ disableDragAll(); window.removeEventListener('pointerup', __up) }) }} />

      {/* Toolbar */}
      {(hovered || selected) ? (
        <div className="absolute top-[-36px] left-1/2 transform -translate-x-1/2 flex gap-1 z-50 pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onMouseDown={(e) => { e.stopPropagation(); updateNode(id, { selected: true }) }}
            onClick={(e) => { e.stopPropagation(); updateNode(id, { selected: true }); toggleOutline(e) }}
            title="Toggle outline"
            className="icon-btn !w-5 !h-5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <rect x="7" y="7" width="10" height="10" />
            </svg>
          </button>
          {!locked && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); updateNode(id, { selected: true }) }}
              onClick={(e) => { e.stopPropagation(); updateNode(id, { censored: !data?.censored }) }}
              title="Toggle censored"
              className={`icon-btn !w-5 !h-5 ${data?.censored ? 'bg-white/20' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          )}
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); updateNode(id, { selected: true }) }}
            onClick={(e) => { e.stopPropagation(); setEditing(!editing) }}
            title="Edit URL"
            className="icon-btn !w-5 !h-5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 2.99 2.99L9 16l-4 1 1-4 10.5-9z" />
            </svg>
          </button>
          {data?.url ? (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              title="Open in new tab"
              className="icon-btn !w-5 !h-5 no-underline"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Iframe content */}
      {data?.censored && locked ? (
        <div className="h-full w-full bg-black flex items-center justify-center rounded" style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          <span className="text-slate-400 text-sm font-medium tracking-wide uppercase">Censored on request</span>
        </div>
      ) : (
      <div className="h-full w-full bg-white overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>
        {data?.url && instagramId ? (
          <InstagramEmbed url={data.url} shortcode={instagramId} />
        ) : data?.url && tweetId ? (
          <TweetEmbed tweetId={tweetId} url={data.url} />
        ) : data?.url ? (
          <>
            {loadError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-300 text-xs gap-3 p-4 text-center">
                {getFavicon(data.url) && (
                  <img src={getFavicon(data.url)} alt="" className="w-8 h-8 rounded" style={{ imageRendering: 'auto' }} />
                )}
                <span className="text-slate-400 font-medium text-sm truncate max-w-full">{getDomain(data.url)}</span>
                <span className="text-slate-500">This site doesn't allow iframe embedding</span>
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-sky-600 text-white rounded hover:bg-sky-500 no-underline text-xs"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  Open in new tab ↗
                </a>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                key={embedUrl}
                src={embedUrl}
                title="embedded"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                style={{ pointerEvents: selected ? 'auto' : 'none' }}
                onLoad={onIframeLoad}
                onError={() => setLoadError(true)}
              />
            )}
            {/* Transparent overlay to allow node interaction when not selected — inset by 8px so handles at edges remain clickable */}
            {!selected && !loadError && (
              <div className="absolute" style={{ zIndex: 5, top: 8, bottom: 8, left: 8, right: 8 }} />
            )}
          </>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-800 cursor-pointer gap-2 p-4 text-center"
            onClick={(e) => { e.stopPropagation(); setEditing(true) }}
          >
            <span>Click edit to set a URL</span>
            <span className="text-slate-500 text-xs">YouTube, Vimeo, Spotify, Figma, CodePen, Google Maps auto-convert to embed URLs</span>
          </div>
        )}
      </div>
      )}

      {/* URL input */}
      {editing ? (
        <div className="absolute bottom-1 left-1 right-1 z-10">
          <input
            className="w-full p-1 bg-slate-800 text-slate-100 border border-slate-700 rounded text-xs"
            value={data?.url || ''}
            autoFocus
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => { e.stopPropagation(); try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId) } catch {} }}
            onPointerUp={(e) => { try { (e.currentTarget as Element).releasePointerCapture?.(e.pointerId) } catch {} }}
            onFocus={() => { setIsEditing(true); updateNode(id, { draggable: false }) }}
            onBlur={() => { setIsEditing(false); setEditing(false); updateNode(id, { draggable: false }) }}
            onChange={(e) => { updateNode(id, { url: e.target.value }); setLoadError(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setEditing(false); setIsEditing(false) } }}
            placeholder="Paste YouTube, Vimeo, Spotify, Figma, or any URL"
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
