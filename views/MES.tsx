
import React, { useState } from 'react';
import { Project, Stage, FieldType, ProjectStatus, UserRole, SerialType, SerialStatus, ToleranceSpec, PartSyncRule, ResultAction } from '../types';
import { Icons } from '../constants';

const MES: React.FC<{
  store: any; navigateTo: any;
  initialProjectId?: string | null; initialStageId?: string | null; isIsolated?: boolean;
}> = ({ store, navigateTo, initialProjectId, initialStageId, isIsolated }) => {
  const { projects, records, submitStageData, currentUser, createSerial, mergeSerials, validatePartSync, linkPart, validateTolerances, adminOverrideHold, aggregateMasterCarton, documentAuditMatch } = store;

  const [selectedProject, setSelectedProject] = useState<Project | null>(() => {
    if (initialProjectId) return projects.find((p: any) => p.id === initialProjectId) || null;
    return null;
  });
  const [selectedStage, setSelectedStage] = useState<Stage | null>(() => {
    if (selectedProject && initialStageId) return selectedProject.stages.find((s: any) => s.id === initialStageId) || null;
    return null;
  });

  const [snInput, setSnInput] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isStageLoggedIn, setIsStageLoggedIn] = useState(() => selectedStage ? !selectedStage.requiresLogin : false);
  const [stageLoginData, setStageLoginData] = useState({ user: '', pass: '' });
  const [toleranceValues, setToleranceValues] = useState<Record<string, number>>({});
  const [partSyncValues, setPartSyncValues] = useState<Record<string, string>>({});
  const [partSyncStatus, setPartSyncStatus] = useState<Record<string, { valid: boolean; msg: string }>>({});
  const [cartonDeviceIds, setCartonDeviceIds] = useState<string[]>([]);
  const [cartonScanInput, setCartonScanInput] = useState('');
  const [auditScannedIds, setAuditScannedIds] = useState<string[]>([]);
  const [auditScanInput, setAuditScanInput] = useState('');
  const [auditResults, setAuditResults] = useState<Record<string, boolean>>({});
  const [deviceIdInput, setDeviceIdInput] = useState('');

  const activeProjects = projects.filter((p: Project) =>
    (p.status === ProjectStatus.PRODUCTION || p.status === ProjectStatus.DEVELOPMENT) &&
    (currentUser.role === UserRole.ADMIN || currentUser.projectsAccess?.includes('*') || currentUser.projectsAccess?.includes(p.id)) &&
    (currentUser.role !== UserRole.USER || p.stages.some((s: Stage) => s.assignedUserIds.includes(currentUser.id)))
  );

  const handleSnSubmit = () => {
    if (!selectedProject || !selectedStage) return;
    const mainSnField = selectedStage.fields.find(f => f.type === FieldType.SERIAL_NUMBER);
    if (mainSnField?.snFormatRegex) {
      const regex = new RegExp(mainSnField.snFormatRegex);
      // Allow the check to pass if it's already a registered unit (PCB SN lookup at ST-8)
      const existing = records.find(r => r.sn === snInput || r.deviceId === snInput);
      if (!existing && !regex.test(snInput)) {
        setError(`Invalid SN format. Expected: ${mainSnField.snFormatRegex}`); return;
      }
    }
    let record = records.find((r: any) => r.sn === snInput || r.deviceId === snInput);
    if (!record) {
      // Fresh entry allowed at ST-1, ST-13, ST-14, ST-11
      const freshStations = ['st-1', 'st-13', 'st-14', 'st-11'];
      if (!freshStations.includes(selectedStage.id)) {
        setError(`UNREGISTERED SERIAL: New units must start at the designated entry station.`); return;
      }
      const type = (selectedStage.id === 'st-13' || selectedStage.id === 'st-14') ? SerialType.SUB : SerialType.MAIN;
      const res = createSerial(snInput, selectedProject.id, type, undefined, selectedStage.id);
      if (!res.success) { setError(res.message); return; }
      record = res.record;
    }

    if (record?.scrapFlag) { setError("UNIT SCRAPPED: Action prohibited."); return; }
    if (record?.holdFlag) { setError("UNIT ON HOLD: Requires Admin Override."); return; }
    if (record?.status === SerialStatus.MRB_HOLD) {
      setError(`UNIT LOCKED BY MRB: Decision pending for Ticket ${record.mrbTicketId}.`); return;
    }
    if (record?.status === SerialStatus.IN_REWORK) {
      setError('UNIT IN REWORK: Currently locked at Rework Station. Complete rework before re-entry.'); return;
    }

    setError(null);
    setShowDashboard(true);
    const mrbInfo = record?.mrbRepeatCount && record.mrbRepeatCount > 0 ? ` [MRB-Repeat: ${record.mrbRepeatCount}]` : '';
    setSuccess(`Verified: ${record?.sn} (${record?.status})${mrbInfo}. Ready for ${selectedStage.name}.`);
  };

  const handlePartSyncValidate = (parentSn: string, rule: PartSyncRule, partSn: string) => {
    const res = validatePartSync(parentSn, rule.label, partSn, rule);
    setPartSyncStatus(prev => ({ ...prev, [rule.label]: { valid: res.success, msg: res.message || 'Valid' } }));
    if (res.success) linkPart(parentSn, rule.label, partSn);
    return res;
  };

  const handleFinalSubmit = (status: 'PASSED' | 'FAILED') => {
    if (!selectedProject || !selectedStage || !snInput) return;
    // Check required checkpoints
    const checklistField = selectedStage.fields.find(f => f.type === FieldType.CHECKBOX_INSPECTION);
    if (checklistField?.checkpoints) {
      const allChecked = checklistField.checkpoints.every(cp => formData[cp.id]);
      if (!allChecked && status === 'PASSED') { setError('All checkpoints must be marked before committing.'); return; }
      const anyFail = checklistField.checkpoints.some(cp => formData[cp.id] === 'FAIL');
      if (anyFail && status === 'PASSED') { setError('Cannot commit success with FAIL checkpoints. Reject the unit.'); return; }
    }
    // Check tolerance auto-result for ST-1
    const toleranceField = selectedStage.fields.find(f => f.type === FieldType.NUMERIC_TOLERANCE);
    if (toleranceField?.toleranceSpecs && status === 'PASSED') {
      const { allPass } = validateTolerances(toleranceValues, toleranceField.toleranceSpecs);
      if (!allPass) { setError('Tolerance values out of range. Auto-result: FAIL. Reject the unit.'); return; }
    }
    if (status === 'FAILED' && !formData.remark) { setError("REJECT REASON REQUIRED: Failure description is mandatory."); return; }

    const allData = { ...formData, toleranceValues, partSyncValues, cartonDeviceIds, auditScannedIds, deviceIdInput };
    const res = submitStageData(selectedProject.id, snInput, selectedStage.id, allData, status, formData.remark);
    if (!res.success) { setError(res.message); return; }

    const holdMsg = res.holdTriggered ? ' ⚠️ UNIT PLACED ON HOLD.' : '';
    setSuccess(`Transaction Logged: ${status}.${holdMsg} Moving to next queue.`);
    setSnInput(''); setFormData({}); setToleranceValues({}); setPartSyncValues({}); setPartSyncStatus({});
    setCartonDeviceIds([]); setAuditScannedIds([]); setDeviceIdInput(''); setError(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleStageLogin = () => {
    if (stageLoginData.user === currentUser.username && stageLoginData.pass === '123') {
      setIsStageLoggedIn(true); setError(null);
    } else { setError("Invalid stage authentication."); }
  };

  const openStationInTab = (pId: string, sId: string) => {
    window.open(`${window.location.origin}${window.location.pathname}?projectId=${pId}&stageId=${sId}`, '_blank');
  };

  const currentRecord = records.find(r => r.sn === snInput || r.deviceId === snInput);

  // ─── PROJECT/STAGE SELECTOR SCREEN ─────────────────────────────────
  if (!selectedProject || !selectedStage) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 py-6 md:py-10 px-4">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">Factory Terminal</h2>
          <p className="text-slate-500 mt-2 font-medium italic text-sm md:text-base">14-Station Production Control</p>
        </div>
        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl max-w-2xl mx-auto">
          <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Select Operations Line</label>
          <select className="w-full px-4 md:px-8 py-4 md:py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] md:rounded-[1.5rem] text-lg md:text-xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm"
            value={selectedProject?.id || ''} onChange={(e) => { setSelectedProject(activeProjects.find((p: any) => p.id === e.target.value) || null); }}>
            <option value="">- Choose Active Project -</option>
            {activeProjects.map((p: any) => (<option key={p.id} value={p.id}>{p.name} (v{p.version})</option>))}
          </select>
        </div>
        {selectedProject && (
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div><h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px] sm:max-w-none">{selectedProject.name}</h3>
                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{selectedProject.stages.length} Configured Stations</p></div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0"><Icons.Settings className="w-4 h-4 md:w-5 md:h-5" /></div>
            </div>
            <div className="max-h-[350px] md:max-h-[500px] overflow-y-auto p-4 md:p-8 space-y-2 md:space-y-3">
              {selectedProject.stages.filter((s: Stage) => currentUser.role !== UserRole.USER || s.assignedUserIds.includes(currentUser.id)).map((s: any, idx: number) => (
                <button key={s.id} onClick={() => openStationInTab(selectedProject.id, s.id)}
                  className={`w-full p-4 md:p-5 rounded-2xl flex items-center group transition-all border ${s.isSemiDependent ? 'border-amber-100 hover:border-amber-300 hover:bg-amber-50' : s.holdOnFail ? 'border-red-100 hover:border-red-300 hover:bg-red-50' : 'border-slate-50 hover:border-indigo-100 hover:bg-indigo-50'}`}>
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center mr-3 md:mr-4 font-black text-xs md:text-sm shrink-0 ${s.isSemiDependent ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : s.holdOnFail ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all'}`}>
                    {s.order + 1}</div>
                  <div className="text-left flex-1 min-w-0">
                    <div className={`text-xs md:text-sm font-black uppercase tracking-tight truncate ${s.isSemiDependent ? 'text-amber-900' : s.holdOnFail ? 'text-red-900' : 'text-slate-700'}`}>{s.name}</div>
                    {s.isSemiDependent && <div className="text-[8px] md:text-[9px] font-bold text-amber-500 uppercase tracking-tighter">Sub-Assembly → Feeds {s.feedsIntoStageId}</div>}
                    {s.holdOnFail && <div className="text-[8px] md:text-[9px] font-bold text-red-500 uppercase tracking-tighter">Hold on Fail</div>}
                  </div>
                  <div className="flex items-center space-x-1 md:space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0">
                    <span className="text-[8px] md:text-[10px] font-black text-indigo-500 uppercase hidden sm:inline">Open Tab</span>
                    <Icons.ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-indigo-400" />
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 md:p-6 bg-indigo-50 text-indigo-700 text-center text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Multi-Tab Terminal Environment Enabled</div>
          </div>
        )}
        <div className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 flex flex-col sm:flex-row items-center justify-between shadow-2xl text-white max-w-4xl mx-auto overflow-hidden relative group gap-6">
          <div className="flex items-center space-x-4 md:space-x-6 relative z-10 w-full sm:w-auto">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-2xl md:rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl shrink-0"><Icons.UserControl className="w-6 h-6 md:w-8 md:h-8 text-indigo-400" /></div>
            <div className="min-w-0"><p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Authenticated Operator</p>
              <h4 className="font-black text-lg md:text-2xl tracking-tighter uppercase truncate">{currentUser.fullName}</h4></div>
          </div>
          <div className="text-center sm:text-right relative z-10 w-full sm:w-auto border-t sm:border-t-0 border-white/10 pt-4 sm:pt-0">
            <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Production Engine</p>
            <h4 className="font-mono text-indigo-400 font-bold text-sm md:text-base">14-Station SOP v1.0</h4>
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE STATION TERMINAL ───────────────────────────────────────
  return (
    <div className={`max-w-4xl mx-auto pb-10 md:pb-20 px-4`}>
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
              {selectedStage.holdOnFail && <span className="bg-red-100 text-red-700 text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full tracking-widest uppercase shadow-sm shrink-0">Hold Station</span>}
              {selectedStage.isSemiDependent && <span className="bg-amber-100 text-amber-700 text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full tracking-widest uppercase shadow-sm shrink-0">Sub-Assembly</span>}
            </div>
            <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest mt-1 truncate">Line: {selectedProject.name}</p>
          </div>
        </div>
        <div className={`w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-xs shadow-2xl uppercase tracking-[0.2em] text-center ${selectedStage.holdOnFail ? 'bg-red-600 text-white' : selectedStage.isSemiDependent ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white'}`}>
          Terminal Active
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:gap-10">
        {!isStageLoggedIn ? (
          <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-slate-50 p-8 md:p-20 text-center relative overflow-hidden">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-[1.8rem] md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-10 shadow-inner"><Icons.Lock className="w-8 h-8 md:w-10 md:h-10 text-slate-900" /></div>
            <h3 className="text-2xl md:text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">Security Interlock</h3>
            <p className="text-slate-400 font-bold mb-8 md:mb-14 max-w-sm mx-auto uppercase text-[8px] md:text-[10px] tracking-widest px-4">Identity verification mandatory for station access.</p>
            <div className="max-w-xs mx-auto space-y-4 md:space-y-5">
              <input type="text" placeholder="Username Token" value={stageLoginData.user} onChange={(e) => setStageLoginData({ ...stageLoginData, user: e.target.value })} className="w-full px-6 py-4 md:py-5 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm tracking-widest" />
              <input type="password" placeholder="Station ID Pin" value={stageLoginData.pass} onChange={(e) => setStageLoginData({ ...stageLoginData, pass: e.target.value })} className="w-full px-6 py-4 md:py-5 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl font-black text-xs md:text-sm tracking-widest" />
              <button onClick={handleStageLogin} className="w-full bg-slate-900 text-white py-5 md:py-6 rounded-xl md:rounded-2xl font-black hover:bg-indigo-600 transition shadow-2xl uppercase tracking-[0.2em] text-xs md:text-sm">Sign Off Station</button>
              {error && <p className="text-red-500 text-[9px] md:text-[10px] font-black mt-4 uppercase tracking-widest bg-red-50 py-3 rounded-xl border border-red-100">{error}</p>}
            </div>
          </div>
        ) : (
          <>
            {/* SN ENTRY CARD */}
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-50 p-6 md:p-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
                <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Material Telemetry Sync</label>
                {currentRecord && (
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-[8px] md:text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter shadow-sm ${currentRecord.status === SerialStatus.FAILED ? 'bg-red-50 text-red-600' : currentRecord.status === SerialStatus.ON_HOLD ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {currentRecord.status}</span>
                    <span className="text-[8px] md:text-[9px] font-black px-3 py-1.5 rounded-full bg-slate-50 text-slate-500 uppercase tracking-tighter shadow-sm">Rework: {currentRecord.reworkCount}</span>
                    {currentRecord.holdFlag && <span className="text-[8px] md:text-[9px] font-black px-3 py-1.5 rounded-full bg-red-100 text-red-600 uppercase tracking-tighter shadow-sm">⚠ ON HOLD</span>}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <input type="text" value={snInput} autoFocus onChange={(e) => setSnInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSnSubmit();
                    }
                  }}
                  placeholder="Scan Serial Number..." className="w-full px-6 md:px-10 py-4 md:py-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-[2rem] text-xl md:text-3xl font-mono font-black focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all placeholder:text-slate-200" />
                <button onClick={handleSnSubmit} className="w-full px-8 md:px-14 py-4 md:py-6 bg-slate-900 text-white font-black rounded-2xl md:rounded-[2rem] hover:bg-indigo-600 transition shadow-2xl uppercase tracking-[0.2em] text-sm md:text-base">
                  Verify <Icons.Flash className="inline w-4 h-4 md:w-5 md:h-5 ml-2" /></button>
              </div>
              {error && <div className="mt-6 text-red-600 font-black text-[10px] md:text-xs flex items-center bg-red-50 p-4 md:p-6 rounded-2xl border border-red-100">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-red-600 rounded-xl flex items-center justify-center mr-4 text-white shadow-xl shrink-0"><Icons.Execution className="w-4 h-4 md:w-6 md:h-6" /></div>
                <div className="uppercase tracking-tight leading-tight">{error}</div></div>}
              {success && <div className="mt-6 text-emerald-700 font-black text-[10px] md:text-xs flex items-center bg-emerald-50 p-4 md:p-6 rounded-2xl border border-emerald-100">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-xl flex items-center justify-center mr-4 text-white shadow-xl shrink-0"><Icons.MES className="w-4 h-4 md:w-6 md:h-6" /></div>
                <div className="uppercase tracking-tight leading-tight">{success}</div></div>}
            </div>

            {/* STATION DASHBOARD TABLE (COMPACT VERSION) */}
            {showDashboard && currentRecord && (
              <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-50 overflow-hidden animate-in fade-in slide-in-from-top-4 mb-8">
                <div className="px-6 md:px-12 py-4 md:py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <Icons.Dashboard className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                    <span className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest">Station Dashboard</span>
                  </div>
                  <button
                    onClick={() => {
                      const headers = ['Serial Number', 'Device ID', 'Status', 'Current Stage', 'Station Name', 'Station Number', 'Updated Time'];
                      const histEntry = currentRecord.history.find(h => h.stageId === selectedStage.id);
                      let stationStatus = 'Pending';
                      if (histEntry) stationStatus = histEntry.status === 'PASSED' ? 'Pass' : 'Fail';
                      else if (currentRecord.currentStageId === selectedStage.id) stationStatus = 'In Status';

                      const currentStageName = selectedProject.stages.find(s => s.id === currentRecord.currentStageId)?.name || currentRecord.currentStageId;
                      const row = [
                        currentRecord.sn,
                        currentRecord.deviceId || 'N/A',
                        stationStatus,
                        currentStageName,
                        selectedStage.name,
                        selectedStage.order + 1,
                        new Date(currentRecord.updatedTimestamp).toLocaleString()
                      ];
                      const csv = [headers, row].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
                      link.download = `Station_Sync_${currentRecord.sn}.csv`; link.click();
                    }}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] md:text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm uppercase tracking-widest"
                  >
                    <Icons.Execution className="w-3 h-3 md:w-4 md:h-4" /> Export
                  </button>
                </div>
                <div className="overflow-x-hidden">
                  <table className="w-full text-left table-fixed">
                    <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                      <tr className="border-b border-slate-100">
                        <th className="w-[20%] px-6 md:px-10 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Serial / Device ID</th>
                        <th className="w-[10%] px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="w-[15%] px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Stage</th>
                        <th className="w-[10%] px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Result</th>
                        <th className="w-[20%] px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry Time</th>
                        <th className="w-[25%] px-6 md:px-10 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-50 last:border-0 hover:bg-indigo-50/20 transition-colors">
                        <td className="px-6 md:px-10 py-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-black text-slate-900 text-[11px] md:text-sm italic tracking-tight truncate">{currentRecord.sn}</span>
                            {currentRecord.deviceId && <div className="text-[8px] text-slate-400 font-bold tracking-tighter uppercase leading-tight">DID: {currentRecord.deviceId}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {(() => {
                            const histEntry = currentRecord.history.find(h => h.stageId === selectedStage.id);
                            let statusLabel = 'Pending';
                            let statusColor = 'bg-slate-100 text-slate-500';

                            if (histEntry) {
                              statusLabel = histEntry.status === 'PASSED' ? 'Pass' : 'Fail';
                              statusColor = histEntry.status === 'PASSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
                            } else if (currentRecord.currentStageId === selectedStage.id) {
                              statusLabel = 'In Process';
                              statusColor = 'bg-blue-100 text-blue-600';
                            }

                            if (currentRecord.status === SerialStatus.IN_REWORK && (histEntry?.status === 'FAILED' || currentRecord.currentStageId === selectedStage.id)) {
                              statusLabel = 'Rework';
                              statusColor = 'bg-purple-100 text-purple-600';
                            }

                            return (
                              <span className={`px-2 py-0.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest ${statusColor} shadow-sm inline-block`}>
                                {statusLabel}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-black text-slate-700 text-[9px] md:text-[10px] uppercase truncate block" title={selectedProject.stages.find(s => s.id === currentRecord.currentStageId)?.name || currentRecord.currentStageId}>
                            {selectedProject.stages.find(s => s.id === currentRecord.currentStageId)?.name || currentRecord.currentStageId}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {(() => {
                            const histEntry = currentRecord.history.find(h => h.stageId === selectedStage.id);
                            if (!histEntry) return <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center bg-slate-100 text-slate-300"><Icons.History className="w-3 h-3" /></div>;
                            return (
                              <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center shadow-inner ${histEntry.status === 'PASSED' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                {histEntry.status === 'PASSED' ? <Icons.Check className="w-3.5 h-3.5" /> : <Icons.Alert className="w-3.5 h-3.5" />}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-slate-400 text-[10px]">
                              {new Date(currentRecord.updatedTimestamp - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[7px] font-black text-slate-300 uppercase leading-none mt-0.5">Auto-Entry</span>
                          </div>
                        </td>
                        <td className="px-6 md:px-10 py-4 text-right">
                          <span className="font-mono font-bold text-indigo-400 text-[10px]">
                            {new Date(currentRecord.updatedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}



            {/* DATA ENTRY CARD */}
            <div className={`bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-50 p-6 md:p-12 transition-all ${!success ? 'opacity-30 pointer-events-none blur-sm' : 'opacity-100'}`}>
              {!success && <div className="absolute inset-0 z-10 flex items-center justify-center"><div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full border-2 border-slate-100 font-black text-[8px] md:text-xs text-slate-400 uppercase tracking-[0.2em] shadow-2xl">Awaiting Logic Synchronization</div></div>}

              {/* TOLERANCE INPUTS (ST-1) */}
              {selectedStage.fields.filter(f => f.type === FieldType.NUMERIC_TOLERANCE).map(field => (
                <div key={field.id} className="mb-8">
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">{field.label}</label>
                  <div className="space-y-4">
                    {field.toleranceSpecs?.map((spec, idx) => {
                      const val = toleranceValues[spec.parameter];
                      const inRange = val !== undefined && val >= spec.min && val <= spec.max;
                      const hasValue = val !== undefined && String(val) !== '';
                      return (
                        <div key={spec.parameter} className={`flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 rounded-2xl border-2 transition-all ${hasValue ? (inRange ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50') : 'border-slate-100 bg-slate-50'}`}>
                          <div className="flex items-center gap-4 mb-3 md:mb-0">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">{idx + 1}</span>
                            <div className="flex flex-col">
                              <span className="font-black text-slate-700 text-xs md:text-sm uppercase tracking-tight">{spec.parameter}</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 inline-block px-2 py-0.5 rounded-md mt-1 italic">Range: {spec.min}–{spec.max} {spec.unit}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <input type="number" step="0.01" placeholder="_____"
                              onChange={(e) => setToleranceValues(prev => ({ ...prev, [spec.parameter]: parseFloat(e.target.value) }))}
                              className={`w-36 md:w-44 px-6 py-3 bg-white border border-slate-200 rounded-xl font-mono font-bold text-lg focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-center ${hasValue ? (inRange ? 'text-emerald-700 border-emerald-300' : 'text-red-700 border-red-300') : 'text-slate-600'}`} />
                            {hasValue && (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${inRange ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                {inRange ? <Icons.Check className="w-5 h-5" /> : <Icons.Plus className="w-5 h-5 rotate-45" />}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* PART SYNC INPUTS */}
              {selectedStage.fields.filter(f => f.type === FieldType.PART_SYNC).map(field => (
                <div key={field.id} className="mb-8">
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">{field.label}</label>
                  <div className="space-y-4">
                    {field.partSyncRules?.map(rule => (
                      <div key={rule.label} className={`p-4 md:p-6 rounded-2xl border-2 transition-all ${partSyncStatus[rule.label]?.valid ? 'border-emerald-200 bg-emerald-50/50' : partSyncStatus[rule.label] ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-slate-50 shadow-sm'}`}>
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${partSyncStatus[rule.label]?.valid ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              <Icons.Execution className="w-4 h-4" />
                            </div>
                            <span className="font-black text-slate-700 text-xs md:text-sm uppercase tracking-tight">{rule.label}</span>
                          </div>
                          <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${partSyncStatus[rule.label]?.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                            {partSyncStatus[rule.label]?.valid ? 'SYNCED' : rule.requireFresh ? 'FRESH REQ' : 'VALIDATION REQ'}
                          </span>
                        </div>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors">
                            <Icons.Dashboard className="w-5 h-5" />
                          </div>
                          <input type="text" placeholder={`Scan or Enter ${rule.label}...`} value={partSyncValues[rule.label] || ''}
                            onChange={(e) => setPartSyncValues(prev => ({ ...prev, [rule.label]: e.target.value.toUpperCase() }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handlePartSyncValidate(snInput, rule, partSyncValues[rule.label] || '');
                              }
                            }}
                            className={`w-full pl-12 pr-12 py-4 bg-white border-2 rounded-xl font-mono font-bold text-sm focus:outline-none focus:ring-4 transition-all uppercase ${partSyncStatus[rule.label]?.valid ? 'border-emerald-200 focus:ring-emerald-50 text-emerald-700' : 'border-slate-100 focus:ring-indigo-50 focus:border-indigo-300 text-slate-700'}`} />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {partSyncStatus[rule.label]?.valid ? (
                              <div className="bg-emerald-500 text-white rounded-full p-1 shadow-lg">
                                <Icons.Check className="w-4 h-4" />
                              </div>
                            ) : (
                              <button onClick={() => handlePartSyncValidate(snInput, rule, partSyncValues[rule.label] || '')}
                                title="Validate and Link" className="text-indigo-400 hover:text-indigo-600 transition-colors">
                                <Icons.Flash className="w-6 h-6" />
                              </button>
                            )}
                          </div>
                        </div>
                        {partSyncStatus[rule.label] && !partSyncStatus[rule.label].valid && <div className="mt-3 text-[10px] font-black tracking-tight text-red-600 flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                          {partSyncStatus[rule.label].msg}
                        </div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* DEVICE ID ENTRY (ST-7) */}
              {selectedStage.fields.filter(f => f.type === FieldType.DEVICE_ID_ENTRY).map(field => (
                <div key={field.id} className="mb-8">
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">{field.label}</label>
                  <input type="text" value={deviceIdInput} placeholder="Scan Device ID (e.g. T120R4CAK00001)"
                    onChange={(e) => setDeviceIdInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Optional: trigger a ping or sound
                      }
                    }}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-mono font-black focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 uppercase" />
                </div>
              ))}

              {/* MASTER CARTON SYNC (ST-11) */}
              {selectedStage.fields.filter(f => f.type === FieldType.MASTER_CARTON_SYNC).map(field => (
                <div key={field.id} className="mb-8">
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">{field.label} ({cartonDeviceIds.length}/{field.masterCartonSize || 20})</label>
                  <div className="flex gap-3 mb-4">
                    <input type="text" value={cartonScanInput} placeholder="Scan Device ID..." onChange={(e) => setCartonScanInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (cartonDeviceIds.length >= (field.masterCartonSize || 20)) { setError('Maximum 20 devices reached.'); return; }
                          if (cartonDeviceIds.includes(cartonScanInput)) { setError('Duplicate Device ID.'); return; }
                          setCartonDeviceIds(prev => [...prev, cartonScanInput]); setCartonScanInput(''); setError(null);
                        }
                      }}
                      className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 uppercase" />
                    <button onClick={() => {
                      if (cartonDeviceIds.length >= (field.masterCartonSize || 20)) { setError('Maximum 20 devices reached.'); return; }
                      if (cartonDeviceIds.includes(cartonScanInput)) { setError('Duplicate Device ID.'); return; }
                      setCartonDeviceIds(prev => [...prev, cartonScanInput]); setCartonScanInput(''); setError(null);
                    }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition shrink-0">Add</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {cartonDeviceIds.map((id, i) => (
                      <div key={i} className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[9px] font-mono font-black text-emerald-700 flex justify-between items-center">
                        <span>{i + 1}. {id}</span>
                        <button onClick={() => setCartonDeviceIds(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* DOCUMENT AUDIT (ST-12) */}
              {selectedStage.fields.filter(f => f.type === FieldType.DOCUMENT_AUDIT).map(field => {
                const linkedDevices = records.filter(r => r.masterCartonId === snInput).map(r => r.deviceId || r.sn);
                return (
                  <div key={field.id} className="mb-8">
                    <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">SN Matching Audit (LHS vs RHS)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-3">LHS — Expected (Auto-populated)</p>
                        <div className="space-y-1">{linkedDevices.map((id, i) => (
                          <div key={i} className={`px-3 py-2 rounded-lg text-[9px] font-mono font-black flex items-center gap-2 ${auditResults[id] === true ? 'bg-emerald-50 text-emerald-700' : auditResults[id] === false ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
                            {auditResults[id] === true ? '✓' : auditResults[id] === false ? '✗' : '○'} {i + 1}. {id}
                          </div>
                        ))}</div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-3">RHS — Scanned by Auditor</p>
                        <div className="flex gap-2 mb-3">
                          <input type="text" value={auditScanInput} placeholder="Scan..." onChange={(e) => setAuditScanInput(e.target.value.toUpperCase())}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-xs uppercase" />
                          <button onClick={() => {
                            setAuditScannedIds(prev => [...prev, auditScanInput]);
                            const match = linkedDevices.includes(auditScanInput);
                            setAuditResults(prev => ({ ...prev, [auditScanInput]: match }));
                            setAuditScanInput('');
                          }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-black text-[10px] uppercase">Scan</button>
                        </div>
                        <div className="space-y-1">{auditScannedIds.map((id, i) => (
                          <div key={i} className={`px-3 py-2 rounded-lg text-[9px] font-mono font-black ${linkedDevices.includes(id) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {linkedDevices.includes(id) ? '✓' : '✗'} {i + 1}. {id}
                          </div>
                        ))}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* CHECKBOX INSPECTION */}
              {selectedStage.fields.filter(f => f.type === FieldType.CHECKBOX_INSPECTION).map(field => (
                <div key={field.id} className="mb-8">
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">{field.label}</label>
                  <div className="space-y-2 md:space-y-3">
                    {field.checkpoints?.map((cp) => (
                      <div key={cp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all gap-3">
                        <span className="font-black text-slate-700 text-[11px] md:text-xs uppercase tracking-tight leading-tight">{cp.label}</span>
                        <div className="flex space-x-2 w-full sm:w-auto shrink-0">
                          {['PASS', 'FAIL'].map(r => (
                            <button key={r} onClick={() => setFormData({ ...formData, [cp.id]: r })}
                              className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg font-black text-[8px] md:text-[10px] transition-all uppercase tracking-widest min-h-[36px] ${formData[cp.id] === r ? (r === 'PASS' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-red-600 text-white shadow-lg') : 'bg-white text-slate-400 border border-slate-100'}`}>
                              {r}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* REJECT REASON - CONDITIONAL */}
              {(Object.values(formData).some(v => v === 'FAIL') || (Object.values(toleranceValues).length > 0 && !validateTolerances(toleranceValues, selectedStage.fields.find(f => f.type === FieldType.NUMERIC_TOLERANCE)?.toleranceSpecs || []).allPass)) && (
                <div className="mt-8 p-6 md:p-10 bg-red-50/50 rounded-2xl border-2 border-red-100/50 animate-in fade-in slide-in-from-top-4">
                  <label className="block text-[8px] md:text-[10px] font-black text-red-700 mb-4 uppercase tracking-[0.3em]">Failure Description / Reject Intent</label>
                  <textarea value={formData.remark || ''} onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                    placeholder="Mandatory for FAIL..." className="w-full px-6 py-4 bg-white border-2 border-red-100 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-red-100/30 placeholder:text-red-200 resize-none text-sm" rows={3} />
                </div>
              )}

              {/* ACTION BUTTONS */}
              {(() => {
                const getValidationErrors = () => {
                  const errors: string[] = [];

                  // 1. Check Device ID (ST-7 focus)
                  const deviceIdField = selectedStage.fields.find(f => f.type === FieldType.DEVICE_ID_ENTRY);
                  if (deviceIdField) {
                    if (!deviceIdInput) errors.push(`Missing ${deviceIdField.label}`);
                    else if (deviceIdField.deviceIdFormat && !new RegExp(deviceIdField.deviceIdFormat).test(deviceIdInput)) {
                      errors.push(`Invalid ${deviceIdField.label} Format`);
                    }
                  }

                  // 2. Check Part Sync
                  const partSyncField = selectedStage.fields.find(f => f.type === FieldType.PART_SYNC);
                  if (partSyncField?.partSyncRules) {
                    partSyncField.partSyncRules.forEach(rule => {
                      if (!partSyncStatus[rule.label]?.valid) {
                        errors.push(`Link ${rule.label}`);
                      }
                    });
                  }

                  // 3. Check Checkboxes (all must be PASS for Success)
                  const checkboxField = selectedStage.fields.find(f => f.type === FieldType.CHECKBOX_INSPECTION);
                  if (checkboxField?.checkpoints) {
                    const remaining = checkboxField.checkpoints.filter(cp => formData[cp.id] !== 'PASS').length;
                    if (remaining > 0) errors.push(`${remaining} checks remaining`);
                  }

                  // 4. Check Tolerances
                  const toleranceField = selectedStage.fields.find(f => f.type === FieldType.NUMERIC_TOLERANCE);
                  if (toleranceField?.toleranceSpecs) {
                    const { allPass } = validateTolerances(toleranceValues, toleranceField.toleranceSpecs);
                    if (!allPass) errors.push('Tolerances out of range');
                  }

                  // 5. Check Master Carton (ST-11)
                  const cartonField = selectedStage.fields.find(f => f.type === FieldType.MASTER_CARTON_SYNC);
                  if (cartonField) {
                    const required = cartonField.masterCartonSize || 20;
                    if (cartonDeviceIds.length < required) errors.push(`${required - cartonDeviceIds.length} units to pack`);
                  }

                  // 6. Check Document Audit (ST-12)
                  const auditField = selectedStage.fields.find(f => f.type === FieldType.DOCUMENT_AUDIT);
                  if (auditField) {
                    const linkedDevices = records.filter(r => r.masterCartonId === snInput).map(r => r.deviceId || r.sn);
                    const allMatched = linkedDevices.length > 0 && linkedDevices.every(id => auditResults[id] === true);
                    if (linkedDevices.length === 0) errors.push('No units found in carton');
                    else if (!allMatched) errors.push('Audit mismatch or incomplete');
                  }

                  return errors;
                };

                const validationErrors = getValidationErrors();
                const disabled = validationErrors.length > 0;

                return (
                  <div className="mt-12 md:mt-20 border-t-2 border-slate-50 pt-10 md:pt-16">
                    {disabled && (
                      <div className="mb-8 md:mb-12 p-6 md:p-8 bg-slate-50 rounded-3xl border-2 border-slate-100/50 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-3 mb-4">
                          <Icons.Flash className="w-4 h-4 text-slate-400" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Form Requirements</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {validationErrors.map((err, i) => (
                            <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                              <span className="w-1 h-1 bg-slate-300 rounded-full" /> {err}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                      <button onClick={() => handleFinalSubmit('FAILED')}
                        className="w-full md:flex-[1] py-4 md:py-8 border-2 md:border-4 border-red-600 text-red-600 rounded-[1.5rem] md:rounded-[2.5rem] font-black hover:bg-red-600 hover:text-white transition-all shadow-2xl uppercase tracking-[0.2em] text-xs md:text-sm active:scale-95">
                        {selectedStage.holdOnFail ? 'Hold Unit' : 'Reject Unit'}
                      </button>
                      <button onClick={() => !disabled && handleFinalSubmit('PASSED')} disabled={disabled}
                        className={`w-full md:flex-[2] py-4 md:py-8 rounded-[1.5rem] md:rounded-[2.5rem] font-black transition-all shadow-2xl text-xl md:text-2xl uppercase tracking-[0.2em] relative overflow-hidden group ${disabled ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300 shadow-none' : 'bg-slate-900 text-white hover:bg-emerald-600 active:scale-95'}`}>
                        {!disabled && <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>}
                        <span className="relative z-10">
                          {disabled ? (
                            <span className="flex items-center justify-center gap-3">
                              Incomplete Form
                              <span className="bg-slate-300 text-white text-[10px] px-2 py-0.5 rounded-full">{validationErrors.length}</span>
                            </span>
                          ) : 'Commit Success'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MES;
