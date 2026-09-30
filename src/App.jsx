import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LineChart, Line,
} from 'recharts'
import { mulberry32, synthesizeTick, toCsv, NODES } from './telemetry.js'

const WINDOW = 60
const TICK_MS = 700

function MatrixRain({ off }) {
  const ref = useRef(null)
  useEffect(() => {
    if (off) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const chars = '01アイウエカキクケサシスセ$#%&*/\\<>[]{}=+-'
    let cols, drops, raf
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols = Math.floor(canvas.width / 14)
      drops = Array.from({ length: cols }, () => Math.floor(Math.random() * 20))
    }
    resize()
    window.addEventListener('resize', resize)
    let last = 0
    const draw = (now) => {
      raf = requestAnimationFrame(draw)
      if (now - last < 60) return
      last = now
      ctx.fillStyle = 'rgba(5, 10, 7, 0.18)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = '13px monospace'
      for (let i = 0; i < drops.length; i++) {
        ctx.fillStyle = Math.random() < 0.06 ? '#4dd5ff' : '#2bd57f'
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, drops[i] * 16)
        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      }
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [off])
  return <canvas ref={ref} aria-hidden="true" />
}

const tooltipStyle = {
  background: '#030704', border: '1px solid #12331f', fontFamily: 'monospace',
  fontSize: '0.75rem', color: '#2bd57f',
}
const axis = { stroke: '#6f8f7c', fontSize: 11, tickLine: false, axisLine: false }

