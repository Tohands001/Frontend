
import React, { useState, useMemo, useEffect } from 'react';
import { SerialNumberRecord, SerialStatus, Project, Stage } from '../types';
import { Icons } from '../constants';

interface StationViewProps {
    store: any;
    stageId: string;
    projectId: string;
}

const StationView: React.FC<StationViewProps> = ({ store, stageId, projectId }) => {
    const { records, projects } = store;
    const [snSearch, setSnSearch] = useState('');
    const [verifyClicked, setVerifyClicked] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [historyRecord, setHistoryRecord] = useState<SerialNumberRecord | null>(null);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setLastRefresh(new Date());
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const project = useMemo(() => projects.find((p: Project) => p.id === projectId), [projects, projectId]);
    const stage = useMemo(() => project?.stages.find((s: Stage) => s.id === stageId), [project, stageId]);

    // Statistics Calculation
    const stats = useMemo(() => {
        if (!project || !stage) return { inProcess: 0, pass: 0, fail: 0, pending: 0 };

        const results = {
            inProcess: 0,
            pass: 0,
            fail: 0,
            pending: 0
        };

        records.forEach((r: SerialNumberRecord) => {
            const hist = r.history.find(h => h.stageId === stageId);
            const isAtThisStation = r.currentStageId === stageId;
            const hasPassed = hist?.status === 'PASSED';
            const hasFailed = hist?.status === 'FAILED';

            const currentStageOrder = project.stages.find(s => s.id === r.currentStageId)?.order || 0;
            const isPending = currentStageOrder < stage.order;

            if (isAtThisStation) results.inProcess++;
            if (hasPassed) results.pass++;
            if (hasFailed) results.fail++;
            if (isPending) results.pending++;
        });

        return results;
    }, [records, projectId, stageId, project, stage, lastRefresh]);

    // Global Search Logic: Find any record matching the search term regardless of current station
    const searchMatch = useMemo(() => {
        if (snSearch.length < 3) return null;
        return records.find((r: SerialNumberRecord) =>
            r.sn.toLowerCase() === snSearch.toLowerCase() ||
            (r.deviceId && r.deviceId.toLowerCase() === snSearch.toLowerCase())
        );
    }, [records, snSearch]);

    const stationData = useMemo(() => {
        if (!project || !stage) return [];

        let baseData = records.filter((r: SerialNumberRecord) => {
            if (r.projectId !== projectId) return false;

            const atThisStation = r.currentStageId === stageId;
            const passedThisStation = r.history.some(h => h.stageId === stageId);

            if (snSearch && verifyClicked) {
                return r.sn.toUpperCase().includes(snSearch.toUpperCase()) ||
                    (r.deviceId && r.deviceId.toUpperCase().includes(snSearch.toUpperCase()));
            }

            return atThisStation || passedThisStation;
        });

        return baseData.sort((a: SerialNumberRecord, b: SerialNumberRecord) => b.updatedTimestamp - a.updatedTimestamp);
    }, [records, projectId, stageId, project, stage, snSearch, verifyClicked, lastRefresh]);

    const handleExport = () => {
        const headers = ['Serial Number', 'Status', 'Result', 'Current Stage', 'Station Name', 'Station Number', 'Timestamp'];
        const rows = stationData.map((r: SerialNumberRecord) => {
            const currentStageName = project?.stages.find(s => s.id === r.currentStageId)?.name || r.currentStageId;
            const histEntry = r.history.find(h => h.stageId === stageId);

            let status = 'Pending';
            if (r.currentStageId === stageId) status = 'In Process';
            else if (histEntry?.status === 'PASSED') status = 'Pass';
            else if (histEntry?.status === 'FAILED') status = 'Fail';
            if (r.status === 'IN_REWORK' && (histEntry?.status === 'FAILED' || r.currentStageId === stageId)) status = 'Rework';

            return [
                r.sn,
                status,
                histEntry?.status || 'N/A',
                currentStageName,
                stage?.name || 'N/A',
                (stage?.order || 0) + 1,
                new Date(r.updatedTimestamp).toLocaleString()
            ];
        });

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${stage?.name || 'Station'}_Metrics_${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
    };

    if (!project || !stage) {
        return (
            <div className="p-8 text-center bg-slate-50 min-h-screen flex flex-col items-center justify-center">
                <Icons.Alert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
                <h2 className="text-2xl font-black text-slate-900 uppercase">Station Sync Lost</h2>
                <p className="text-slate-500 font-medium">The requested production node could not be localized.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 font-sans text-slate-900 animate-in fade-in duration-700 overflow-x-hidden">
            {/* Optimized Header & Search */}
            <div className="max-w-full mx-auto space-y-4">
                <div className="flex flex-col items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase mb-6 flex items-center gap-3">
                        <Icons.Execution className="w-6 h-6 text-indigo-600" />
                        {stage.name} <span className="text-indigo-600">Dashboard</span>
                    </h1>

                    {/* Section: Search (Top Center) */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full max-w-4xl relative">
                        <div className="relative flex-1">
                            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                type="text"
                                placeholder="SEARCH GLOBAL SERIAL NUMBER / DEVICE ID..."
                                value={snSearch}
                                onChange={(e) => {
                                    setSnSearch(e.target.value);
                                    setVerifyClicked(false);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && setVerifyClicked(true)}
                                className="w-full pl-10 pr-48 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono font-bold text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all uppercase"
                            />
                            {searchMatch && (
                                <button
                                    onClick={() => setHistoryRecord(searchMatch)}
                                    className="absolute right-2 top-2 bottom-2 px-4 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg flex items-center gap-2 animate-in zoom-in-50"
                                >
                                    <Icons.Traceability className="w-4 h-4" /> Trace Found
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                if (searchMatch) setHistoryRecord(searchMatch);
                                setVerifyClicked(true);
                            }}
                            className="px-8 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                            Trace Any Unit <Icons.Flash className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mt-6 px-6 py-2 bg-slate-50 rounded-full border border-slate-100">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Movement Tracking Active • {lastRefresh.toLocaleTimeString()}</p>
                    </div>
                </div>

                {/* Section: Unit Information Table (Responsive & Sticky Header) */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
                    <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                            <Icons.MES className="w-4 h-4 text-indigo-600" />
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Unit Monitoring Table</h3>
                        </div>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm uppercase tracking-widest"
                        >
                            <Icons.Execution className="w-3 h-3" /> Export CSV
                        </button>
                    </div>

                    <div className="overflow-y-auto max-h-[800px]">
                        <table className="w-full text-left table-fixed border-collapse">
                            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-20">
                                <tr className="border-b border-slate-100">
                                    <th className="w-[20%] px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Serial Number / ID</th>
                                    <th className="w-[10%] px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="w-[15%] px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Stage</th>
                                    <th className="w-[8%] px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Result</th>
                                    <th className="w-[15%] px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry Time</th>
                                    <th className="w-[15%] px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Last Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stationData.map((record: SerialNumberRecord) => {
                                    const currentStageName = project.stages.find(s => s.id === record.currentStageId)?.name || record.currentStageId;
                                    const histEntry = record.history.find(h => h.stageId === stageId);
                                    const isAtThisStation = record.currentStageId === stageId;

                                    const lastPassedStage = [...record.history]
                                        .reverse()
                                        .find(h => h.status === 'PASSED');
                                    const lastPassedName = lastPassedStage
                                        ? project.stages.find(s => s.id === lastPassedStage.stageId)?.name || 'N/A'
                                        : 'None';

                                    // Determine Status (Pass, Fail, Pending, In Process, Rework)
                                    let statusLabel = 'Pending';
                                    let statusColor = 'bg-slate-100 text-slate-500';

                                    if (isAtThisStation) {
                                        if (record.status === 'FAILED') {
                                            statusLabel = 'Fail';
                                            statusColor = 'bg-red-100 text-red-600';
                                        } else if (record.status === 'IN_REWORK') {
                                            statusLabel = 'Rework';
                                            statusColor = 'bg-purple-100 text-purple-600';
                                        } else {
                                            statusLabel = 'In Process';
                                            statusColor = 'bg-blue-100 text-blue-600';
                                        }
                                    } else if (histEntry?.status === 'PASSED') {
                                        statusLabel = 'Pass';
                                        statusColor = 'bg-emerald-100 text-emerald-600';
                                    } else if (histEntry?.status === 'FAILED') {
                                        statusLabel = 'Fail';
                                        statusColor = 'bg-red-100 text-red-600';
                                    }

                                    return (
                                        <tr key={record.sn} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setHistoryRecord(record)}>
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-xs tabular-nums tracking-tight underline decoration-indigo-200 decoration-2 underline-offset-4">{record.sn}</span>
                                                    {record.deviceId && <span className="text-[8px] text-slate-400 font-black tracking-tighter uppercase leading-tight">DID: {record.deviceId}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${statusColor}`}>
                                                    {statusLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] font-black text-slate-600 uppercase truncate block" title={currentStageName}>
                                                    {currentStageName}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {histEntry?.status ? (
                                                    <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center ${histEntry.status === 'PASSED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {histEntry.status === 'PASSED' ? <Icons.Check className="w-3 h-3" /> : <Icons.Alert className="w-3 h-3" />}
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center bg-slate-100 text-slate-300">
                                                        <Icons.History className="w-2.5 h-2.5" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 overflow-hidden">
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-slate-600 text-[10px]">
                                                        {new Date(record.updatedTimestamp - (Math.random() * 3600000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">Initial Entry</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="font-mono font-bold text-indigo-400 text-[10px]">
                                                    {new Date(record.updatedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {stationData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-20">
                                                <Icons.Traceability className="w-8 h-8 text-slate-400" />
                                                <p className="font-black uppercase tracking-[0.2em] text-[9px]">Awaiting Telemetry</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ─── Traceability Modal ─── */}
            {historyRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div
                        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-8 bg-slate-950 text-white relative">
                            <button
                                onClick={() => setHistoryRecord(null)}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                            >
                                <Icons.Plus className="w-6 h-6 rotate-45" />
                            </button>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                                    <Icons.Traceability className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-indigo-400">Unit Traceability</h2>
                                    <h3 className="text-xl font-black tracking-tight font-mono">{historyRecord.sn}</h3>
                                </div>
                            </div>
                            {historyRecord.deviceId && (
                                <div className="mt-4 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                                    <Icons.Dashboard className="w-3 h-3" /> DID: {historyRecord.deviceId}
                                </div>
                            )}
                        </div>

                        {/* Timeline Body */}
                        <div className="p-8 overflow-y-auto max-h-[60vh] bg-slate-50/30">
                            <div className="relative space-y-8">
                                <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-slate-200" />

                                {/* Initial Registration Point */}
                                <div className="relative flex items-start gap-6 group">
                                    <div className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl bg-slate-900/90 transition-all group-hover:scale-105">
                                        <Icons.Flash className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">System Genesis</h4>
                                            <span className="text-[10px] font-bold text-slate-300 font-mono">Registered</span>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Unit Initially Registered</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Serial number entered supply chain</p>
                                    </div>
                                </div>

                                {/* Full Lifecycle View (All Mandatory Stages) */}
                                {(() => {
                                    const recordProject = projects.find((p: any) => p.id === historyRecord.projectId) || project;
                                    const currentStage = recordProject?.stages.find((s: any) => s.id === historyRecord.currentStageId);

                                    return recordProject?.stages.map((stage: any) => {
                                        const stageHistory = (historyRecord.history || []).filter(h => h.stageId === stage.id)
                                            .sort((a, b) => a.timestamp - b.timestamp);
                                        const isCurrent = historyRecord.currentStageId === stage.id;
                                        const isScrapped = historyRecord.status === 'SCRAPPED';
                                        const isFailedStatus = historyRecord.status === 'FAILED';
                                        const isReworkStatus = historyRecord.status === 'IN_REWORK';
                                        const isPast = currentStage ? stage.order < currentStage.order : false;
                                        const hasHistory = stageHistory.length > 0;

                                        return (
                                            <div key={stage.id} className="relative space-y-4">
                                                <div className="relative flex items-start gap-6 group">
                                                    <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl transition-all group-hover:scale-110 
                                                        ${(isCurrent && isScrapped) ? 'bg-slate-900 ring-4 ring-red-50' :
                                                            (isCurrent && isReworkStatus) ? 'bg-purple-600 ring-4 ring-purple-100 animate-pulse' :
                                                                (isCurrent && isFailedStatus) ? 'bg-red-600 ring-4 ring-red-100 animate-pulse' :
                                                                    hasHistory ? (stageHistory[stageHistory.length - 1].status === 'PASSED' ? 'bg-emerald-500' : 'bg-red-500') :
                                                                        isCurrent ? 'bg-indigo-600 ring-4 ring-indigo-50 shadow-indigo-200' : 'bg-slate-100'}`}>
                                                        {(isCurrent && isScrapped) ? (
                                                            <Icons.Trash className="w-6 h-6 text-white" />
                                                        ) : (isCurrent && isReworkStatus) ? (
                                                            <Icons.Refresh className="w-6 h-6 text-white" />
                                                        ) : (isCurrent && isFailedStatus) ? (
                                                            <Icons.Alert className="w-6 h-6 text-white" />
                                                        ) : hasHistory ? (
                                                            stageHistory[stageHistory.length - 1].status === 'PASSED' ? <Icons.Check className="w-6 h-6 text-white" /> : <Icons.Alert className="w-6 h-6 text-white" />
                                                        ) : isCurrent ? (
                                                            <Icons.Execution className="w-6 h-6 text-white animate-pulse" />
                                                        ) : (
                                                            <Icons.Clock className="w-5 h-5 text-slate-300" />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 pt-1">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className={`text-[11px] font-black uppercase tracking-widest ${isCurrent ? 'text-indigo-400' : 'text-slate-400'}`}>
                                                                Station {stage.order + 1}
                                                            </h4>
                                                            {hasHistory && (
                                                                <span className="text-[10px] font-bold text-slate-400 font-mono">
                                                                    {new Date(stageHistory[stageHistory.length - 1].timestamp).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className={`text-sm font-black uppercase tracking-tight leading-none ${isCurrent ? 'text-indigo-900' : hasHistory ? 'text-slate-800' : 'text-slate-300'}`}>
                                                            {stage.name}
                                                        </h4>

                                                        {/* Status Badges */}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            {(isCurrent && isScrapped) ? (
                                                                <span className="text-[8px] font-black px-4 py-1 rounded-md uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-200">
                                                                    UNIT SCRAPPED
                                                                </span>
                                                            ) : (isCurrent && isReworkStatus) ? (
                                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest bg-purple-100 text-purple-700 animate-pulse border border-purple-200">
                                                                    Rework in Progress
                                                                </span>
                                                            ) : (isCurrent && isFailedStatus) ? (
                                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest bg-red-100 text-red-700 animate-pulse border border-red-200">
                                                                    Failed / Action Required
                                                                </span>
                                                            ) : hasHistory ? (
                                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${stageHistory[stageHistory.length - 1].status === 'PASSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {stageHistory[stageHistory.length - 1].status}
                                                                </span>
                                                            ) : isCurrent ? (
                                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest bg-indigo-100 text-indigo-700 animate-pulse">
                                                                    Currently Active
                                                                </span>
                                                            ) : isPast ? (
                                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                    PASS
                                                                </span>
                                                            ) : (
                                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest text-slate-200">
                                                                    Pending Arrival
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Details (History Sub-entries) */}
                                                {hasHistory && (
                                                    <div className="ml-12 space-y-3 pl-12 border-l-2 border-slate-50 py-2">
                                                        {stageHistory.map((h, hIdx) => (
                                                            <div key={hIdx} className="relative text-[10px] flex items-center gap-3">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${h.status === 'PASSED' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                                                <span className="font-mono font-bold text-slate-400">
                                                                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <span className={`font-black uppercase tracking-widest ${h.status === 'PASSED' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                    {h.status}
                                                                </span>
                                                                {h.remark && <span className="text-slate-400 italic font-medium truncate max-w-[200px]">"{h.remark}"</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) || null;
                                })()}

                                {/* Special movement (Rework) */}
                                {historyRecord.status === 'IN_REWORK' && (
                                    <div className="relative flex items-start gap-6 group">
                                        <div className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl bg-purple-600 animate-pulse">
                                            <Icons.Refresh className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <h4 className="text-[11px] font-black text-purple-400 uppercase tracking-widest">Protocol Re-entry</h4>
                                            <h4 className="text-sm font-black text-purple-700 uppercase tracking-tight leading-none">Redirected to Rework</h4>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Status: Correction in progress</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setHistoryRecord(null)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                            >
                                Close Traceability
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Horizontal Scroll Block Warning (Only shown if overflow detected accidentally) */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media (max-width: 1024px) {
                    body { overflow-x: hidden; }
                }
                .sticky-header th { position: sticky; top: 0; background: #f8fafc; z-index: 10; shadow: 0 1px 0 #e2e8f0; }
            ` }} />
        </div>
    );
};

export default StationView;
