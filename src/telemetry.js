// Deterministic telemetry source: mulberry32 PRNG + per-node signal synthesis.

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const NODES = [
  { id: 'EDGE-01', kind: 'edge', baseMbps: 420, baseLogins: 6, baseScans: 2, baseLatency: 18 },
  { id: 'EDGE-02', kind: 'edge', baseMbps: 380, baseLogins: 5, baseScans: 3, baseLatency: 22 },
  { id: 'EDGE-03', kind: 'edge', baseMbps: 510, baseLogins: 8, baseScans: 1, baseLatency: 15 },
  { id: 'EDGE-04', kind: 'edge', baseMbps: 290, baseLogins: 4, baseScans: 2, baseLatency: 27 },
  { id: 'CORE-A', kind: 'core', baseMbps: 1400, baseLogins: 12, baseScans: 0, baseLatency: 4 },
  { id: 'CORE-B', kind: 'core', baseMbps: 1250, baseLogins: 10, baseScans: 0, baseLatency: 5 },
  { id: 'DB-01', kind: 'db', baseMbps: 260, baseLogins: 3, baseScans: 0, baseLatency: 9 },
  { id: 'DB-02', kind: 'db', baseMbps: 240, baseLogins: 2, baseScans: 0, baseLatency: 11 },
]

const ATTACK_IP_POOL = ['185.220.101.', '45.155.205.', '103.148.39.', '194.26.29.']

function randInt(rnd, lo, hi) {
  return lo + Math.floor(rnd() * (hi - lo + 1))
}

// One tick of the whole fleet. `t` is the monotonic tick index; attack mode
// skews scans/logins and injects bursts so charts visibly diverge from calm.
export function synthesizeTick(rnd, t, attackMode) {
  const ts = new Date()
  const samples = NODES.map((node, i) => {
    const wave = Math.sin((t + i * 7) / 9) * 0.12
    const jitter = (rnd() - 0.5) * 0.1
    const calm = 1 + wave + jitter

    let scans = Math.max(0, Math.round(node.baseScans * calm + (rnd() < 0.08 ? randInt(rnd, 1, 4) : 0)))
    let logins = Math.max(0, Math.round(node.baseLogins * calm + (rnd() < 0.1 ? randInt(rnd, 0, 2) : 0)))
    let malicious = false

    if (attackMode && node.kind === 'edge') {
      const burst = rnd() < 0.35 ? randInt(rnd, 12, 60) : randInt(rnd, 2, 8)
      scans += burst
      logins += rnd() < 0.5 ? randInt(rnd, 4, 15) : 0
      malicious = burst >= 20
    }

    const Mbps = Math.max(0, node.baseMbps * (attackMode ? calm * (0.85 + rnd() * 0.5) : calm))
    const latency = Math.max(1, node.baseLatency * (1 + (attackMode ? rnd() * 1.6 : rnd() * 0.3)))

    return { t, ts, node: node.id, Mbps: Math.round(Mbps), logins, scans, latency: Math.round(latency), malicious }
  })

  const logs = []
  for (const s of samples) {
    const src = ATTACK_IP_POOL[randInt(rnd, 0, 3)] + randInt(rnd, 2, 250)
    if (s.malicious) {
      logs.push({ ts: s.ts, level: 'ALERT', node: s.node, msg: `port scan burst src=${src} ports=${s.scans} proto=TCP` })
    } else if (attackMode && s.logins > 14) {
      logs.push({ ts: s.ts, level: 'WARN', node: s.node, msg: `credential stuffing detected src=${src} attempts=${s.logins}` })
    } else if (rnd() < 0.18) {
      logs.push({ ts: s.ts, level: 'INFO', node: s.node, msg: `sync ok throughput=${s.Mbps}Mbps latency=${s.latency}ms` })
    }
  }

  return { samples, logs }
}

export function toCsv(history) {
  const header = 'tick,timestamp,node,mbps,login_attempts,port_scans,latency_ms,malicious'
  const rows = history.map((r) =>
    [r.t, new Date(r.ts).toISOString(), r.node, r.Mbps, r.logins, r.scans, r.latency, r.malicious].join(','),
  )
  return [header, ...rows].join('\n')
}
