import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useBacktestRuns() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchRuns() {
    const { data, error } = await supabase
      .from('backtest_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (!error) setRuns(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchRuns()
    const ch = supabase.channel('backtest_runs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'backtest_runs' }, fetchRuns)
      .subscribe()
    // poll every 2s as a fallback (realtime may not be enabled on this project)
    const t = setInterval(fetchRuns, 2000)
    return () => { supabase.removeChannel(ch); clearInterval(t) }
  }, [])

  return { runs, loading, refresh: fetchRuns }
}

export function useBacktestRun(runId) {
  const [run, setRun] = useState(null)
  const [equity, setEquity] = useState([])
  const [trades, setTrades] = useState([])
  const [riskEvents, setRiskEvents] = useState([])
  const [bars, setBars] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    if (!runId) return
    const [r, eq, tr, rk, bs] = await Promise.all([
      supabase.from('backtest_runs').select('*').eq('id', runId).single(),
      fetchAllPaginated('backtest_equity', { run_id: runId }, 'ts'),
      fetchAllPaginated('backtest_trades', { run_id: runId }, 'entry_ts'),
      fetchAllPaginated('backtest_risk_events', { run_id: runId }, 'ts'),
      fetchBarsFromStorage(runId),
    ])
    setRun(r.data || null)
    setEquity(eq || [])
    setTrades(tr || [])
    setRiskEvents(rk || [])
    setBars(bs || [])
    setLoading(false)
  }

  // Paginate to bypass Supabase's 1000-row default limit.
  async function fetchAllPaginated(table, eqFilters, orderCol, pageSize = 1000) {
    const all = []
    let from = 0
    while (true) {
      let q = supabase.from(table).select('*').order(orderCol).range(from, from + pageSize - 1)
      for (const [k, v] of Object.entries(eqFilters)) q = q.eq(k, v)
      const { data, error } = await q
      if (error || !data) break
      all.push(...data)
      if (data.length < pageSize) break
      from += pageSize
      if (from > 200000) break  // safety
    }
    return all
  }

  useEffect(() => {
    fetchAll()
    // poll while running
    const t = setInterval(() => {
      if (run && run.status !== 'done' && run.status !== 'failed') fetchAll()
    }, 2000)
    return () => clearInterval(t)
    // eslint-disable-next-line
  }, [runId, run?.status])

  return { run, equity, trades, riskEvents, bars, loading, refresh: fetchAll }
}

async function fetchBarsFromStorage(runId) {
  try {
    const { data, error } = await supabase.storage
      .from('strategies')
      .download(`runs/${runId}/bars.json`)
    if (error || !data) return []
    const text = await data.text()
    const parsed = JSON.parse(text)
    return parsed.bars || []
  } catch {
    return []
  }
}

export async function fetchSignalLogFromStorage(runId) {
  try {
    const { data, error } = await supabase.storage
      .from('strategies')
      .download(`runs/${runId}/signal_log.json`)
    if (error || !data) return []
    const text = await data.text()
    const parsed = JSON.parse(text)
    return parsed.signals || []
  } catch {
    return []
  }
}

export async function uploadStrategyAndQueue({ file, className, symbol, startDate, endDate, equity, enforceTopstep, label }) {
  const ts = Date.now()
  const path = `runs/${ts}_${file.name}`
  const up = await supabase.storage.from('strategies').upload(path, file, { upsert: true, contentType: 'text/x-python' })
  if (up.error) throw up.error

  const ins = await supabase.from('backtest_runs').insert({
    status: 'queued',
    symbol,
    start_date: startDate,
    end_date: endDate,
    starting_equity: equity,
    enforce_topstep: enforceTopstep,
    warmup_bars: 50,
    strategy_file_path: path,
    strategy_class_name: className,
    label: label || null,
  }).select().single()
  if (ins.error) throw ins.error
  return ins.data
}
