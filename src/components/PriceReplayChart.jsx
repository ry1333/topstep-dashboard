import { useEffect, useMemo, useRef } from 'react'
import { CandlestickSeries, createChart, createSeriesMarkers } from 'lightweight-charts'

/**
 * PriceReplayChart — TradingView lightweight-charts candlestick.
 * Bars + entry/exit markers + active trade SL/TP price lines, all driven by replay cursor.
 *
 * Props:
 *   bars      = [{ t: epoch_seconds, o, h, l, c, v }]
 *   trades    = [{ entry_ts, exit_ts, side, entry_price, exit_price, pnl_net, exit_reason }]
 *   cursor    = ms timestamp of replay head
 *   tickSize  = MES default 0.25
 *   slTicks   = default stop ticks (for live trade visualization, when not stored)
 *   tpTicks   = default target ticks
 *   height    = px
 */
export default function PriceReplayChart({
  bars = [], trades = [], cursor = null,
  tickSize = 0.25, slTicks = 10, tpTicks = 22,
  height = 360,
}) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const candleRef = useRef(null)
  const markersRef = useRef(null)
  const priceLinesRef = useRef([])  // active SL/TP price lines

  const cursorSec = cursor != null ? Math.floor(cursor / 1000) : null

  // Filter bars + trades up to cursor
  const visibleBars = useMemo(() => {
    if (cursorSec == null) return bars
    return bars.filter(b => b.t <= cursorSec)
  }, [bars, cursorSec])

  const visibleTrades = useMemo(() => {
    if (cursorSec == null) return trades
    return trades.filter(t => Math.floor(new Date(t.exit_ts).getTime() / 1000) <= cursorSec)
  }, [trades, cursorSec])

  const openTrade = useMemo(() => {
    if (cursorSec == null) return null
    return trades.find(t => {
      const entry = Math.floor(new Date(t.entry_ts).getTime() / 1000)
      const exit = Math.floor(new Date(t.exit_ts).getTime() / 1000)
      return entry <= cursorSec && exit > cursorSec
    }) || null
  }, [trades, cursorSec])

  // ─── one-time setup ───
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: 'rgba(237,237,237,0.5)',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      crosshair: {
        vertLine: { color: 'rgba(94,234,212,0.4)', width: 1, style: 0, labelBackgroundColor: '#5eead4' },
        horzLine: { color: 'rgba(94,234,212,0.4)', width: 1, style: 0, labelBackgroundColor: '#5eead4' },
      },
      autoSize: true,
    })

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: 'rgba(34,197,94,0.7)',
      wickDownColor: 'rgba(239,68,68,0.7)',
    })
    chartRef.current = chart
    candleRef.current = candle

    // Initialize markers primitive (v5 API)
    markersRef.current = createSeriesMarkers(candle, [])

    return () => {
      // detach markers explicitly
      try { markersRef.current?.detach() } catch {}
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      markersRef.current = null
    }
  }, [])

  // ─── update bars on cursor change ───
  useEffect(() => {
    if (!candleRef.current || visibleBars.length === 0) return
    candleRef.current.setData(visibleBars.map(b => ({
      time: b.t, open: b.o, high: b.h, low: b.l, close: b.c,
    })))
  }, [visibleBars])

  // ─── update markers ───
  useEffect(() => {
    if (!markersRef.current || !candleRef.current) return
    const markers = []
    visibleTrades.forEach(t => {
      const entrySec = Math.floor(new Date(t.entry_ts).getTime() / 1000)
      const exitSec = Math.floor(new Date(t.exit_ts).getTime() / 1000)
      const isWin = parseFloat(t.pnl_net) >= 0
      // Entry arrow
      markers.push({
        time: entrySec,
        position: t.side === 'buy' ? 'belowBar' : 'aboveBar',
        color: t.side === 'buy' ? '#5eead4' : '#a78bfa',
        shape: t.side === 'buy' ? 'arrowUp' : 'arrowDown',
        text: t.side === 'buy' ? 'B' : 'S',
        size: 1.2,
      })
      // Exit dot
      if (exitSec > entrySec) {
        markers.push({
          time: exitSec,
          position: 'inBar',
          color: isWin ? '#22c55e' : '#ef4444',
          shape: 'circle',
          text: (isWin ? '+' : '') + parseFloat(t.pnl_net).toFixed(0),
          size: 1,
        })
      }
    })
    // Open trade entry marker
    if (openTrade) {
      const entrySec = Math.floor(new Date(openTrade.entry_ts).getTime() / 1000)
      markers.push({
        time: entrySec,
        position: openTrade.side === 'buy' ? 'belowBar' : 'aboveBar',
        color: openTrade.side === 'buy' ? '#5eead4' : '#a78bfa',
        shape: openTrade.side === 'buy' ? 'arrowUp' : 'arrowDown',
        text: openTrade.side === 'buy' ? 'BUY' : 'SELL',
        size: 1.6,
      })
    }
    markers.sort((a, b) => a.time - b.time)
    try { markersRef.current.setMarkers(markers) } catch {}
  }, [visibleTrades, openTrade])

  // ─── price lines for active trade SL/TP/entry ───
  useEffect(() => {
    if (!candleRef.current) return
    // Clear previous price lines
    priceLinesRef.current.forEach(line => {
      try { candleRef.current.removePriceLine(line) } catch {}
    })
    priceLinesRef.current = []

    if (!openTrade) return

    const entry = parseFloat(openTrade.entry_price)
    const sideSign = openTrade.side === 'buy' ? 1 : -1
    // We don't store SL/TP per trade yet, so derive from typical bot config
    // (If trade exited via SL/TP later, we can use that as confirmation.)
    let sl = entry - sideSign * slTicks * tickSize
    let tp = entry + sideSign * tpTicks * tickSize
    // If we already know how this trade ended (look-ahead from full trades data) and
    // it ended via stop_loss / take_profit, use the actual exit price for accuracy.
    // (User isn't surprised — they're watching a replay of a known run.)
    if (openTrade.exit_reason === 'stop_loss') sl = parseFloat(openTrade.exit_price)
    if (openTrade.exit_reason === 'take_profit') tp = parseFloat(openTrade.exit_price)

    const entryLine = candleRef.current.createPriceLine({
      price: entry, color: '#5eead4',
      lineWidth: 1, lineStyle: 0,
      axisLabelVisible: true,
      title: openTrade.side === 'buy' ? 'BUY' : 'SELL',
    })
    const slLine = candleRef.current.createPriceLine({
      price: sl, color: '#ef4444',
      lineWidth: 1, lineStyle: 2,  // dashed
      axisLabelVisible: true,
      title: 'SL',
    })
    const tpLine = candleRef.current.createPriceLine({
      price: tp, color: '#22c55e',
      lineWidth: 1, lineStyle: 2,
      axisLabelVisible: true,
      title: 'TP',
    })
    priceLinesRef.current = [entryLine, slLine, tpLine]
  }, [openTrade, slTicks, tpTicks, tickSize])

  // ─── auto-scroll: keep cursor visible, last ~80 bars in view ───
  useEffect(() => {
    if (!chartRef.current || cursorSec == null || visibleBars.length === 0) return
    const lastBar = visibleBars[visibleBars.length - 1]
    if (!lastBar) return
    const fromIdx = Math.max(0, visibleBars.length - 100)
    chartRef.current.timeScale().setVisibleRange({
      from: visibleBars[fromIdx].t,
      to: lastBar.t,
    })
  }, [cursorSec, visibleBars.length])

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {bars.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em',
        }}>
          NO BAR DATA · re-run to populate
        </div>
      )}
    </div>
  )
}
