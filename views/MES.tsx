
import React, { useState } from 'react';
import { Project, Stage, FieldType, ProjectStatus, UserRole, SerialType, SerialStatus } from '../types';
import { Icons } from '../constants';

const MES: React.FC<{
  store: any;
  navigateTo: any;
  initialProjectId?: string | null;
  initialStageId?: string | null;
  isIsolated?: boolean;
}> = ({ store, navigateTo, initialProjectId, initialStageId, isIsolated }) => {
  const { projects, records, submitStageData, currentUser, createSerial, mergeSerials } = store;

  // Initialize with deep-linked project/stage if in isolated mode
  const [selectedProject, setSelectedProject] = useState<Project | null>(() => {
    if (initialProjectId) return projects.find((p: any) => p.id === initialProjectId) || null;
    return null;
  });
  const [selectedStage, setSelectedStage] = useState<Stage | null>(() => {
    if (selectedProject && initialStageId) {
      return selectedProject.stages.find((s: any) => s.id === initialStageId) || null;
    }
    return null;
  });

  const [snInput, setSnInput] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isStageLoggedIn, setIsStageLoggedIn] = useState(() => {
    if (selectedStage) return !selectedStage.requiresLogin;
    return false;
  });
  const [stageLoginData, setStageLoginData] = useState({ user: '', pass: '' });

  const activeProjects = projects.filter((p: Project) =>
    (p.status === ProjectStatus.PRODUCTION || p.status === ProjectStatus.DEVELOPMENT) &&
    (currentUser.role === UserRole.ADMIN || currentUser.projectsAccess?.includes('*') || currentUser.projectsAccess?.includes(p.id)) &&
    (currentUser.role !== UserRole.USER || p.stages.some((s: Stage) => s.assignedUserIds.includes(currentUser.id)))
  );

  const handleSnSubmit = () => {
    if (!selectedProject || !selectedStage) return;

    const mainSnField = selectedStage.fields.find(f => f.type === FieldType.SERIAL_NUMBER);
    if (mainSnField) {
      const format = selectedProject.snFormats[mainSnField.label] || '^[A-Z0-9]{5,}$';
      const regex = new RegExp(format);
      if (!regex.test(snInput)) {
        setError(`Invalid Serial Number format. Expected pattern: ${format}`);
        return;
      }
    }

    let record = records.find((r: any) => r.sn === snInput);

    if (!record) {
      if (selectedProject.stages[0].id !== selectedStage.id) {
        setError(`UNREGISTERED SERIAL: New units must start at ${selectedProject.stages[0].name}`);
        return;
      }

      const type = selectedProject.id.includes('sub') ? SerialType.SUB : SerialType.MAIN;
      const res = createSerial(snInput, selectedProject.id, type);
      if (!res.success) {
        setError(res.message);
        return;
      }
      record = records.find((r: any) => r.sn === snInput);
    }

    if (record?.scrapFlag) {
      setError("UNIT SCRAPPED: Action prohibited and logged.");
      return;
    }

    if (record?.currentStageId !== selectedStage.id) {
      const isReworkPath = selectedStage.isReworkStation && record?.status === SerialStatus.FAILED;
      if (!isReworkPath) {
        const targetStage = selectedProject.stages.find(s => s.id === record?.currentStageId);
        setError(`SEQUENCE VIOLATION: Unit current station is ${targetStage?.name || 'Unknown'}`);
        return;
      }
    }

    setError(null);
    setSuccess(`Verified: ${record?.sn} (${record?.status}). Ready for ${selectedStage.name}.`);
  };

  const handleFinalSubmit = (status: 'PASSED' | 'FAILED') => {
    if (!selectedProject || !selectedStage || !snInput) return;

    const missingFields = selectedStage.fields.filter(f => f.required && !formData[f.id] && f.type !== FieldType.SERIAL_NUMBER);
    if (missingFields.length > 0) {
      setError(`Mandatory data missing: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    if (status === 'FAILED' && !formData.remark) {
      setError("REJECT REASON REQUIRED: Defect explanation is mandatory.");
      return;
    }

    if (selectedStage.isMergeStation && status === 'PASSED') {
      const subSnField = selectedStage.fields.find(f => f.type === FieldType.SUB_SERIAL_NUMBER);
      if (subSnField) {
        const subSn = formData[subSnField.id];
        const mergeRes = mergeSerials(snInput, subSn);
        if (!mergeRes.success) {
          setError(`MERGE FAILED: ${mergeRes.message}`);
          return;
        }
      }
    }

    const res = submitStageData(selectedProject.id, snInput, selectedStage.id, formData, status, formData.remark);
    if (!res.success) {
      setError(res.message);
      return;
    }

    setSuccess(`Transaction Logged: Marked as ${status}. Moving to next queue.`);
    setSnInput('');
    setFormData({});
    setError(null);

    setTimeout(() => setSuccess(null), 3000);
  };

  const handleStageLogin = () => {
    if (stageLoginData.user === currentUser.username && stageLoginData.pass === '123') {
      setIsStageLoggedIn(true);
      setError(null);
    } else {
      setError("Invalid stage authentication.");
    }
  };

  const openStationInTab = (pId: string, sId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?projectId=${pId}&stageId=${sId}`;
    window.open(url, '_blank');
  };

  if (!selectedProject || !selectedStage) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 py-6 md:py-10 px-4">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">Factory Terminal</h2>
          <p className="text-slate-500 mt-2 font-medium italic text-sm md:text-base">Production Hierarchy Management</p>
        </div>

        {/* Project Selection Dropdown */}
        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl max-w-2xl mx-auto">
          <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Select Operations Line</label>
          <select
            className="w-full px-4 md:px-8 py-4 md:py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] md:rounded-[1.5rem] text-lg md:text-xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm"
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const p = activeProjects.find((proj: any) => proj.id === e.target.value);
              setSelectedProject(p || null);
            }}
          >
            <option value="">- Choose Active Project -</option>
            {activeProjects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
            ))}
          </select>
        </div>

        {/* Compact Scrollable Stage Layout */}
        {selectedProject && (
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px] sm:max-w-none">{selectedProject.name}</h3>
                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{selectedProject.stages.length} Configured Stations</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
                <Icons.Settings className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>

            <div className="max-h-[350px] md:max-h-[400px] overflow-y-auto p-4 md:p-8 space-y-2 md:space-y-3 custom-scrollbar">
              {selectedProject.stages
                .filter((s: Stage) => currentUser.role !== UserRole.USER || s.assignedUserIds.includes(currentUser.id))
                .map((s: any, idx: number) => (
                  <button
                    key={s.id}
                    onClick={() => openStationInTab(selectedProject.id, s.id)}
                    className={`w-full p-4 md:p-5 rounded-2xl flex items-center group transition-all border ${s.isReworkStation
                      ? 'border-orange-100 hover:border-orange-300 hover:bg-orange-50'
                      : 'border-slate-50 hover:border-indigo-100 hover:bg-indigo-50'
                      }`}
                  >
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center mr-3 md:mr-4 font-black text-xs md:text-sm shrink-0 ${s.isReworkStation ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all'
                      }`}>
                      {idx + 1}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className={`text-xs md:text-sm font-black uppercase tracking-tight truncate ${s.isReworkStation ? 'text-orange-900' : 'text-slate-700'}`}>{s.name}</div>
                      {s.isMergeStation && <div className="text-[8px] md:text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">Merge Point Linked</div>}
                    </div>
                    <div className="flex items-center space-x-1 md:space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all sm:-translate-x-2 sm:group-hover:translate-x-0 shrink-0">
                      <span className="text-[8px] md:text-[10px] font-black text-indigo-500 uppercase hidden sm:inline">Open Tab</span>
                      <Icons.ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-indigo-400" />
                    </div>
                  </button>
                ))}
            </div>

            <div className="p-4 md:p-6 bg-indigo-50 text-indigo-700 text-center text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">
              Multi-Tab Terminal Environment Enabled
            </div>
          </div>
        )}

        <div className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 flex flex-col sm:flex-row items-center justify-between shadow-2xl text-white max-w-4xl mx-auto overflow-hidden relative group gap-6">
          <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 group-hover:scale-110 transition-transform pointer-events-none">
            <Icons.AIPilot className="w-32 h-32 md:w-48 md:h-48" />
          </div>
          <div className="flex items-center space-x-4 md:space-x-6 relative z-10 w-full sm:w-auto">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-2xl md:rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl shrink-0">
              <Icons.UserControl className="w-6 h-6 md:w-8 md:h-8 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Authenticated Operator</p>
              <h4 className="font-black text-lg md:text-2xl tracking-tighter uppercase truncate">{currentUser.fullName}</h4>
            </div>
          </div>
          <div className="text-center sm:text-right relative z-10 w-full sm:w-auto border-t sm:border-t-0 border-white/10 pt-4 sm:pt-0">
            <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">State Engine</p>
            <h4 className="font-mono text-indigo-400 font-bold text-sm md:text-base">10-Module Controller v5.1</h4>
          </div>
        </div>
      </div>
    );
  }

  const currentRecord = records.find(r => r.sn === snInput);

  return (
    <div className={`max-w-4xl mx-auto pb-10 md:pb-20 px-4 ${isIsolated ? 'mt-0' : 'mt-0'}`}>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 md:mb-12 gap-6">
        <div className="flex items-center space-x-3 md:space-x-5">
          {!isIsolated && (
            <button onClick={() => { setSelectedStage(null); setSelectedProject(null); setSnInput(''); setSuccess(null); setError(null); }} className="p-3 md:p-4 bg-white border-2 border-slate-100 rounded-2xl md:rounded-3xl hover:bg-slate-50 shadow-xl transition-all active:scale-95 group shrink-0">
              <Icons.ChevronRight className="w-5 h-5 md:w-6 md:h-6 rotate-180 text-slate-400 group-hover:text-indigo-600" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter truncate">{selectedStage.name}</h2>
              {selectedStage.isReworkStation && <span className="bg-orange-100 text-orange-700 text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full tracking-widest uppercase shadow-sm shrink-0">Rework Node</span>}
            </div>
            <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest mt-1 truncate">Line Segment: {selectedProject.name}</p>
          </div>
        </div>
        <div className={`w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-xs shadow-2xl uppercase tracking-[0.2em] relative overflow-hidden group text-center ${selectedStage.isReworkStation ? 'bg-orange-600 text-white' : 'bg-slate-900 text-white'}`}>
          <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
          <span className="relative z-10">Terminal Active</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:gap-10">
        {!isStageLoggedIn ? (
          <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl shadow-indigo-100 border border-slate-50 p-8 md:p-20 text-center animate-in zoom-in duration-700 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-48 h-48 md:w-64 h-64 opacity-5 -translate-y-12 translate-x-12 rounded-full ${selectedStage.isReworkStation ? 'bg-orange-600' : 'bg-indigo-600'}`}></div>
            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-[1.8rem] md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-10 text-slate-900 rotate-12 shadow-inner scale-75 md:scale-100">
              <Icons.Lock className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <h3 className="text-2xl md:text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">Security Interlock</h3>
            <p className="text-slate-400 font-bold mb-8 md:mb-14 max-w-sm mx-auto leading-relaxed uppercase text-[8px] md:text-[10px] tracking-widest px-4">Identity verification mandatory for station access. Forensic logging is active.</p>

            <div className="max-w-xs mx-auto space-y-4 md:space-y-5">
              <div className="relative">
                <Icons.UserControl className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                <input
                  type="text"
                  placeholder="Username Token"
                  value={stageLoginData.user}
                  onChange={(e) => setStageLoginData({ ...stageLoginData, user: e.target.value })}
                  className="w-full pl-12 md:pl-16 pr-5 md:pr-6 py-4 md:py-5 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-black uppercase text-xs md:text-sm tracking-widest"
                />
              </div>
              <div className="relative">
                <Icons.Lock className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                <input
                  type="password"
                  placeholder="Station ID Pin"
                  value={stageLoginData.pass}
                  onChange={(e) => setStageLoginData({ ...stageLoginData, pass: e.target.value })}
                  className="w-full pl-12 md:pl-16 pr-5 md:pr-6 py-4 md:py-5 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-black text-xs md:text-sm tracking-widest"
                />
              </div>
              <button
                onClick={handleStageLogin}
                className="w-full bg-slate-900 text-white py-5 md:py-6 rounded-xl md:rounded-2xl font-black hover:bg-indigo-600 transition shadow-2xl shadow-indigo-900/40 uppercase tracking-[0.2em] active:scale-95 text-xs md:text-sm"
              >
                Sign Off Station
              </button>
              {error && <p className="text-red-500 text-[9px] md:text-[10px] font-black mt-4 md:mt-6 uppercase tracking-widest flex items-center justify-center italic bg-red-50 py-3 rounded-xl border border-red-100">{error}</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-50 p-6 md:p-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
                <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Material Telemetry Sync</label>
                {currentRecord && (
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-[8px] md:text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter shadow-sm ${currentRecord.status === SerialStatus.FAILED ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>Current: {currentRecord.status}</span>
                    <span className="text-[8px] md:text-[9px] font-black px-3 py-1.5 rounded-full bg-slate-50 text-slate-500 uppercase tracking-tighter shadow-sm">Rework Cycles: {currentRecord.reworkCount}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  value={snInput}
                  autoFocus
                  onChange={(e) => setSnInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSnSubmit()}
                  placeholder="Scan Carrier / Component Serial..."
                  className="w-full px-6 md:px-10 py-4 md:py-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-[2rem] text-xl md:text-3xl font-mono font-black focus:outline-none focus:ring-4 md:focus:ring-8 focus:ring-indigo-50 focus:border-indigo-400 transition-all placeholder:text-slate-200"
                />
                <button
                  onClick={handleSnSubmit}
                  className="w-full px-8 md:px-14 py-4 md:py-6 bg-slate-900 text-white font-black rounded-2xl md:rounded-[2rem] hover:bg-indigo-600 transition shadow-2xl shadow-indigo-900/20 uppercase tracking-[0.2em] group active:scale-95 text-sm md:text-base"
                >
                  Verify <Icons.Flash className="inline w-4 h-4 md:w-5 md:h-5 ml-2 group-hover:scale-125 transition-transform" />
                </button>
              </div>
              {error && <div className="mt-6 md:mt-8 text-red-600 font-black text-[10px] md:text-xs flex items-center bg-red-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-red-100 animate-in slide-in-from-top-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-red-600 rounded-xl md:rounded-2xl flex items-center justify-center mr-4 md:mr-5 text-white shadow-xl shadow-red-600/30 flex-shrink-0">
                  <Icons.Execution className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div className="uppercase tracking-tight leading-tight">{error}</div>
              </div>}
              {success && <div className="mt-6 md:mt-8 text-emerald-700 font-black text-[10px] md:text-xs flex items-center bg-emerald-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-emerald-100 animate-in slide-in-from-top-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mr-4 md:mr-5 text-white shadow-xl shadow-emerald-600/30 flex-shrink-0">
                  <Icons.MES className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div className="uppercase tracking-tight leading-tight">{success}</div>
              </div>}
            </div>

            <div className={`bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-50 p-6 md:p-12 transition-all duration-700 overflow-hidden relative ${!success ? 'opacity-30 pointer-events-none blur-sm grayscale border-slate-200' : 'opacity-100'}`}>
              {!success && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
                  <div className="bg-white/90 backdrop-blur-md px-6 md:px-10 py-3 md:py-5 rounded-full border-2 border-slate-100 font-black text-[8px] md:text-xs text-slate-400 uppercase tracking-[0.2em] shadow-2xl">Awaiting Logic Synchronization</div>
                </div>
              )}
              <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 md:mb-12">Production Quality Assurance Integrity Checks</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {selectedStage.fields.filter(f => f.type !== FieldType.SERIAL_NUMBER).map((field) => (
                  <div key={field.id} className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-end border-b-2 border-slate-50 pb-4 md:pb-5">
                      <div className="min-w-0">
                        <h4 className="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase truncate">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1 font-black text-xl md:text-2xl leading-none">*</span>}
                        </h4>
                        <p className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Integrity Mandatory</p>
                      </div>
                      <span className="text-[7px] md:text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] md:tracking-[0.3em] bg-indigo-50 px-3 md:px-4 py-1 md:py-1.5 rounded-full shadow-sm shrink-0">{field.type.replace('_', ' ')}</span>
                    </div>

                    {field.type === FieldType.CHECKBOX_INSPECTION && (
                      <div className="space-y-2 md:space-y-3">
                        {field.checkpoints?.map((cp) => (
                          <div key={cp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 bg-slate-50 rounded-xl md:rounded-[1.8rem] border border-slate-100 group hover:bg-white hover:shadow-2xl transition-all gap-3">
                            <span className="font-black text-slate-700 text-xs md:text-sm uppercase tracking-tight">{cp.label}</span>
                            <div className="flex space-x-2 w-full sm:w-auto">
                              {['PASS', 'FAIL'].map(r => (
                                <button
                                  key={r}
                                  onClick={() => setFormData({ ...formData, [cp.id]: r })}
                                  className={`flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-[8px] md:text-[10px] transition-all uppercase tracking-widest min-h-[36px] ${formData[cp.id] === r
                                    ? (r === 'PASS' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-red-600 text-white shadow-lg')
                                    : 'bg-white text-slate-400 border border-slate-100'
                                    }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {field.type === FieldType.CAMERA && (
                      <div className="border-2 border-dashed border-slate-100 rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 text-center bg-slate-50/50 hover:bg-white hover:border-indigo-100 transition-all cursor-pointer group shadow-inner">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl group-hover:scale-110 transition-transform border border-slate-50">
                          <Icons.Camera className="w-8 h-8 md:w-10 md:h-10 text-indigo-500" />
                        </div>
                        <p className="text-base md:text-lg font-black text-slate-900 mb-1 md:text-2xl uppercase tracking-tight italic">Evidence Capture</p>
                        <p className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest">Digital Thread Synchronization Required</p>
                        <button className="mt-6 md:mt-8 bg-slate-900 text-white px-8 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black shadow-2xl hover:bg-indigo-600 transition-all uppercase tracking-[0.2em]">Launch Sensor</button>
                      </div>
                    )}

                    {field.type === FieldType.SUB_SERIAL_NUMBER && (
                      <div className="relative">
                        <div className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-slate-300">
                          <Icons.Traceability className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <input
                          type="text"
                          onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value.toUpperCase() })}
                          placeholder={`Link ${field.label}...`}
                          className="w-full pl-12 md:pl-16 pr-5 md:pr-6 py-4 md:py-6 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-[1.8rem] text-lg md:text-xl font-mono font-black focus:outline-none focus:ring-4 md:focus:ring-8 focus:ring-indigo-50 focus:border-indigo-400 transition-all uppercase"
                        />
                      </div>
                    )}

                    {field.type === FieldType.DATE && (
                      <input
                        type="datetime-local"
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        className="w-full px-6 md:px-8 py-4 md:py-6 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-[1.8rem] text-sm md:text-xl font-black focus:outline-none focus:ring-4 md:focus:ring-8 focus:ring-indigo-50 focus:border-indigo-400 transition-all text-slate-600"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-12 md:mt-20 p-6 md:p-10 bg-red-50/50 rounded-2xl md:rounded-[3rem] border-2 border-red-100/50">
                <label className="block text-[8px] md:text-[10px] font-black text-red-700 mb-4 md:mb-6 uppercase tracking-[0.3em]">Forensic Defect Description / Reject Intent</label>
                <textarea
                  value={formData.remark || ''}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="In case of failure, provide exhaustive root cause analysis for the audit log..."
                  className="w-full px-6 md:px-8 py-4 md:py-6 bg-white border-2 border-red-100 rounded-xl md:rounded-[2rem] text-slate-900 font-bold focus:outline-none focus:ring-4 md:focus:ring-8 focus:ring-red-100/30 focus:border-red-400 placeholder:text-red-200 resize-none text-sm md:text-base"
                  rows={4}
                />
              </div>

              <div className="mt-12 md:mt-24 flex flex-col md:flex-row gap-4 md:gap-8 border-t-2 border-slate-50 pt-10 md:pt-20">
                <button
                  onClick={() => handleFinalSubmit('FAILED')}
                  className="w-full md:flex-[1] py-4 md:py-8 border-2 md:border-4 border-red-600 text-red-600 rounded-[1.5rem] md:rounded-[2.5rem] font-black hover:bg-red-600 hover:text-white transition-all shadow-2xl shadow-red-600/10 uppercase tracking-[0.2em] md:tracking-[0.3em] text-xs md:text-sm active:scale-95 group min-h-[60px] md:min-h-0"
                >
                  Reject Unit
                </button>
                <button
                  onClick={() => handleFinalSubmit('PASSED')}
                  className="w-full md:flex-[2] py-4 md:py-8 bg-slate-900 text-white rounded-[1.5rem] md:rounded-[2.5rem] font-black hover:bg-emerald-600 transition-all shadow-2xl shadow-indigo-900/50 text-xl md:text-2xl uppercase tracking-[0.2em] md:tracking-[0.3em] active:scale-95 group overflow-hidden relative min-h-[60px] md:min-h-0"
                >
                  <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                  <span className="relative z-10">Commit Success</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MES;
