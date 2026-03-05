import React, { useState } from 'react';
import { Icons } from '../constants';
import { SerialNumberRecord, SerialStatus, UserRole, Project, Stage } from '../types';

// ─── Component list (excludes Main PCB for replacement) ────────────
const REPLACEABLE_COMPONENTS = [
    { label: 'Battery SN', displayName: 'Battery' },
    { label: 'Speaker Box SN', displayName: 'Speaker Box' },
    { label: 'Display SN', displayName: 'TFT Display' },
    { label: 'Keypad PCB SN', displayName: 'Keypad PCB' },
    { label: 'Top Panel SN', displayName: 'Top Panel' },
    { label: 'Bottom Panel SN', displayName: 'Bottom Panel' },
    { label: 'SIM ID', displayName: 'SIM ID' },
];

interface DefectivePartEntry {
    id: string;
    partLabel: string;
    displayName: string;
    currentLinkedSn: string;
    newPartSn: string;
    remarks: string;
    validated: boolean;
    validationMsg: string;
    formatError?: string; // Real-time validation error
}

const SN_FORMAT_SPECS: Record<string, { regex: string, example: string }> = {
    'PCB SN': { regex: '^KEYMPCB\\d{8}B\\d\\d{4,5}$', example: 'KEYMPCB20240101B30009' },
    'Bottom Panel SN': { regex: '^KAYBOTMSUB\\d{8}B\\d\\d{4,5}$', example: 'KAYBOTMSUB20240101B30002' },
    'Battery SN': { regex: '^CCEBAT2PLI\\d{8}B\\d\\d{4,5}$', example: 'CCEBAT2PLI20241212B30002' },
    'Display SN': { regex: '^HUXTFT45\\d{8}B\\d-\\d{5}$', example: 'HUXTFT4520241212B1-00001' },
    'SIM ID': { regex: '^\\d{19,20}$', example: '8991123456789012345' },
    'Speaker Box SN': { regex: '^KAYSPKSUB\\d{8}B\\d\\d{4,5}$', example: 'KAYSPKSUB20241212B30002' },
    'Top Panel SN': { regex: '^XIASEMITOP\\d{8}B\\d\\d{4,5}$', example: 'XIASEMITOP20241212B30002' },
    'Keypad PCB SN': { regex: '^TOFKEYPCB-\\d{8}B\\d--\\d{4}$', example: 'TOFKEYPCB-20241212B3--0001' },
};

interface FailureInfo {
    failedStation: string;
    failedStageId: string;
    failureReason: string;
    failureTimestamp: number;
    failedBy: string;
    reworkCount: number;
    deviceId: string;
    mrbTicketId: string | null;
    mrbRepeatCount: number;
}

