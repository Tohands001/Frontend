
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
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Plant Intelligence</h2>
          <p className="text-slate-500 mt-2 font-medium">Real-time telemetry and KPI synchronization from 12-Station logic engine.</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-600 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 shadow-sm transition-all"
          >
            <option value="all">All Production Lines</option>
            {projects.filter(p => p.status === ProjectStatus.PRODUCTION).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => navigateTo('planning')}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-900/20 uppercase tracking-[0.2em]"
          >
            New Line
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="group relative bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 overflow-hidden hover:shadow-2xl transition-all duration-500">
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color} opacity-5 rounded-bl-[4rem] group-hover:scale-110 transition-transform`}></div>
            <div className={`w-14 h-14 ${stat.color} rounded-[1.2rem] flex items-center justify-center text-white mb-6 shadow-2xl group-hover:-translate-y-1 transition-transform`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tight mb-2">{stat.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
              <Icons.Execution className="w-6 h-6 mr-3 text-indigo-500" />
              Live Production Stream
            </h3>
            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">Sync Active</span>
          </div>
          <div className="space-y-4">
            {filteredRecords.slice(-8).reverse().map((record: SerialNumberRecord, idx: number) => {
              const project = projects.find((p: any) => p.id === record.projectId);
              const lastHistory = record.history[record.history.length - 1];
              return (
                <div key={idx} className="group flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-2xl transition-all">
                  <div className="flex items-center space-x-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg ${record.scrapFlag ? 'bg-red-600' : 'bg-slate-900'}`}>
                      {record.sn.substring(0, 1)}
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-800 tracking-tighter uppercase">{record.sn}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{project?.name || 'Project Delta'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${record.status === SerialStatus.FAILED ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                      {record.status === SerialStatus.FAILED ? 'REJECTED AT' : 'PASSED'} {project?.stages.find(s => s.id === lastHistory?.stageId)?.name || 'STATION'}
                    </span>
                    <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-tighter italic">{new Date(record.updatedTimestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
            {filteredRecords.length === 0 && (
              <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <Icons.Traceability className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">System Ready. Waiting for First Scan.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 group-hover:scale-110 transition-transform">
              <Icons.AIPilot className="w-48 h-48" />
            </div>
            <h3 className="text-2xl font-black mb-6 uppercase tracking-tight">System Status</h3>
            <div className="space-y-6 relative z-10">
              <div className="p-6 bg-white/5 rounded-[1.5rem] border border-white/10">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-indigo-400">
                  <span>Core Logic Health</span>
                  <span>99.9%</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[99.9%]"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Lines</div>
                  <div className="text-2xl font-black font-mono">{projects.filter(p => p.status === ProjectStatus.PRODUCTION).length}</div>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Queue Size</div>
                  <div className="text-2xl font-black font-mono">{records.filter(r => r.status === SerialStatus.IN_PROCESS).length}</div>
                </div>
              </div>
            </div>
            <button className="w-full mt-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-500 hover:text-white transition-all">Export Protocol Report</button>
          </div>

          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-8 uppercase tracking-tight flex items-center">
              <Icons.Settings className="w-5 h-5 mr-3 text-indigo-500" />
              Workflow Backlog
            </h3>
            <div className="space-y-4">
              {projects.filter((p: any) => p.status === ProjectStatus.DRAFT).map((project: any) => (
                <div key={project.id} className="group p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all cursor-pointer" onClick={() => navigateTo('planning', project.id)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-slate-800 tracking-tight uppercase">{project.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{project.stages.length} Station Sequence</p>
                    </div>
                    <Icons.ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
              ))}
              {projects.filter((p: any) => p.status === ProjectStatus.DRAFT).length === 0 && (
                <div className="text-center py-10 opacity-30 italic font-bold text-xs uppercase tracking-widest">No Draft Cycles Active</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