export default function App() {
  const [running, setRunning] = useState(true)
  const [attack, setAttack] = useState(false)
  const [nodeFilter, setNodeFilter] = useState('ALL')
  const [motionOff, setMotionOff] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  const [history, setHistory] = useState([])
  const [logs, setLogs] = useState([])
  const tickRef = useRef(0)
  const rndRef = useRef(mulberry32(0xc0ffee))

  useEffect(() => {
    document.body.classList.toggle('motion-off', motionOff)
  }, [motionOff])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const { samples, logs: newLogs } = synthesizeTick(rndRef.current, tickRef.current++, attack)
      setHistory((h) => [...h, ...samples].slice(-WINDOW * NODES.length))
      if (newLogs.length) setLogs((l) => [...newLogs, ...l].slice(0, 80))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [running, attack])

  const scoped = useMemo(
    () => (nodeFilter === 'ALL' ? history : history.filter((r) => r.node === nodeFilter)),
    [history, nodeFilter],
  )

  const series = useMemo(() => {
    const byTick = new Map()
    for (const r of scoped) {
      const row = byTick.get(r.t) ?? { t: r.t, mbps: 0, logins: 0, latency: 0, n: 0 }
      row.mbps += r.Mbps
      row.logins += r.logins
      row.latency += r.latency
      row.n += 1
      byTick.set(r.t, row)
    }
    return [...byTick.values()]
      .sort((a, b) => a.t - b.t)
      .slice(-WINDOW)
      .map((r) => ({ ...r, latency: Math.round(r.latency / r.n) }))
  }, [scoped])

  const perNode = useMemo(() => {
    const totals = new Map(NODES.map((n) => [n.id, 0]))
    for (const r of scoped) totals.set(r.node, (totals.get(r.node) ?? 0) + r.scans)
    return [...totals.entries()].map(([node, scans]) => ({ node, scans }))
  }, [scoped])

  const alerts = useMemo(() => logs.filter((l) => l.level === 'ALERT').length, [logs])

  const reset = () => {
    tickRef.current = 0
    rndRef.current = mulberry32(0xc0ffee)
    setHistory([])
    setLogs([])
  }

  const exportCsv = () => {
    const blob = new Blob([toCsv(scoped)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `telemetry-${nodeFilter === 'ALL' ? 'fleet' : nodeFilter}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <header className="hero">
        <MatrixRain off={motionOff} />
        <div className="hero-text">
          <h1>&gt; CYBER TELEMETRY LAB_</h1>
          <p>Simulated network threat dashboard — ISP fleet telemetry, seeded &amp; deterministic</p>
        </div>
      </header>

      <section className="controls" aria-label="Kontrol simulasi">
        <button onClick={() => setRunning((r) => !r)}>{running ? '❚❚ PAUSE' : '▶ RESUME'}</button>
        <button className={attack ? 'danger on' : 'danger'} aria-pressed={attack} onClick={() => setAttack((a) => !a)}>
          {attack ? '⚠ ATTACK MODE: ON' : 'ATTACK MODE: OFF'}
        </button>
        <label htmlFor="node">node</label>
        <select id="node" value={nodeFilter} onChange={(e) => setNodeFilter(e.target.value)}>
          <option value="ALL">ALL NODES</option>
          {NODES.map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
        </select>
        <button onClick={reset}>↺ RESET</button>
        <button onClick={exportCsv}>⭳ EXPORT CSV</button>
        <span className="spacer" />
        <label htmlFor="motion">animasi</label>
        <select id="motion" value={motionOff ? 'off' : 'on'} onChange={(e) => setMotionOff(e.target.value === 'off')}>
          <option value="on">ON</option>
          <option value="off">OFF</option>
        </select>
      </section>

      <p className="status-line">
        [<span className={running ? 'ok' : 'bad'}>{running ? 'LIVE' : 'HALTED'}</span>]
        {' '}tick={tickRef.current} · nodes={nodeFilter === 'ALL' ? NODES.length : 1}
        {' '}· alerts=<span className={alerts ? 'bad' : 'ok'}>{alerts}</span>
        {' '}· mode={attack ? 'OFFENSIVE' : 'PASSIVE'}
      </p>

      <main className="grid">
        <div className="panel wide">
          <h2>Throughput (Mbps)</h2>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={series}>
              <CartesianGrid stroke="#12331f" strokeDasharray="3 3" />
              <XAxis dataKey="t" {...axis} />
              <YAxis {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="mbps" stroke="#2bd57f" fill="#2bd57f" fillOpacity={0.18} name="Mbps" isAnimationActive={!motionOff} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h2>Port scans / node</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={perNode}>
              <CartesianGrid stroke="#12331f" strokeDasharray="3 3" />
              <XAxis dataKey="node" {...axis} angle={-30} textAnchor="end" height={52} interval={0} />
              <YAxis {...axis} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(43,213,127,0.06)' }} />
              <Bar dataKey="scans" fill={attack ? '#ff5d5d' : '#f5c84c'} name="scans" isAnimationActive={!motionOff} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h2>Logins vs latency</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series}>
              <CartesianGrid stroke="#12331f" strokeDasharray="3 3" />
              <XAxis dataKey="t" {...axis} />
              <YAxis yAxisId="l" {...axis} />
              <YAxis yAxisId="r" orientation="right" {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '0.72rem', color: '#6f8f7c' }} />
              <Line yAxisId="l" type="monotone" dataKey="logins" stroke="#4dd5ff" dot={false} name="login attempts" isAnimationActive={!motionOff} />
              <Line yAxisId="r" type="monotone" dataKey="latency" stroke="#f5c84c" dot={false} name="latency (ms)" isAnimationActive={!motionOff} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="panel wide">
          <h2>Live syslog</h2>
          <div className="logfeed" role="log" aria-live="polite">
            {logs.map((l, i) => (
              <div key={i} className={l.level}>
                [{new Date(l.ts).toLocaleTimeString('id-ID', { hour12: false })}] {l.level.padEnd(5)} {l.node} :: {l.msg}
              </div>
            ))}
            <div className="prompt">root@telemetry-lab:~$ <span className="cursor">&nbsp;</span></div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <span>cyber-telemetry-lab — data disimulasikan (seeded PRNG), bukan telemetri produksi</span>
        <span>ghani24ep10007-spec</span>
      </footer>
    </div>
  )
}
