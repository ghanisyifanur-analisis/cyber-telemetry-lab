# 🛰️ Cyber Telemetry Lab

> Dashboard telemetri jaringan interaktif bertema hacker — data disimulasikan sepenuhnya (seeded PRNG), **bukan** telemetri produksi.

![React](https://img.shields.io/badge/React-19-2bd57f?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-f5c84c?style=flat-square&logo=vite&logoColor=black)
![Recharts](https://img.shields.io/badge/Recharts-3-4dd5ff?style=flat-square)

## Fitur

- **8 node fleet** (EDGE, CORE, DB) dengan sinyal throughput / login attempts / port scans / latency yang dibangkitkan deterministik (mulberry32 PRNG, seed `0xc0ffee`) — refresh menghasilkan pola yang sama.
- **3 chart hidup** (Recharts): area throughput, bar port-scan per node, dual-axis login vs latency — window geser 60 tick.
- **Attack Mode**: mensimulasikan lonjakan *port scan* & *credential stuffing* di node EDGE — distribusi chart dan syslog langsung menyimpang (ALERT/WARN).
- **Live syslog** bergaya terminal (ALERT/WARN/INFO) dengan auto-feed.
- **Filter per node**, Pause/Resume, Reset, **Export CSV** dari window aktif.
- Aksesibilitas: toggle animasi manual + hormat pada `prefers-reduced-motion`, `aria-live` pada log.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output statis di dist/
```

Prasyarat: Node.js ≥ 20.19 (atau ≥ 22.12) — Vite 7 membutuhkan versi tersebut.

## Struktur

```
src/
├── telemetry.js   # PRNG ber-seed + sintesis sinyal per tick + CSV
├── App.jsx        # state loop (setInterval), filter, kontrol, layout
├── main.jsx       # bootstrap React
└── styles.css     # tema terminal: #050a07 / #2bd57f / #4dd5ff / #f5c84c
```

## Disclaimer

Seluruh angka, IP, dan "serangan" di sini adalah data sintetis untuk demonstrasi visualisasi — tidak ada sistem nyata yang dipantau, diserang, atau terpengaruh.

---

Bagian dari portofolio [ghani24ep10007-spec](https://github.com/ghani24ep10007-spec) — [live portfolio](https://ghani24ep10007-spec.github.io/portofolio/).
