
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Project, ProjectStatus, SerialStatus, SerialNumberRecord, Stage } from '../types';
import { Icons } from '../constants';

/* ─── Mini Sparkline ─── */
const Sparkline: React.FC<{ data: number[] }> = ({ data = [] }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-6 mt-2">
      {data.map((val, i) => (
        <div key={i} className="flex-1 bg-indigo-600/10 rounded-sm min-h-[3px] transition-all" style={{ height: `${(val / max) * 100}%` }} />
      ))}
    </div>
  );
};

/* ─── KPI Card ─── */
const KPICard: React.FC<{
  label: string; value: string | number; suffix?: string; trend: number; trendLabel: string;
  sparkData: number[]; color: string; onClick: () => void;
}> = ({ label, value, suffix, trend, trendLabel, sparkData, color, onClick }) => (
  <div onClick={onClick} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-[2px] hover:border-indigo-200">
    <div className="flex justify-between items-start">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icons.Flash className="w-4 h-4 text-white" />
      </div>
    </div>
    <div className="text-[2.25rem] font-extrabold text-slate-900 leading-none mt-1 tabular-nums">
      {value}{suffix && <span className="text-xl opacity-60 ml-0.5">{suffix}</span>}
    </div>
    <div className="flex items-center justify-between mt-1">
      <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${trend > 0 ? 'text-emerald-600 bg-emerald-50' : trend < 0 ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50'}`}>
        {trend > 0 ? '↑' : trend < 0 ? '↓' : '—'} {trend > 0 ? '+' : ''}{trend}%
      </div>
      <span className="text-[10px] text-slate-400 font-semibold">{trendLabel}</span>
    </div>
    <Sparkline data={sparkData} />
  </div>
);

/* ─── Bar Chart Widget ─── */
const BarChartWidget: React.FC<{ data: { label: string; value: number }[]; title: string }> = ({ data, title }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-slate-50">
        <Icons.Execution className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-bold text-slate-900">{title}</span>
      </div>
      <div className="p-5">
        <div className="flex items-end gap-2 h-[180px]">
          {data.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end gap-1">
              <span className="text-[11px] font-extrabold text-slate-800">{item.value}</span>
              <div className="w-full max-w-[48px] rounded-t-md bg-gradient-to-b from-indigo-600 to-indigo-400 min-h-[4px] transition-all duration-500" style={{ height: `${(item.value / max) * 100}%` }} />
              <span className="text-[9px] font-bold uppercase text-slate-400 text-center leading-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Trend Chart Widget ─── */
const TrendChartWidget: React.FC<{ data: { label: string; value: number }[]; title: string; color: string }> = ({ data, title, color }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-slate-50">
        <Icons.Flash className="w-4 h-4" style={{ color }} />
        <span className="text-sm font-bold text-slate-900">{title}</span>
      </div>
      <div className="p-5">
        <div className="flex items-end gap-[3px] h-[140px]">
          {data.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end gap-1">
              <span className="text-[10px] font-bold text-slate-400">{item.value}%</span>
              <div className="w-full max-w-[40px] rounded-t-md min-h-[4px] transition-all duration-500"
                style={{ height: `${(item.value / max) * 100}%`, background: `linear-gradient(180deg, ${color}, ${color}44)` }} />
              <span className="text-[9px] font-semibold text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Dashboard Component ─── */
const Dashboard: React.FC<{ store: any; navigateTo: any }> = ({ store, navigateTo }) => {
  const { projects, records } = store;
  const [showExport, setShowExport] = useState(false);
  const [showStations, setShowStations] = useState(false);
  const [drillDown, setDrillDown] = useState<{ type: string; value?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedFilter, setFeedFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('default');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const productionProjects = projects.filter((p: Project) => p.status === ProjectStatus.PRODUCTION);
  const activeProjectId = productionProjects[0]?.id || 'tohands-main';

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClick = () => {
      setShowStations(false);
      setShowExport(false);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Filtered records based on project + date
  const filteredRecords: SerialNumberRecord[] = useMemo(() => {
    let units: SerialNumberRecord[] = records.filter((r: SerialNumberRecord) => r.projectId === activeProjectId);

    if (dateFilter === 'custom' && startDate && endDate) {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      units = units.filter(u => {
        const d = new Date(u.updatedTimestamp);
        return d >= start && d <= end;
      });
    }
    return units;
  }, [records, dateFilter, startDate, endDate, activeProjectId]);

  // Metrics
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    const wip = filteredRecords.filter(r => r.status === SerialStatus.IN_PROCESS || r.status === SerialStatus.CREATED).length;
    const completed = filteredRecords.filter(r => r.status === SerialStatus.COMPLETED).length;
    const failed = filteredRecords.filter(r => r.status === SerialStatus.FAILED).length;
    const scrapped = filteredRecords.filter(r => r.scrapFlag).length;
    const onHold = filteredRecords.filter(r => r.holdFlag).length;
    const reworked = filteredRecords.filter(r => r.reworkCount > 0).length;

    // WIP breakdown by station
    const wipBreakdown: Record<string, number> = {};
    filteredRecords.filter(r => r.status === SerialStatus.IN_PROCESS || r.status === SerialStatus.CREATED).forEach(r => {
      const stage = projects.flatMap((p: Project) => p.stages).find((s: Stage) => s.id === r.currentStageId);
      const name = stage?.name || r.currentStageId;
      wipBreakdown[name] = (wipBreakdown[name] || 0) + 1;
    });

    return { total, wip, completed, failed, scrapped, onHold, reworked, wipBreakdown };
  }, [filteredRecords, projects]);

  const yieldPct = metrics.total > 0 ? ((metrics.completed / metrics.total) * 100).toFixed(1) : '0.0';
  const scrapPct = metrics.total > 0 ? ((metrics.scrapped / metrics.total) * 100).toFixed(1) : '0.0';

  // Sparkline data generator
  const genSpark = useCallback((base: number) => Array.from({ length: 7 }, () => Math.max(0, base + Math.floor(Math.random() * 6) - 3)), []);

  // WIP bar data
  const wipBarData = useMemo(() => Object.entries(metrics.wipBreakdown).map(([name, count]) => ({
    label: name.replace(/Station \d+: /, '').substring(0, 10), value: count as number
  })), [metrics.wipBreakdown]);

  // Yield & Scrap trends (synthetic 7-day)
  const yieldTrend = useMemo(() => {
    const base = parseFloat(yieldPct) || 50;
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
      label: d, value: Math.min(100, Math.max(0, Math.round(base + (Math.random() * 20 - 10))))
    }));
  }, [yieldPct]);

  const scrapTrend = useMemo(() => {
    const base = parseFloat(scrapPct) || 5;
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
      label: d, value: Math.min(50, Math.max(0, Math.round(base + (Math.random() * 10 - 5))))
    }));
  }, [scrapPct]);

  // Station load %
  const stationLoadData = useMemo(() => {
    const totalWip = metrics.wip || 1;
    return Object.entries(metrics.wipBreakdown).map(([name, count]) => ({
      label: name.replace(/Station \d+: /, '').substring(0, 8), value: Math.round(((count as number) / totalWip) * 100)
    }));
  }, [metrics.wipBreakdown, metrics.wip]);

  // CSV Export (Existing)
  const handleExport = () => {
    const headers = [
      'Device ID',
      'Project',
      'PCB Serial Number',
      'Speaker Box Serial Number',
      'Battery Serial Number',
      'Bottom Panel Serial Number',
      'Display Part Serial Number',
      'Keypad PCB Serial Number',
      'Top Panel Serial Number',
      'Status',
      'Stage',
      'Rework Count',
      'Updated'
    ];

    const rows = filteredRecords.map(u => {
      const proj = projects.find((p: Project) => p.id === u.projectId);
      const stage = proj?.stages.find((s: Stage) => s.id === u.currentStageId);

      return [
        u.deviceId || 'N/A',
        proj?.name || '',
        u.sn, // MAIN SN is the PCB SN
        u.linkedParts['Speaker Box SN'] || '',
        u.linkedParts['Battery SN'] || '',
        u.linkedParts['Bottom Panel SN'] || '',
        u.linkedParts['Display SN'] || '',
        u.linkedParts['Keypad PCB SN'] || '',
        u.linkedParts['Top Panel SN'] || '',
        u.status,
        stage?.name || '',
        u.reworkCount,
        new Date(u.updatedTimestamp).toLocaleString()
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `TMLWM-Export-${Date.now()}.csv`; link.click();
    setShowExport(false);
  };


  // Drill-down data
  const drillData = useMemo(() => {
    if (!drillDown) return [];
    let filtered: SerialNumberRecord[] = [];
    switch (drillDown.type) {
      case 'total': filtered = filteredRecords; break;
      case 'wip': filtered = filteredRecords.filter(r => r.status === SerialStatus.IN_PROCESS || r.status === SerialStatus.CREATED); break;
      case 'completed': filtered = filteredRecords.filter(r => r.status === SerialStatus.COMPLETED); break;
      case 'scrap': filtered = filteredRecords.filter(r => r.scrapFlag); break;
      case 'hold': filtered = filteredRecords.filter(r => r.holdFlag); break;
      case 'station': filtered = filteredRecords.filter(r => (r.status === SerialStatus.IN_PROCESS || r.status === SerialStatus.CREATED) && r.currentStageId === drillDown.value); break;
    }
    if (searchTerm) filtered = filtered.filter(u => u.sn.toLowerCase().includes(searchTerm.toLowerCase()));
    return filtered.sort((a, b) => b.updatedTimestamp - a.updatedTimestamp);
  }, [filteredRecords, drillDown, searchTerm]);

  // Live feed
  const liveFeed = useMemo(() => {
    let sorted = [...filteredRecords].sort((a, b) => b.updatedTimestamp - a.updatedTimestamp);
    if (feedFilter !== 'all') {
      const map: Record<string, string> = { wip: SerialStatus.IN_PROCESS, completed: SerialStatus.COMPLETED, failed: SerialStatus.FAILED, hold: SerialStatus.ON_HOLD };
      sorted = sorted.filter(u => u.status === map[feedFilter] || (feedFilter === 'wip' && u.status === SerialStatus.CREATED));
    }
    return sorted.slice(0, 15);
  }, [filteredRecords, feedFilter]);

  // ─── DRILL-DOWN VIEW ───
  if (drillDown) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => { setDrillDown(null); setSearchTerm(''); }} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition shrink-0">
              <Icons.ChevronRight className="w-4 h-4 rotate-180 text-slate-600" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Record Explorer</div>
              <h2 className="text-xl font-extrabold text-slate-900">Explore Inventory</h2>
            </div>
            <span className="bg-indigo-50 text-indigo-600 text-[11px] font-bold px-3 py-1 rounded-full">{drillData.length} Units</span>
          </div>
          <div className="mt-3 relative">
            <Icons.Traceability className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input placeholder="Search serial number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Serial Number</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Project</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Stage</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Last Updated</th>
              </tr></thead>
              <tbody>
                {drillData.map(u => {
                  const proj = projects.find((p: Project) => p.id === u.projectId);
                  const stage = proj?.stages.find((s: Stage) => s.id === u.currentStageId);
                  return (
                    <tr key={u.sn} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{u.sn}</td>
                      <td className="px-4 py-3 text-slate-600">{proj?.name || ''}</td>
                      <td className="px-4 py-3"><span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{stage?.name || 'N/A'}</span></td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${u.status === SerialStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600' : u.status === SerialStatus.FAILED ? 'bg-red-50 text-red-600' : u.holdFlag ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-amber-600'}`}>{u.holdFlag ? 'ON HOLD' : u.status}</span></td>
                      <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">{new Date(u.updatedTimestamp).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {drillData.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-16 text-slate-400">
                    <Icons.Traceability className="w-8 h-8 mx-auto mb-3 text-slate-200" />
                    <p className="font-bold text-sm">No records found</p>
                    <p className="text-xs mt-1">Try adjusting your search criteria</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN DASHBOARD ───
  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6 px-4 animate-in fade-in">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Production Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time manufacturing intelligence for <strong>{projects.find((p: any) => p.id === activeProjectId)?.modelName || 'Smart Calculator V5'}</strong>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Stations */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowStations(!showStations)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm"
            >
              <Icons.Planning className="w-4 h-4 text-indigo-600" />
              <span>Stations</span>
              <Icons.ChevronRight className={`w-3 h-3 transition-transform duration-200 ${showStations ? 'rotate-90' : ''}`} />
            </button>
            {showStations && (
              <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 min-w-[240px] max-h-[400px] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Select Station</div>
                {(productionProjects.find(p => p.id === activeProjectId) || projects.find((p: any) => p.id === activeProjectId))?.stages.map((stage: Stage) => (
                  <a
                    key={stage.id}
                    href={`?view=station-view&projectId=${activeProjectId}&stageId=${stage.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowStations(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      {stage.id.replace('st-', '')}
                    </div>
                    <span className="truncate">{stage.name}</span>
                    <Icons.Plus className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowExport(!showExport)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition shadow-sm">
              <Icons.Execution className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
            </button>
            {showExport && (
              <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[240px] animate-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Export Data</div>
                <button onClick={handleExport} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <Icons.Traceability className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">CSV Export</div>
                    <div className="text-[10px] text-slate-400 font-medium">Serial Linking History</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => { if (window.confirm('This will reset all production data to defaults. Continue?')) store.resetStore(); }}
            title="System Reset"
            className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-amber-600 hover:bg-amber-100 transition shadow-sm"
          >
            <Icons.Settings className="w-5 h-5" />
          </button>
          <button onClick={() => window.location.reload()} title="Refresh" className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition shadow-sm">
            <Icons.Refresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Icons.Settings className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-slate-700">Filter:</span>
          </div>
          <div className="flex gap-[2px] p-[3px] bg-slate-100 rounded-lg">
            <button onClick={() => setDateFilter('default')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${dateFilter === 'default' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Default (All Data)</button>
            <button onClick={() => setDateFilter('custom')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${dateFilter === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Custom Range</button>
          </div>
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-3 animate-in fade-in">
              <div className="flex items-center gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs px-2 border border-slate-200 rounded-lg bg-slate-50 w-[130px]" /></div>
              <div className="flex items-center gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs px-2 border border-slate-200 rounded-lg bg-slate-50 w-[130px]" /></div>
            </div>
          )}
          {dateFilter === 'default' && <span className="text-xs text-slate-400 font-medium italic">Showing complete data set</span>}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard label="Total Inventory" value={metrics.total} trend={metrics.total > 0 ? 5 : 0} trendLabel="vs last period" sparkData={genSpark(metrics.total)} color="bg-indigo-600" onClick={() => setDrillDown({ type: 'total' })} />
        <KPICard label="Work In Progress" value={metrics.wip} trend={metrics.wip > 0 ? -2 : 0} trendLabel="active units" sparkData={genSpark(metrics.wip)} color="bg-amber-500" onClick={() => setDrillDown({ type: 'wip' })} />
        <KPICard label="FG Yield %" value={yieldPct} suffix="%" trend={parseFloat(yieldPct) > 50 ? 3 : -1} trendLabel="production rate" sparkData={yieldTrend.map(d => d.value)} color="bg-emerald-600" onClick={() => setDrillDown({ type: 'completed' })} />
        <KPICard label="Scrap %" value={scrapPct} suffix="%" trend={parseFloat(scrapPct) > 5 ? 2 : -1} trendLabel="loss rate" sparkData={scrapTrend.map(d => d.value)} color="bg-red-600" onClick={() => setDrillDown({ type: 'scrap' })} />
        <KPICard label="Today Output" value={metrics.completed} trend={metrics.completed > 0 ? 8 : 0} trendLabel="finished goods" sparkData={genSpark(metrics.completed)} color="bg-slate-900" onClick={() => setDrillDown({ type: 'completed' })} />
      </div>

      {/* Production Intelligence — Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wipBarData.length > 0 ? (
          <BarChartWidget data={wipBarData} title="WIP by Station" />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-slate-50"><Icons.Execution className="w-4 h-4 text-indigo-600" /><span className="text-sm font-bold">WIP by Station</span></div>
            <div className="p-8 text-center text-sm text-slate-400">No units in production</div>
          </div>
        )}
        <TrendChartWidget data={yieldTrend} title="Yield Trend (7-Day)" color="#16a34a" />
        {stationLoadData.length > 0 ? (
          <TrendChartWidget data={stationLoadData} title="Station Load %" color="#2563eb" />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-slate-50"><Icons.Settings className="w-4 h-4 text-blue-600" /><span className="text-sm font-bold">Station Load %</span></div>
            <div className="p-8 text-center text-sm text-slate-400">No load data available</div>
          </div>
        )}
        <TrendChartWidget data={scrapTrend} title="Scrap Trend (7-Day)" color="#dc2626" />
      </div>

      {/* Live Production Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-50 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Icons.Execution className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-slate-900">Live Production Feed</span>
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500">Auto-refresh</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: 'All' },
              { id: 'wip', label: 'WIP' },
              { id: 'completed', label: 'FG' },
              { id: 'failed', label: 'Failed' },
              { id: 'hold', label: 'On Hold' },
            ].map(f => (
              <button key={f.id} onClick={() => setFeedFilter(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${feedFilter === f.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'}`}>
                {f.label}</button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {liveFeed.map(u => {
            const proj = projects.find((p: Project) => p.id === u.projectId);
            const stage = proj?.stages.find((s: Stage) => s.id === u.currentStageId);
            const dotColor = u.status === SerialStatus.COMPLETED ? 'bg-emerald-500' : u.status === SerialStatus.FAILED ? 'bg-red-500' : u.holdFlag ? 'bg-orange-500' : 'bg-amber-500';
            const pillColor = u.status === SerialStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600' : u.status === SerialStatus.FAILED ? 'bg-red-50 text-red-600' : u.holdFlag ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-amber-600';
            return (
              <div key={u.sn} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition">
                <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <div className="flex-1 min-w-0">
                  <span className="font-mono font-bold text-sm text-indigo-600">{u.sn}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 hidden md:inline">{stage?.name || 'N/A'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${pillColor}`}>{u.holdFlag ? 'ON HOLD' : u.status}</span>
                <span className="text-[10px] text-slate-400 font-mono hidden md:inline">{new Date(u.updatedTimestamp).toLocaleString()}</span>
              </div>
            );
          })}
          {liveFeed.length === 0 && (
            <div className="text-center py-16">
              <Icons.Execution className="w-6 h-6 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-bold text-slate-400">No activity</p>
              <p className="text-xs text-slate-400 mt-1">Production feed will populate as units enter the pipeline</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