const Rework: React.FC<{ store: any }> = ({ store }) => {
    const {
        records, projects, currentUser,
        enterRework, replacePartInRework, normalReworkMainPCB, scrapMainPCB, completeRework, saveReworkDraft
    } = store;

    // ─── STATE ─────────────────────────────────────────────────
    const [snInput, setSnInput] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [activeRecord, setActiveRecord] = useState<SerialNumberRecord | null>(null);
    const [failureInfo, setFailureInfo] = useState<FailureInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Action selection
    const [reworkAction, setReworkAction] = useState<'REPLACE' | 'MAIN_PCB' | 'FINALIZE' | ''>('');

    // Multi-part replacement queue
    const [defectiveQueue, setDefectiveQueue] = useState<DefectivePartEntry[]>([]);

    // Main PCB branch
    const [mainPcbAction, setMainPcbAction] = useState<'NORMAL' | 'SCRAP' | ''>('');
    const [mainPcbRemarks, setMainPcbRemarks] = useState('');

    // Scrap modal state (3-step)
    const [scrapStep, setScrapStep] = useState(0); // 0=off, 1=warning, 2=type-confirm, 3=final
    const [scrapReason, setScrapReason] = useState('');
    const [scrapConfirmText, setScrapConfirmText] = useState('');

    // Complete rework
    const [finalRemarks, setFinalRemarks] = useState('');

    // ─── SESSION RECOVERY ─────────────────────────────────────────
    // Auto-save draft whenever critical state changes
    React.useEffect(() => {
        if (activeRecord && isLocked) {
            saveReworkDraft(activeRecord.sn, {
                defectiveQueue,
                mainPcbAction,
                mainPcbRemarks,
                reworkAction,
                finalRemarks
            });
        }
    }, [defectiveQueue, mainPcbAction, mainPcbRemarks, reworkAction, finalRemarks, activeRecord, isLocked]);

    // ─── HANDLERS ──────────────────────────────────────────────
    const handleScanAndLock = () => {
        setError(null);
        setSuccess(null);

        if (!snInput.trim()) { setError('Please scan or enter a Serial Number.'); return; }

        const res = enterRework(snInput.trim());
        if (!res.success) {
            setError(res.message);
            return;
        }

        setActiveRecord(res.record);
        setFailureInfo(res.failureInfo);
        setIsLocked(true);

        // Resume session if draft data exists
        if (res.resumed && res.record.draftReworkData) {
            const draft = res.record.draftReworkData;
            setDefectiveQueue(draft.defectiveQueue || []);
            setMainPcbAction(draft.mainPcbAction as any || '');
            setMainPcbRemarks(draft.mainPcbRemarks || '');
            setReworkAction(draft.reworkAction as any || '');
            setFinalRemarks(draft.finalRemarks || '');
            setSuccess(`SESSION RESUMED: Unit ${snInput} was already in rework. Previous draft data restored.`);
        } else {
            setSuccess(`LOCKED: Unit ${snInput} is now IN REWORK.`);
        }
    };

    const handleRelease = () => {
        setActiveRecord(null);
        setFailureInfo(null);
        setIsLocked(false);
        setSnInput('');
        setReworkAction('');
        setDefectiveQueue([]);
        setMainPcbAction('');
        setMainPcbRemarks('');
        setScrapStep(0);
        setScrapReason('');
        setScrapConfirmText('');
        setFinalRemarks('');
        setError(null);
        setSuccess(null);
    };

    const getSnValidationError = (label: string, sn: string): string | undefined => {
        if (!sn) return undefined;

        const spec = SN_FORMAT_SPECS[label];
        const compName = REPLACEABLE_COMPONENTS.find(c => c.label === label)?.displayName || label;

        // 1. Format validation
        if (spec) {
            const regex = new RegExp(spec.regex);
            if (!regex.test(sn)) {
                // Check if it belongs to another type (Type Mismatch)
                for (const [otherLabel, otherSpec] of Object.entries(SN_FORMAT_SPECS)) {
                    if (otherLabel === label) continue;
                    if (new RegExp(otherSpec.regex).test(sn)) {
                        const otherComp = REPLACEABLE_COMPONENTS.find(c => c.label === otherLabel);
                        return `Type mismatch. Selected component is ${compName} but scanned serial belongs to ${otherComp?.displayName || otherLabel}.`;
                    }
                }
                return `Invalid serial number format for ${compName}. Expected format example: ${spec.example}`;
            }
        }

        // 2. Self-replacement check: Cannot replace defective part with the same serial
        const currentDefectiveSn = activeRecord?.linkedParts[label];
        if (currentDefectiveSn && sn === currentDefectiveSn) {
            return `This ${compName} serial number is the current defective part. You cannot replace a defective component with the same serial number. Please enter a fresh ${compName} serial number.`;
        }

        // 3. Cross-device linkage check: Serial must NOT belong to ANY device
        // Check A: Does the serial have parentSerialId? (child-side check)
        const existingPart = records.find((r: any) => r.sn === sn);
        if (existingPart && existingPart.parentSerialId) {
            return `This ${compName} serial number is already linked to another PCB serial number. Please enter a fresh and unused ${compName} serial number.`;
        }

        // Check B: Is this serial listed in ANY PCB's linkedParts? (parent-side check)
        const ownerDevice = records.find((r: any) =>
            r.sn !== activeRecord?.sn && Object.values(r.linkedParts || {}).includes(sn)
        );
        if (ownerDevice) {
            return `This ${compName} serial number is already linked to another PCB serial number. Please enter a fresh and unused ${compName} serial number.`;
        }

        return undefined;
    };

    const addDefectivePart = () => {
        setDefectiveQueue(prev => [...prev, {
            id: Date.now().toString(),
            partLabel: '',
            displayName: '',
            currentLinkedSn: '',
            newPartSn: '',
            remarks: '',
            validated: false,
            validationMsg: '',
            formatError: undefined
        }]);
    };

    const updateQueueItem = (id: string, updates: Partial<DefectivePartEntry>) => {
        setDefectiveQueue(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, ...updates };
            if (updates.partLabel !== undefined) {
                updated.validated = false;
                updated.validationMsg = '';
                updated.newPartSn = '';
                updated.formatError = undefined;

                // Link-Aware: Component MUST be linked
                const sn = activeRecord?.linkedParts[updates.partLabel];
                updated.currentLinkedSn = sn || '';

                const comp = REPLACEABLE_COMPONENTS.find(c => c.label === updates.partLabel);
                updated.displayName = comp?.displayName || updates.partLabel;
            }

            if (updates.newPartSn !== undefined) {
                updated.formatError = getSnValidationError(updated.partLabel, updates.newPartSn);
            }

            return updated;
        }));
    };

    const removeQueueItem = (id: string) => {
        setDefectiveQueue(prev => prev.filter(item => item.id !== id));
    };

    const validateQueueItem = (id: string) => {
        const item = defectiveQueue.find(i => i.id === id);
        if (!item || !item.partLabel || !item.newPartSn) return;

        const res = replacePartInRework(activeRecord!.sn, item.partLabel, item.newPartSn, item.remarks || 'Pending commit');

        if (res.success) {
            updateQueueItem(id, { validated: true, validationMsg: '✓ Verified' });
            const updated = store.records.find((r: any) => r.sn === activeRecord?.sn);
            if (updated) setActiveRecord(updated);
            setSuccess(`${item.displayName} replaced.`);
        } else {
            updateQueueItem(id, { validated: false, validationMsg: res.message });
            setError(res.message);
        }
    };

    const usedLabels = defectiveQueue.map(q => q.partLabel).filter(Boolean);

    const handleNormalRework = () => {
        setError(null);
        if (!mainPcbRemarks.trim()) { setError('Remarks required.'); return; }
        const res = normalReworkMainPCB(activeRecord!.sn, mainPcbRemarks);
        if (res.success) {
            setSuccess('Rework recorded.');
            setMainPcbAction('');
            setReworkAction('FINALIZE');
            const updated = store.records.find((r: any) => r.sn === activeRecord?.sn);
            if (updated) setActiveRecord(updated);
        } else {
            setError(res.message);
        }
    };

    const handleScrapFinal = () => {
        setError(null);
        if (scrapConfirmText !== 'SCRAP') { setError('Type SCRAP.'); return; }
        const res = scrapMainPCB(activeRecord!.sn, scrapReason, true);
        if (res.success) {
            setSuccess('SCRAPPED.');
            handleRelease();
        } else {
            setError(res.message);
        }
    };

    const handleCompleteRework = () => {
        setError(null);
        if (!finalRemarks.trim()) { setError('Remarks required.'); return; }
        const res = completeRework(activeRecord!.sn, finalRemarks);
        if (res.success) {
            setSuccess('REWORK COMPLETE.');
            handleRelease();
        } else {
            setError(res.message);
        }
    };

    const getStationName = (stageId: string) => {
        const project = projects.find((p: Project) => p.id === activeRecord?.projectId);
        const stage = project?.stages.find((s: Stage) => s.id === stageId);
        return stage?.name || stageId;
    };

    const getComponentStation = (sn: string) => {
        const record = records.find((r: any) => r.sn === sn);
        if (!record) return 'Unknown';
        const lastPass = [...record.history].reverse().find(h => h.status === 'PASSED');
        return lastPass ? getStationName(lastPass.stageId) : 'N/A';
    };

    const getComponentStatus = (sn: string) => {
        const record = records.find((r: any) => r.sn === sn);
        return record?.status || 'Unknown';
    };

    const getValidationMarkers = (msg: string, validated: boolean) => {
        const markers = { INV: true, OWN: true, STS: true, SCP: true, TYP: true };
        if (validated) return markers;
        if (!msg) return { INV: false, OWN: false, STS: false, SCP: false, TYP: false };

        if (msg.includes('INVENTORY')) markers.INV = false;
        if (msg.includes('OWNERSHIP')) markers.OWN = false;
        if (msg.includes('STATUS')) markers.STS = false;
        if (msg.includes('SCRAP')) markers.SCP = false;
        if (msg.includes('TYPE')) markers.TYP = false;

        // If one fails, the following are often unknown/false
        if (!markers.INV) { markers.OWN = false; markers.STS = false; markers.SCP = false; markers.TYP = false; }
        return markers;
    };

    const isSupervisor = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MODERATOR;

    return (
        <div className="max-w-5xl mx-auto py-6 px-4">
            {/* HEADER */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Rework Control Center</h1>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Station Continuity & Corrective Logic</p>
            </div>

            {/* ALERTS */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3">
                    <span className="text-red-700 font-bold text-xs uppercase flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="font-black">✕</button>
                </div>
            )}
            {success && (
                <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-start gap-3">
                    <span className="text-emerald-700 font-bold text-xs uppercase flex-1">{success}</span>
                    <button onClick={() => setSuccess(null)} className="font-black">✕</button>
                </div>
            )}

            {/* SCAN SECTION */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-8">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Device Serial Scan</label>
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={snInput}
                        onChange={(e) => setSnInput(e.target.value.toUpperCase())}
                        disabled={isLocked}
                        placeholder="Scan Serial Number..."
                        className="flex-1 px-6 py-5 border-2 rounded-2xl font-mono text-lg font-black uppercase bg-slate-50 border-slate-100"
                    />
                    {!isLocked ? (
                        <button onClick={handleScanAndLock} className="px-8 py-5 bg-slate-900 text-white font-black rounded-2xl uppercase text-xs">Scan & Lock</button>
                    ) : (
                        <button onClick={handleRelease} className="px-8 py-5 bg-slate-200 text-slate-600 font-black rounded-2xl uppercase text-xs">Release</button>
                    )}
                </div>
            </div>

            {/* FLOW SECTION */}
            {activeRecord && failureInfo && (
                <div className="space-y-8">
                    {/* FAILURE DIAGNOSTIC */}
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-22">
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2">Failure Provenance</p>
                        <h3 className="text-xl font-black uppercase mb-6">Unit Diagnostic Info</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div><span className="text-[8px] text-slate-500 uppercase block">Station</span><p className="font-black text-indigo-300">{failureInfo.failedStation}</p></div>
                            <div><span className="text-[8px] text-slate-500 uppercase block">Device ID</span><p className="font-mono font-black">{failureInfo.deviceId}</p></div>
                            <div><span className="text-[8px] text-slate-500 uppercase block">Reason</span><p className="font-black text-red-400">{failureInfo.failureReason}</p></div>
                        </div>
                    </div>

                    {/* DEFECTIVE PART SELECTION */}
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black uppercase italic">Defective Part Selection</h3>
                            <button onClick={addDefectivePart} className="px-5 py-2.5 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase">Add Part</button>
                        </div>

                        <div className="space-y-6">
                            {defectiveQueue.map((item, idx) => (
                                <div key={item.id} className={`p-6 rounded-2xl border-2 ${item.validated ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/10'}`}>
                                    <div className="flex justify-between mb-4">
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Part #{idx + 1}</span>
                                        {!item.validated && <button onClick={() => removeQueueItem(item.id)} className="text-red-400 text-[9px] font-black uppercase">Remove</button>}
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                        <div className="lg:col-span-4 space-y-4">
                                            <select value={item.partLabel} disabled={item.validated} onChange={(e) => updateQueueItem(item.id, { partLabel: e.target.value })} className="w-full p-3.5 border-2 rounded-xl text-xs font-black uppercase">
                                                <option value="">— Choose Part —</option>
                                                {REPLACEABLE_COMPONENTS.filter(c =>
                                                    (activeRecord.linkedParts[c.label]) &&
                                                    (!usedLabels.includes(c.label) || c.label === item.partLabel)
                                                ).map(c => (
                                                    <option key={c.label} value={c.label}>{c.displayName}</option>
                                                ))}
                                            </select>
                                            {item.partLabel && (
                                                <div className="p-3 bg-slate-900 rounded-xl text-white text-[9px] space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-indigo-400 uppercase font-black">Linked Serial</p>
                                                        <span className="text-[7px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded cursor-help">LINK HISTORY</span>
                                                    </div>
                                                    <p className="font-mono text-xs">{item.currentLinkedSn}</p>
                                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                                                        <div>
                                                            <p className="text-slate-500 uppercase">Station</p>
                                                            <p className="text-slate-300">{getComponentStation(item.currentLinkedSn)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500 uppercase">Status</p>
                                                            <p className="text-slate-300">{getComponentStatus(item.currentLinkedSn)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {defectiveQueue.length > 0 && !item.partLabel && (
                                                <p className="text-[10px] text-amber-600 font-bold italic">Only components linked to this device are eligible for selection.</p>
                                            )}
                                        </div>
                                        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={item.newPartSn}
                                                        disabled={item.validated || !item.partLabel}
                                                        onChange={(e) => updateQueueItem(item.id, { newPartSn: e.target.value.toUpperCase() })}
                                                        placeholder="Scan New Serial..."
                                                        className={`w-full p-3.5 border-2 rounded-xl font-mono text-sm uppercase transition-all ${item.formatError ? 'border-red-300 bg-red-50 text-red-900 focus:ring-red-200' : 'border-slate-100 bg-slate-50'}`}
                                                    />
                                                    {item.formatError && (
                                                        <div className="mt-2 p-3 bg-red-600 text-white rounded-xl shadow-lg animate-in slide-in-from-top-2">
                                                            <div className="flex items-start gap-2">
                                                                <Icons.Alert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                                <p className="text-[10px] font-black leading-tight uppercase tracking-tight">{item.formatError}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <input type="text" value={item.remarks} disabled={item.validated || !item.partLabel} onChange={(e) => updateQueueItem(item.id, { remarks: e.target.value })} placeholder="Remarks..." className="w-full p-3.5 border-2 border-slate-100 bg-slate-50 rounded-xl text-xs" />
                                            </div>
                                            {!item.validated ? (
                                                <button
                                                    onClick={() => validateQueueItem(item.id)}
                                                    disabled={!item.partLabel || !item.newPartSn || !!item.formatError}
                                                    className={`py-6 font-black rounded-2xl uppercase text-xs transition-all shadow-xl ${(!item.partLabel || !item.newPartSn || !!item.formatError) ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
                                                >
                                                    Verify & Swap
                                                </button>
                                            ) : (
                                                <div className="py-6 bg-emerald-600 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg animate-in zoom-in-95"><Icons.Check className="w-5 h-5" /><span className="font-black text-xs uppercase">Verified</span></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* VALIDATION DASHBOARD */}
                        {defectiveQueue.some(q => q.newPartSn) && (
                            <div className="mt-8 pt-8 border-t-2 border-slate-100">
                                <div className="flex justify-between items-end mb-6">
                                    <h4 className="text-sm font-black uppercase tracking-tighter">REPLACEMENT PART VALIDATION</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">System Integrity Verification (SIV) Active</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {defectiveQueue.filter(q => q.newPartSn).map(item => {
                                        const markers = getValidationMarkers(item.validationMsg, item.validated);
                                        return (
                                            <div key={item.id} className={`p-5 rounded-[1.5rem] border-2 transition-all ${item.validated ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200 shadow-sm'}`}>
                                                <div className="flex justify-between items-center mb-4">
                                                    <p className="text-[10px] font-black uppercase text-slate-600">{item.displayName}</p>
                                                    {item.validated && <Icons.Check className="w-4 h-4 text-emerald-600" />}
                                                </div>
                                                <div className="flex gap-2 mb-4">
                                                    {Object.entries(markers).map(([key, pass]) => (
                                                        <div key={key} className="flex flex-col items-center flex-1 py-2 bg-white/50 rounded-lg">
                                                            <span className="text-[7px] font-black text-slate-400 mb-1">{key}</span>
                                                            {pass ? (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                            ) : (
                                                                <div className={`w-1.5 h-1.5 rounded-full ${item.validationMsg.includes(key) || (!markers.INV && key !== 'INV') ? 'bg-red-500 animate-pulse' : 'bg-slate-200'}`} />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                {item.validationMsg && !item.validated && (
                                                    <div className="p-3 bg-red-900/90 backdrop-blur rounded-xl text-white">
                                                        <p className="text-[7px] font-black uppercase text-red-300 mb-1">Critical Block</p>
                                                        <p className="text-[9px] font-bold leading-tight uppercase">{item.validationMsg}</p>
                                                    </div>
                                                )}
                                                {item.validated && (
                                                    <p className="text-[9px] text-emerald-700 font-bold uppercase flex items-center gap-1">
                                                        <Icons.Check className="w-3 h-3" /> Ready for Commit
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* REPLACEMENT AUDIT HISTORY */}
                        {activeRecord.history.some(h => h.data?.action === 'PART_REPLACE') && (
                            <div className="mt-8 pt-8 border-t-2 border-slate-100">
                                <h4 className="text-sm font-black uppercase mb-6">REPLACEMENT AUDIT HISTORY</h4>
                                <div className="space-y-3">
                                    {[...activeRecord.history].reverse().filter(h => h.data?.action === 'PART_REPLACE').map((h, i) => (
                                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Icons.Check className="w-4 h-4" /></div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase">{h.data.partLabel} Swap</p>
                                                    <p className="text-[8px] font-mono text-slate-400 mt-0.5">Old: {h.data.oldPartSn} → New: {h.data.newPartSn}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col md:items-end">
                                                <p className="text-[8px] font-black uppercase text-slate-500">Recorded By: {h.userId === currentUser.id ? 'YOU' : h.userId}</p>
                                                <p className="text-[8px] font-mono text-slate-400">{new Date(h.timestamp).toLocaleString()}</p>
                                                <p className="text-[9px] text-indigo-600 font-bold italic mt-1 italic">"{h.remark}"</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ACTION PANEL */}
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 grid grid-cols-2 gap-4">
                        <button onClick={() => { setReworkAction('MAIN_PCB'); setMainPcbAction(''); }} className={`py-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${reworkAction === 'MAIN_PCB' ? 'bg-amber-600 text-white' : 'bg-slate-50 text-slate-600'}`}><Icons.Settings className="w-5 h-5 mx-auto mb-2" />Main PCB</button>
                        <button onClick={() => setReworkAction('FINALIZE')} className={`py-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${reworkAction === 'FINALIZE' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600'}`}><Icons.Check className="w-5 h-5 mx-auto mb-2" />Finalize</button>
                    </div>

                    {/* PCB BRANCH */}
                    {reworkAction === 'MAIN_PCB' && (
                        <div className="bg-white rounded-[2rem] border-2 p-8 animate-in zoom-in-95">
                            <h3 className="font-black uppercase italic mb-6">Main PCB Handling</h3>
                            {!mainPcbAction ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setMainPcbAction('NORMAL')} className="p-6 border-2 rounded-xl text-left bg-indigo-50 border-indigo-100"><h4 className="font-black uppercase text-xs">Normal Rework</h4></button>
                                    <button onClick={() => { if (isSupervisor) { setMainPcbAction('SCRAP'); setScrapStep(1); } else { setError('Supervisor Only'); } }} className="p-6 border-2 rounded-xl text-left bg-red-50 border-red-100"><h4 className="font-black uppercase text-xs text-red-900">Scrap PCB</h4></button>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    {mainPcbAction === 'NORMAL' && (
                                        <div className="space-y-4">
                                            <textarea value={mainPcbRemarks} onChange={(e) => setMainPcbRemarks(e.target.value)} placeholder="Remarks..." className="w-full p-4 border-2 rounded-xl text-sm" rows={4} />
                                            <button onClick={handleNormalRework} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl uppercase text-xs">Submit</button>
                                        </div>
                                    )}
                                    {mainPcbAction === 'SCRAP' && scrapStep > 0 && (
                                        <div className="p-6 bg-red-900 text-white rounded-2xl space-y-4">
                                            <p className="text-xs font-black uppercase mb-2">Scrap Approval: Step {scrapStep} of 3</p>

                                            {scrapStep === 1 && (
                                                <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                                                    <p className="text-[10px] uppercase font-bold text-red-100">⚠ ATTENTION SUPERVISOR</p>
                                                    <p className="text-[11px] font-bold mt-2">Scrapping a Main PCB is IRREVERSIBLE. It will automatically scrap the device and unlink all components.</p>
                                                </div>
                                            )}

                                            {scrapStep === 2 && (
                                                <div className="space-y-4">
                                                    <p className="text-[9px] font-black uppercase text-red-200">2. Provide Scrap Reason</p>
                                                    <textarea value={scrapReason} onChange={(e) => setScrapReason(e.target.value)} placeholder="Scrap Reason..." className="w-full p-3 bg-white/10 rounded-xl text-xs placeholder:text-white/30 border border-white/20" rows={3} />
                                                </div>
                                            )}

                                            {scrapStep === 3 && (
                                                <div className="space-y-4">
                                                    <p className="text-[9px] font-black uppercase text-red-200">3. Final Confirmation</p>
                                                    <input type="text" value={scrapConfirmText} onChange={(e) => setScrapConfirmText(e.target.value.toUpperCase())} placeholder='Type "SCRAP"' className="w-full p-4 bg-white text-red-900 rounded-xl text-center font-black tracking-widest placeholder:text-red-200 border-none" />
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <button onClick={() => { setScrapStep(0); setScrapReason(''); setScrapConfirmText(''); }} className="flex-1 py-3 bg-white/10 font-black uppercase text-[10px] rounded-lg">Cancel</button>
                                                {scrapStep < 3 ? (
                                                    <button onClick={() => {
                                                        if (scrapStep === 2 && !scrapReason.trim()) { setError('Reason required.'); return; }
                                                        setScrapStep(scrapStep + 1);
                                                    }} className="flex-1 py-3 bg-red-500 font-black uppercase text-[10px] rounded-lg shadow-lg">Next</button>
                                                ) : (
                                                    <button onClick={handleScrapFinal} className="flex-1 py-3 bg-white text-red-900 font-black uppercase text-[10px] rounded-lg shadow-xl">Confirm Scrap</button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FINALIZE BRANCH */}
                    {reworkAction === 'FINALIZE' && (
                        <div className="bg-emerald-50 rounded-[2rem] border-2 border-emerald-200 p-8 animate-in zoom-in-95">
                            <h3 className="font-black uppercase italic mb-6">Finalize & Release</h3>
                            <div className="max-w-md mx-auto space-y-4">
                                <div className="p-4 bg-white rounded-xl text-center"><p className="text-[10px] text-slate-500 uppercase">Routing to:</p><p className="font-black text-emerald-700">{getStationName(activeRecord.nextPossibleStationId || activeRecord.currentStageId)}</p></div>
                                <textarea value={finalRemarks} onChange={(e) => setFinalRemarks(e.target.value)} placeholder="Final remarks..." className="w-full p-4 border-2 border-emerald-100 rounded-xl text-sm" rows={3} />
                                <button onClick={handleCompleteRework} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl uppercase tracking-widest">Complete Rework</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Rework;
