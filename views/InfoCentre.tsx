
import React, { useState, useMemo } from 'react';
import { Project, SerialNumberRecord, SerialStatus, SerialType } from '../types';
import { Icons } from '../constants';

// ─── Stage Progression Tracker ───
const StageProgressionTracker: React.FC<{
    history: any[];
    project: Project | undefined;
}> = ({ history = [], project }) => {
    if (!project) return null;

    const stages = project.stages;

    // Determine which stages have been completed
    const completedStages = new Set<string>();
    history.forEach(h => {
        if (h.status === 'PASSED') {
            completedStages.add(h.stageId);
        }
    });

    return (
        <div className="relative w-full overflow-hidden">
            <div className="flex items-start overflow-x-auto pb-10 pt-4 px-4 no-scrollbar scroll-smooth">
                {stages.map((stage, i) => {
                    const isCompleted = completedStages.has(stage.id);

                    return (
                        <div key={stage.id} className="flex items-center shrink-0">
                            {/* Stage Node */}
                            <div className="flex flex-col items-center w-48 text-center group">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 z-10 ${isCompleted
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-200'
                                    : 'bg-white border-slate-200 text-slate-300'
                                    }`}>
                                    {isCompleted ? <Icons.Check className="w-6 h-6" /> : <span className="text-sm font-black">{i + 1}</span>}
                                </div>
                                <div className="mt-5 px-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest leading-relaxed block ${isCompleted ? 'text-slate-900' : 'text-slate-400'
                                        }`}>
                                        {stage.name.split(':').map((part, idx) => (
                                            <span key={idx} className="block">{part.trim()}{idx === 0 && stage.name.includes(':') ? ':' : ''}</span>
                                        ))}
                                    </span>
                                </div>
                            </div>

                            {/* Connector Line */}
                            {i < stages.length - 1 && (
                                <div className="w-24 px-2 -mt-16">
                                    <div className={`h-[2px] w-full rounded-full transition-colors duration-500 ${isCompleted ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-100'
                                        }`} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Visual fade indicators for scrolling */}
            <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-20" />
            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-20" />
        </div>
    );
};

// ─── Detail Item ───
const DetailItem: React.FC<{ label: string; value: any; icon: any }> = ({ label, value, icon: Icon }) => (
    <div className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-2 transition-colors rounded-lg">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        </div>
        <span className="font-bold text-sm text-slate-900">{value || '—'}</span>
    </div>
);

const InfoCentre: React.FC<{ store: any }> = ({ store }) => {
    const { auditLogs, users, records, projects, currentUser } = store;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRecord, setSelectedRecord] = useState<SerialNumberRecord | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'lineage'>('overview');

    const [recentSearches, setRecentSearches] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('tmlwm_recent_info_searches') || '[]');
        } catch { return []; }
    });

    const handleSearch = (sn?: string) => {
        const targetSn = (sn || searchTerm).trim().toUpperCase();
        if (!targetSn) return;

        const record = records.find((r: any) => r.sn === targetSn || r.deviceId === targetSn);
        setSelectedRecord(record || null);

        if (record) {
            const updated = [targetSn, ...recentSearches.filter(s => s !== targetSn)].slice(0, 5);
            setRecentSearches(updated);
            localStorage.setItem('tmlwm_recent_info_searches', JSON.stringify(updated));
        }
        setSearchTerm(targetSn);
    };

    const suggestions = useMemo(() => {
        if (searchTerm.length < 3 || selectedRecord) return [];
        return records
            .filter((r: any) => r.sn.includes(searchTerm) || (r.deviceId && r.deviceId.includes(searchTerm)))
            .slice(0, 5);
    }, [searchTerm, records, selectedRecord]);

    const project = selectedRecord ? projects.find((p: any) => p.id === selectedRecord.projectId) : null;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Info Centre</h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium italic">Production forensics, unit lineage, and stage progression dashboard.</p>
                </div>
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Icons.Traceability className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search Serial or Device ID..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value.toUpperCase());
                            if (e.target.value === '') setSelectedRecord(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 shadow-sm font-mono font-bold text-sm transition-all"
                    />

                    {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden z-50 animate-in slide-in-from-top-2">
                            {suggestions.map((s: any) => (
                                <button
                                    key={s.sn}
                                    onClick={() => handleSearch(s.sn)}
                                    className="w-full text-left px-5 py-3 hover:bg-slate-50 flex flex-col border-b border-slate-50 last:border-0"
                                >
                                    <span className="text-xs font-mono font-black text-slate-900">{s.sn}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.deviceId || 'No Device ID'}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Searches */}
            {!selectedRecord && recentSearches.length > 0 && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent:</span>
                    {recentSearches.map(s => (
                        <button
                            key={s}
                            onClick={() => handleSearch(s)}
                            className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-mono font-bold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {selectedRecord ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
                    {/* Progression Tracking Card */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8">
                        <div className="flex items-center gap-2 mb-6">
                            <Icons.Flash className="w-5 h-5 text-indigo-500" />
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Live Stage Progression</h4>
                        </div>
                        <StageProgressionTracker history={selectedRecord.history} project={project} />
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
                        {[
                            { id: 'overview', label: 'Overview', icon: Icons.Dashboard },
                            { id: 'history', label: 'History Ledger', icon: Icons.Audit },
                            { id: 'lineage', label: 'Lineage Map', icon: Icons.Traceability }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-white text-indigo-600 shadow-md translate-y-[-1px]'
                                    : 'text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Conditional Views */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Unit Metrics */}
                            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8">
                                <h4 className="text-sm font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                    <Icons.Dashboard className="w-5 h-5 text-indigo-600" />
                                    Unit Intelligence
                                </h4>
                                <div className="space-y-1">
                                    <DetailItem label="Status" value={selectedRecord.status} icon={Icons.Execution} />
                                    <DetailItem label="Serial Number" value={selectedRecord.sn} icon={Icons.AIPilot} />
                                    <DetailItem label="Device ID" value={selectedRecord.deviceId || 'N/A'} icon={Icons.Camera} />
                                    <DetailItem label="Rework Index" value={`${selectedRecord.reworkCount} Cycles`} icon={Icons.Refresh} />
                                    <DetailItem label="Efficiency" value={`${(selectedRecord.history.length / (project?.stages.length || 1) * 100).toFixed(0)}% Clear`} icon={Icons.Flash} />
                                </div>
                            </div>

                            {/* Product Specs */}
                            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8">
                                <h4 className="text-sm font-black uppercase tracking-tighter mb-8 flex items-center gap-3 text-emerald-600">
                                    <Icons.MES className="w-5 h-5" />
                                    Build Specifications
                                </h4>
                                <div className="space-y-1">
                                    <DetailItem label="Project" value={project?.name} icon={Icons.Planning} />
                                    <DetailItem label="Model" value={project?.modelName} icon={Icons.MES} />
                                    <DetailItem label="Creation" value={new Date(selectedRecord.createdTimestamp).toLocaleDateString()} icon={Icons.Traceability} />
                                    <DetailItem label="Last Update" value={new Date(selectedRecord.updatedTimestamp).toLocaleString()} icon={Icons.Refresh} />
                                    <DetailItem label="Scrap Risk" value={selectedRecord.scrapFlag ? 'TERMINATED' : 'LOW'} icon={Icons.Lock} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            {[...selectedRecord.history].reverse().map((h, i) => {
                                const stage = project?.stages.find(s => s.id === h.stageId);
                                const op = users.find((u: any) => u.id === h.userId);
                                return (
                                    <div key={i} className={`bg-white rounded-3xl shadow-sm border p-6 flex items-start gap-6 transition-all hover:shadow-xl ${h.status === 'PASSED' ? 'border-l-8 border-l-emerald-500 border-slate-100' : 'border-l-8 border-l-red-500 border-slate-100'
                                        }`}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${h.status === 'PASSED' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                            {h.status === 'PASSED' ? <Icons.Check className="w-6 h-6" /> : <Icons.Plus className="w-6 h-6 rotate-45" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h5 className="text-lg font-black text-slate-900 tracking-tight">{stage?.name || h.stageId}</h5>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        BY @{op?.username || 'sys'} • {new Date(h.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                                <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${h.status === 'PASSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {h.status}
                                                </span>
                                            </div>
                                            {h.remark && (
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                    <p className="text-xs text-slate-600 italic font-medium">"{h.remark}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'lineage' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(selectedRecord.linkedParts).map(([label, sn]: [string, string]) => (
                                <button
                                    key={label}
                                    onClick={() => handleSearch(sn)}
                                    className="p-6 bg-white rounded-3xl border-2 border-slate-100 hover:border-indigo-500 hover:shadow-2xl transition-all group text-left"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                            <Icons.AIPilot className="w-5 h-5" />
                                        </div>
                                        <Icons.ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-indigo-500" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">{label}</p>
                                    <p className="text-sm font-black text-slate-900 truncate">{sn}</p>
                                </button>
                            ))}
                            {Object.keys(selectedRecord.linkedParts).length === 0 && (
                                <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400">
                                    <Icons.Traceability className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-xs font-black uppercase tracking-widest">No Lineage Mappings Available</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-10">
                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8 animate-pulse">
                        <Icons.Traceability className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Info Centre Engine</h3>
                    <p className="text-slate-500 max-w-sm font-medium">Enter a Serial Number or Device ID in the search field above to unlock live production audit data and complete lineage history.</p>
                </div>
            )}
        </div>
    );
};

export default InfoCentre;
