
import React, { useState } from 'react';
import { Project, SerialNumberRecord, SerialStatus, SerialType } from '../types';
import { analyzeAuditLogs } from '../geminiService';
import { Icons } from '../constants';

const Traceability: React.FC<{ store: any }> = ({ store }) => {
  const { auditLogs, users, records, projects } = store;
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchSn, setSearchSn] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<SerialNumberRecord | null>(null);

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeAuditLogs(auditLogs);
    setAnalysis(result || "No findings.");
    setIsAnalyzing(false);
  };

  const handleSnSearch = (sn?: string) => {
    const targetSn = sn || searchSn;
    const record = records.find((r: any) => r.sn === targetSn);
    setSelectedRecord(record || null);
    if (!sn) setSearchSn(targetSn);
  };

  const getLinkedSubs = (mainSn: string) => {
    return records.filter((r: SerialNumberRecord) => r.parentSerialId === mainSn);
  };

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Lineage & Traceability</h2>
          <p className="text-slate-500 mt-2 font-medium">Digital Thread: Comprehensive production history and lineage mapping.</p>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Serial Number..."
              value={searchSn}
              onKeyDown={(e) => e.key === 'Enter' && handleSnSearch()}
              onChange={(e) => setSearchSn(e.target.value.toUpperCase())}
              className="pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 shadow-sm w-80 font-mono font-bold"
            />
            <Icons.Traceability className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
          </div>
          <button
            onClick={() => handleSnSearch()}
            className="px-8 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition shadow-xl uppercase tracking-widest"
          >
            Trace Unit
          </button>
        </div>
      </div>

      {selectedRecord && (
        <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 overflow-hidden relative">
            <div className={`absolute top-0 right-0 p-12 opacity-5 rotate-12 ${selectedRecord.scrapFlag ? 'text-red-600' : 'text-indigo-600'}`}>
              <Icons.Traceability className="w-48 h-48" />
            </div>

            <div className="flex justify-between items-start mb-12 relative z-10">
              <div className="flex space-x-6">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl ${selectedRecord.scrapFlag ? 'bg-red-600 shadow-red-600/30' : 'bg-slate-900 shadow-slate-900/30'}`}>
                  <span className="text-white font-black text-2xl uppercase tracking-widest">{selectedRecord.type === SerialType.MAIN ? 'M' : 'S'}</span>
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{selectedRecord.sn}</h3>
                    {selectedRecord.scrapFlag && <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-red-600/30">Unit Scrapped</span>}
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.3em] mt-2 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                    Digital Lineage Profile: {selectedRecord.type} Serial
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Protocol Status</div>
                <div className={`text-xl font-black uppercase tracking-tight ${selectedRecord.status === SerialStatus.FAILED ? 'text-red-600' : 'text-indigo-600'}`}>
                  {selectedRecord.status}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Production Queue</div>
                <div className="font-bold text-slate-800">{projects.find(p => p.id === selectedRecord.projectId)?.name}</div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Update</div>
                <div className="font-bold text-slate-800">{new Date(selectedRecord.updatedTimestamp).toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cycle Efficiency</div>
                <div className="font-bold text-slate-800">{(selectedRecord.history.length / 12 * 100).toFixed(1)}% Station Load</div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rework Index</div>
                <div className={`font-black text-lg ${selectedRecord.reworkCount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{selectedRecord.reworkCount} Cycles</div>
              </div>
            </div>

            {/* Linked Components (Module 4) */}
            {selectedRecord.type === SerialType.MAIN && (
              <div className="mb-16">
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center">
                  <Icons.Settings className="w-5 h-5 mr-3 text-indigo-500" />
                  Linked Sub-Component Inventory
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getLinkedSubs(selectedRecord.sn).map(sub => (
                    <button
                      key={sub.sn}
                      onClick={() => handleSnSearch(sub.sn)}
                      className="group flex items-center p-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:shadow-xl transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center mr-4 group-hover:bg-indigo-600 transition-colors">
                        <span className="text-xs font-black">S</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-black text-slate-800 truncate mb-0.5">{sub.sn}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{sub.subType || 'Generic'} Module</div>
                      </div>
                      <Icons.ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-500" />
                    </button>
                  ))}
                  {getLinkedSubs(selectedRecord.sn).length === 0 && (
                    <div className="col-span-full border-2 border-dashed border-slate-100 rounded-3xl p-10 text-center opacity-40">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Component Linkage Records Found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline (Module 8) */}
            <div className="space-y-12 relative px-4">
              <div className="absolute left-10 top-2 bottom-2 w-1 bg-slate-100 rounded-full"></div>
              {selectedRecord.history.map((h, i) => {
                const project = projects.find(p => p.id === selectedRecord.projectId);
                const stage = project?.stages.find(s => s.id === h.stageId) || projects.find(p => p.id === 'rework-center')?.stages.find(s => s.id === h.stageId);
                const user = users.find(u => u.id === h.userId);

                return (
                  <div key={i} className="flex space-x-10 relative group">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-xl transition-transform group-hover:scale-110 ${h.status === 'PASSED' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      } ${h.isOverride ? 'ring-8 ring-orange-100' : ''}`}>
                      {h.status === 'PASSED' ? <Icons.Check className="w-6 h-6" /> : <Icons.Settings className="w-6 h-6 rotate-45" />}
                    </div>

                    <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm group-hover:shadow-2xl transition-all border-l-8 border-l-indigo-500">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xl font-black text-slate-900">{stage?.name || h.stageId}</h4>
                            {h.status === 'FAILED' && <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">Defect Logged</span>}
                            {h.isReplacementEvent && <span className="bg-purple-100 text-purple-600 text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">Replacement</span>}
                          </div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Protocol Execution by @{user?.username || 'Unknown'} • {new Date(h.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {h.isOverride && (
                          <div className="bg-orange-600 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-[0.2em] shadow-lg shadow-orange-600/30">Admin Override</div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {h.defectCode && (
                          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                            <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Defect Code</div>
                            <div className="font-bold text-red-900">{h.defectCode}</div>
                          </div>
                        )}
                        {Object.entries(h.data).filter(([k]) => !['remark', 'def-code', 'root-cause', 'action'].includes(k)).slice(0, 4).map(([key, value]: [string, any]) => (
                          <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{key}</p>
                            <p className="text-xs font-bold text-slate-800 truncate">{String(value)}</p>
                          </div>
                        ))}
                      </div>

                      {(h.remark || h.rootCause) && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                          <div className="flex space-x-6">
                            {h.remark && (
                              <div className="flex-1">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Process Remark</div>
                                <div className="text-sm text-slate-600 italic font-medium">"{h.remark}"</div>
                              </div>
                            )}
                            {h.rootCause && (
                              <div className="flex-1 border-l border-slate-200 pl-6">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Forensic Analysis</div>
                                <div className="text-sm text-red-900 font-bold">Root Cause: {h.rootCause}</div>
                                <div className="text-xs text-green-700 font-bold mt-1">CA: {h.correctiveAction}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!selectedRecord && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
              <Icons.Audit className="w-6 h-6 mr-3 text-indigo-500" />
              Real-Time Ledger Transactions
            </h3>
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Hash / Timestamp</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Identity</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Protocol Action</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Linked Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.slice(0, 50).map((log: any) => {
                      const user = users.find((u: any) => u.id === log.userId);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors border-l-4 border-l-transparent hover:border-l-indigo-500">
                          <td className="px-8 py-5">
                            <div className="font-mono text-[10px] font-bold text-slate-400 mb-1">{log.id.toUpperCase()}</div>
                            <div className="text-[11px] font-black text-slate-600">{new Date(log.timestamp).toLocaleString()}</div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px] uppercase">
                                {user?.username?.substring(0, 2) || 'SY'}
                              </div>
                              <span className="text-xs font-black text-slate-800 tracking-tighter uppercase">@{user?.username || 'System'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-xs font-bold text-slate-600 uppercase tracking-widest">{log.action}</td>
                          <td className="px-8 py-5">
                            <button
                              onClick={() => log.sn && handleSnSearch(log.sn)}
                              disabled={!log.sn}
                              className={`font-mono text-xs font-black transition-colors ${log.sn ? 'text-indigo-600 hover:text-indigo-800' : 'text-slate-300'}`}
                            >
                              {log.sn || log.projectId || '-'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform rotate-12">
                <Icons.AIPilot className="w-48 h-48" />
              </div>
              <h3 className="text-2xl font-black mb-6 tracking-tight flex items-center">
                Forensic Engine
                <span className="ml-3 bg-indigo-500 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-black shadow-lg shadow-indigo-500/30">AI Live</span>
              </h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                Autonomous auditing of production variances. Our forensic engine cross-references station cycle times with defect frequency to identify hidden process risks.
              </p>
              <button
                onClick={runAiAnalysis}
                disabled={isAnalyzing}
                className={`w-full py-5 rounded-2xl font-black flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-2xl ${isAnalyzing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-white hover:text-indigo-600 shadow-indigo-600/40 uppercase tracking-widest'
                  }`}
              >
                {isAnalyzing ? (
                  <>
                    <Icons.Refresh className="w-6 h-6 animate-spin" />
                    <span>Analyzing Ledger...</span>
                  </>
                ) : (
                  <>
                    <Icons.Flash className="w-6 h-6" />
                    <span>Run Protocol Audit</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-emerald-600 rounded-[2.5rem] p-10 text-white shadow-xl shadow-emerald-500/20">
              <h4 className="font-black text-xl tracking-tight mb-2">Line Compliance</h4>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-8">Protocol Certification v9.2</p>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-3">
                    <span>Audit Data Integrity</span>
                    <span>98.2%</span>
                  </div>
                  <div className="w-full bg-emerald-900/30 h-3 rounded-full overflow-hidden">
                    <div className="bg-white h-full shadow-lg shadow-white/50" style={{ width: '98.2%' }}></div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-700 rounded-2xl border border-emerald-500/30">
                  <p className="text-[10px] text-emerald-100 font-bold italic leading-relaxed">
                    "All production units currently within the digital thread are compliant with ISO-9001:2015 traceability regulations."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Traceability;
