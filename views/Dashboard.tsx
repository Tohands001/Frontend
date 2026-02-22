
import React, { useState } from 'react';
import { ProjectStatus, SerialStatus, SerialType, SerialNumberRecord } from '../types';
import { Icons } from '../constants';

const Dashboard: React.FC<{ store: any; navigateTo: any }> = ({ store, navigateTo }) => {
  const { projects, records } = store;
  const [filterProject, setFilterProject] = useState<string>('all');

  const filteredRecords = filterProject === 'all'
    ? records
    : records.filter((r: SerialNumberRecord) => r.projectId === filterProject);

  const totalScanned = filteredRecords.length;
  const scrapped = filteredRecords.filter((r: SerialNumberRecord) => r.scrapFlag).length;
  const reworked = filteredRecords.filter((r: SerialNumberRecord) => r.reworkCount > 0).length;
  const completed = filteredRecords.filter((r: SerialNumberRecord) => r.status === SerialStatus.COMPLETED).length;

  const yieldRate = totalScanned > 0 ? ((totalScanned - scrapped) / totalScanned * 100).toFixed(1) : "100";
  const reworkRate = totalScanned > 0 ? (reworked / totalScanned * 100).toFixed(1) : "0.0";
  const scrapRate = totalScanned > 0 ? (scrapped / totalScanned * 100).toFixed(1) : "0.0";

  const stats = [
    { label: 'Plant Yield', value: `${yieldRate}%`, sub: 'First Pass Success', color: 'bg-emerald-600', icon: Icons.Flash },
    { label: 'Rework Rate', value: `${reworkRate}%`, sub: `${reworked} Units Affected`, color: 'bg-orange-500', icon: Icons.Refresh },
    { label: 'Scrap Rate', value: `${scrapRate}%`, sub: `${scrapped} Tech Rejects`, color: 'bg-red-600', icon: Icons.Trash },
    { label: 'Throughput', value: completed, sub: 'Units at Ship-Check', color: 'bg-indigo-600', icon: Icons.Execution },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 py-6 md:py-10 pb-20 px-4">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter">Plant Intelligence</h2>
          <p className="text-sm md:text-base text-slate-500 mt-2 font-medium">Real-time telemetry and KPI synchronization from 12-Station logic engine.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:space-x-4 w-full lg:w-auto">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-600 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 shadow-sm transition-all text-sm"
          >
            <option value="all">All Production Lines</option>
            {projects.filter(p => p.status === ProjectStatus.PRODUCTION).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => navigateTo('planning')}
            className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-900/20 uppercase tracking-[0.2em] text-xs"
          >
            New Line
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="group relative bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-slate-50 overflow-hidden hover:shadow-2xl transition-all duration-500">
            <div className={`absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 ${stat.color} opacity-5 rounded-bl-[3rem] md:rounded-bl-[4rem] group-hover:scale-110 transition-transform`}></div>
            <div className={`w-12 h-12 md:w-14 md:h-14 ${stat.color} rounded-xl md:rounded-[1.2rem] flex items-center justify-center text-white mb-4 md:mb-6 shadow-2xl group-hover:-translate-y-1 transition-transform`}>
              <stat.icon className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1 md:mb-2">{stat.label}</p>
            <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">{stat.value}</p>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-10 gap-4">
            <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
              <Icons.Execution className="w-6 h-6 mr-3 text-indigo-500" />
              Live Production Stream
            </h3>
            <span className="w-fit bg-emerald-50 text-emerald-600 text-[9px] md:text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">Sync Active</span>
          </div>
          <div className="space-y-3 md:space-y-4">
            {filteredRecords.slice(-8).reverse().map((record: SerialNumberRecord, idx: number) => {
              const project = projects.find((p: any) => p.id === record.projectId);
              const lastHistory = record.history[record.history.length - 1];
              return (
                <div key={idx} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-2xl transition-all gap-4">
                  <div className="flex items-center space-x-4 md:space-x-5">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-white shadow-lg shrink-0 ${record.scrapFlag ? 'bg-red-600' : 'bg-slate-900'}`}>
                      {record.sn.substring(0, 1)}
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-black text-slate-800 tracking-tighter uppercase">{record.sn}</p>
                      <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{project?.name || 'Project Delta'}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                    <span className={`px-4 md:px-5 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-sm inline-block ${record.status === SerialStatus.FAILED ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                      {record.status === SerialStatus.FAILED ? 'REJECTED' : 'PASSED'} {project?.stages.find(s => s.id === lastHistory?.stageId)?.name || 'STATION'}
                    </span>
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 mt-2 uppercase tracking-tighter italic">{new Date(record.updatedTimestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
            {filteredRecords.length === 0 && (
              <div className="text-center py-12 md:py-20 bg-slate-50 rounded-[2rem] md:rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <Icons.Traceability className="w-12 h-12 md:w-16 md:h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] px-4">System Ready. Waiting for First Scan.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5 rotate-12 group-hover:scale-110 transition-transform hidden md:block">
              <Icons.AIPilot className="w-32 h-32 md:w-48 md:h-48" />
            </div>
            <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6 uppercase tracking-tight">System Status</h3>
            <div className="space-y-4 md:space-y-6 relative z-10">
              <div className="p-4 md:p-6 bg-white/5 rounded-xl md:rounded-[1.5rem] border border-white/10">
                <div className="flex justify-between text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-3 md:mb-4 text-indigo-400">
                  <span>Core Logic Health</span>
                  <span>99.9%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 md:h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[99.9%]"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="p-4 md:p-5 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 text-center">
                  <div className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Lines</div>
                  <div className="text-xl md:text-2xl font-black font-mono">{projects.filter(p => p.status === ProjectStatus.PRODUCTION).length}</div>
                </div>
                <div className="p-4 md:p-5 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 text-center">
                  <div className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Queue Size</div>
                  <div className="text-xl md:text-2xl font-black font-mono">{records.filter(r => r.status === SerialStatus.IN_PROCESS).length}</div>
                </div>
              </div>
            </div>
            <button className="w-full mt-8 md:mt-10 py-4 md:py-5 bg-white text-slate-900 rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-500 hover:text-white transition-all text-[10px] md:text-xs">Export Protocol Report</button>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-100">
            <h3 className="text-base md:text-lg font-black text-slate-900 mb-6 md:mb-8 uppercase tracking-tight flex items-center">
              <Icons.Settings className="w-5 h-5 mr-3 text-indigo-500" />
              Workflow Backlog
            </h3>
            <div className="space-y-3 md:space-y-4">
              {projects.filter((p: any) => p.status === ProjectStatus.DRAFT).map((project: any) => (
                <div key={project.id} className="group p-4 md:p-6 bg-slate-50 rounded-xl md:rounded-[1.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all cursor-pointer" onClick={() => navigateTo('planning', project.id)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-slate-800 tracking-tight uppercase text-sm md:text-base">{project.name}</p>
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{project.stages.length} Station Sequence</p>
                    </div>
                    <Icons.ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-200 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
              ))}
              {projects.filter((p: any) => p.status === ProjectStatus.DRAFT).length === 0 && (
                <div className="text-center py-8 md:py-10 opacity-30 italic font-bold text-[10px] md:text-xs uppercase tracking-widest">No Draft Cycles Active</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
