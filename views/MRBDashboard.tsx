
import React, { useState, useMemo } from 'react';
import { Icons } from '../constants';
import { Project, SerialNumberRecord, SerialStatus, UserRole, MrbTicket, MrbStatus, MrbDisposition } from '../types';

const MRBDashboard: React.FC<{ store: any }> = ({ store }) => {
    const { projects, records, mrbTickets, createMrbTicket, disposeMrbTicket, currentUser, addAuditLog } = store;

    const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAIL'>('LIST');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form State for Ticket Creation
    const [newTicket, setNewTicket] = useState({
        projectId: 'tohands-main',
        partName: 'Main PCB',
        defectCategory: 'Functional Failure',
        description: '',
        lineName: 'Line A',
        shift: 'Day',
        serialNumbers: ''
    });

    // Disposition State
    const [dispAction, setDispAction] = useState<'SCRAP' | 'REWORK'>('REWORK');
    const [dispSerials, setDispSerials] = useState<string[]>([]);
    const [dispRemarks, setDispRemarks] = useState('');

    const activeTickets = useMemo(() =>
        mrbTickets.filter((t: MrbTicket) => t.status !== MrbStatus.CLOSED)
            .sort((a: MrbTicket, b: MrbTicket) => b.timestamp - a.timestamp)
        , [mrbTickets]);

    const closedTickets = useMemo(() =>
        mrbTickets.filter((t: MrbTicket) => t.status === MrbStatus.CLOSED)
            .sort((a: MrbTicket, b: MrbTicket) => b.timestamp - a.timestamp)
        , [mrbTickets]);

    const selectedTicket = useMemo(() =>
        mrbTickets.find((t: MrbTicket) => t.id === selectedTicketId)
        , [mrbTickets, selectedTicketId]);

    const handleCreateTicket = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const sns = newTicket.serialNumbers.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

        if (sns.length === 0) {
            setError('At least one Serial Number is required.');
            return;
        }

        const res = createMrbTicket({
            ...newTicket,
            serialNumbers: sns,
            createdBy: currentUser?.username || 'SYSTEM'
        });

        if (res.success) {
            setSuccess(`Ticket ${res.ticketId} created successfully. ${sns.length} units locked.`);
            setView('LIST');
            setNewTicket({
                projectId: 'tohands-main',
                partName: 'Main PCB',
                defectCategory: 'Functional Failure',
                description: '',
                lineName: 'Line A',
                shift: 'Day',
                serialNumbers: ''
            });
        } else {
            setError('Failed to create ticket.');
        }
    };

    const handleDisposition = () => {
        if (dispSerials.length === 0) {
            setError('Please select at least one serial number.');
            return;
        }
        if (!dispRemarks) {
            setError('Disposition remarks are mandatory.');
            return;
        }

        const res = disposeMrbTicket(selectedTicketId!, dispSerials, dispAction, dispRemarks);
        if (res.success) {
            setSuccess(`Disposition applied for ${dispSerials.length} units.`);
            setDispSerials([]);
            setDispRemarks('');
            if (selectedTicket?.serialNumbers.length === dispSerials.length) {
                setView('LIST');
            }
        } else {
            setError('Failed to apply disposition.');
        }
    };

    const getAging = (timestamp: number) => {
        const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">MRB Control Board</h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Material Review & Disposition Governance</p>
                </div>
                <div className="flex gap-3">
                    {view !== 'LIST' && (
                        <button onClick={() => setView('LIST')} className="px-6 py-2.5 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition uppercase text-[10px] tracking-widest border border-slate-200">Back to List</button>
                    )}
                    {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MODERATOR) && view === 'LIST' && (
                        <button onClick={() => setView('CREATE')} className="px-6 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition shadow-xl uppercase text-[10px] tracking-widest flex items-center gap-2">
                            <Icons.Plus className="w-3 h-3" /> New MRB Ticket
                        </button>
                    )}
                </div>
            </div>

            {success && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4">
                    <span className="text-emerald-700 font-bold text-xs uppercase tracking-tight">{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-600 font-black">✕</button>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4">
                    <span className="text-red-700 font-bold text-xs uppercase tracking-tight">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-black">✕</button>
                </div>
            )}

            {/* View Switcher */}
            {view === 'LIST' && (
                <div className="grid grid-cols-1 gap-8">
                    {/* Active Tickets */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Icons.Lock className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Active MRB Tickets</h2>
                            </div>
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full">{activeTickets.length} Pending</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ticket ID</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Defect & Part</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Units</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Aging</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {activeTickets.map((t: MrbTicket) => {
                                        const aging = getAging(t.timestamp);
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <span className="font-mono font-black text-indigo-600 text-sm">{t.id}</span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase whitespace-nowrap">By {t.createdBy}</div>
                                                        <span className="text-slate-200">|</span>
                                                        <div className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${t.source === 'Rework Scrap' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{t.source || 'Manual'}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-sm font-black text-slate-800">{t.defectCategory}</div>
                                                    <div className="text-[10px] text-indigo-500 font-bold uppercase">{t.partName}</div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="text-sm font-black text-slate-700">{t.serialNumbers.length}</span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`text-xs font-black ${aging > 7 ? 'text-red-500' : aging > 3 ? 'text-amber-500' : 'text-slate-500'}`}>
                                                        {aging} Days
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter ${t.status === MrbStatus.OPEN ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button onClick={() => { setSelectedTicketId(t.id); setView('DETAIL'); }} className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-widest transition hover:bg-indigo-600">Review</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {activeTickets.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <Icons.Check className="w-10 h-10 mx-auto mb-4 text-slate-100" />
                                                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No pending MRB reviews</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {view === 'CREATE' && (
                <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
                    <div className="bg-slate-900 px-10 py-8 text-white">
                        <h2 className="text-xl font-black italic tracking-tighter uppercase">Raise New MRB Ticket</h2>
                        <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-widest mt-1">Batch Isolation & Root Cause Logging</p>
                    </div>
                    <form onSubmit={handleCreateTicket} className="p-10 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Project</label>
                                <select value={newTicket.projectId} onChange={e => setNewTicket({ ...newTicket, projectId: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs">
                                    {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Component / Part</label>
                                <select value={newTicket.partName} onChange={e => setNewTicket({ ...newTicket, partName: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs">
                                    <option value="Main PCB">Main PCB</option>
                                    <option value="Keypad PCB">Keypad PCB</option>
                                    <option value="Speaker">Speaker</option>
                                    <option value="Battery">Battery</option>
                                    <option value="TFT Display">TFT Display</option>
                                    <option value="Cabinet">Cabinet</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Defect Category</label>
                                <select value={newTicket.defectCategory} onChange={e => setNewTicket({ ...newTicket, defectCategory: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs">
                                    <option value="Functional Failure">Functional Failure</option>
                                    <option value="Cosmetic Damage">Cosmetic Damage</option>
                                    <option value="Assembly Error">Assembly Error</option>
                                    <option value="Component Missing">Component Missing</option>
                                    <option value="Weight Deviation">Weight Deviation</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shift / Line</label>
                                <div className="flex gap-2">
                                    <input value={newTicket.lineName} onChange={e => setNewTicket({ ...newTicket, lineName: e.target.value })} className="w-1/2 px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                                    <input value={newTicket.shift} onChange={e => setNewTicket({ ...newTicket, shift: e.target.value })} className="w-1/2 px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                                Serial Numbers <span>(One per line or comma separated)</span>
                            </label>
                            <textarea value={newTicket.serialNumbers} onChange={e => setNewTicket({ ...newTicket, serialNumbers: e.target.value.toUpperCase() })} placeholder="SCAN MULTIPLE SERIALS HERE..." className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono text-xs font-bold" rows={6} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Defect Description / Remarks</label>
                            <textarea value={newTicket.description} onChange={e => setNewTicket({ ...newTicket, description: e.target.value })} placeholder="Describe the failure mode in detail..." className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold" rows={3} />
                        </div>

                        <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition shadow-2xl uppercase tracking-[0.2em] text-sm">Seal Ticket & Lock Units</button>
                    </form>
                </div>
            )}

            {view === 'DETAIL' && selectedTicket && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-6 transition-all">
                    {/* Ticket Info */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><Icons.Audit className="w-32 h-32" /></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <span className="bg-indigo-500 text-white px-3 py-1 rounded-lg font-mono font-black text-sm">{selectedTicket.id}</span>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${selectedTicket.status === MrbStatus.OPEN ? 'bg-amber-500' : 'bg-indigo-500'}`}>{selectedTicket.status}</span>
                                </div>
                                <h3 className="text-3xl font-black tracking-tighter uppercase italic mb-8">{selectedTicket.defectCategory}</h3>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                    <div><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Created Date</p><p className="font-black text-sm">{new Date(selectedTicket.timestamp).toLocaleDateString()}</p></div>
                                    <div><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Origin Line</p><p className="font-black text-sm">{selectedTicket.lineName}</p></div>
                                    <div><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Part Name</p><p className="font-black text-sm uppercase">{selectedTicket.partName}</p></div>
                                    <div><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Raised By</p><p className="font-black text-sm">{selectedTicket.createdBy}</p></div>
                                    <div><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Origin / Source</p><p className="font-black text-sm text-indigo-600 uppercase">{selectedTicket.source || 'Manual Entry'}</p></div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-3">Defect Description</p>
                                    <p className="text-slate-300 text-sm font-bold leading-relaxed">{selectedTicket.description || 'No detailed description provided.'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Locked Serials List */}
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Units in this Ticket ({selectedTicket.serialNumbers.length})</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                                {selectedTicket.serialNumbers.map(sn => {
                                    const record = records.find((r: any) => r.sn === sn || r.deviceId === sn);
                                    const isDisposed = selectedTicket.dispositions.some(d => d.serialNumbers.includes(sn));
                                    return (
                                        <div key={sn} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isDisposed ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" disabled={isDisposed} checked={dispSerials.includes(sn)} onChange={() => {
                                                    setDispSerials(prev => prev.includes(sn) ? prev.filter(x => x !== sn) : [...prev, sn]);
                                                }} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                                                <span className="font-mono font-black text-[12px] text-slate-700">{sn}</span>
                                            </div>
                                            {isDisposed ? (
                                                <span className="text-[8px] font-black px-2 py-0.5 bg-slate-200 text-slate-500 rounded uppercase">Disposed</span>
                                            ) : (
                                                <span className="text-[8px] font-black px-2 py-0.5 bg-red-50 text-red-500 rounded uppercase">Locked</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* History of Dispositions */}
                        {selectedTicket.dispositions.length > 0 && (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Disposition History</h4>
                                <div className="space-y-4">
                                    {selectedTicket.dispositions.map((d, idx) => (
                                        <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
                                            <div className={`absolute top-0 left-0 w-1 h-full ${d.action === 'SCRAP' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${d.action === 'SCRAP' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                    {d.action} Applied
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-bold">{new Date(d.timestamp).toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs font-black text-slate-800 mb-2">{d.serialNumbers.length} units processed.</p>
                                            <p className="text-[10px] text-slate-500 font-bold bg-white/50 p-3 rounded-lg border border-slate-100 italic">"{d.remarks}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Disposition Controls */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 top-6 sticky animate-in fade-in duration-700">
                            <h3 className="text-xl font-black text-slate-900 mb-8 tracking-tighter uppercase italic">Decision Board</h3>

                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">1. SELECT ACTION</p>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button onClick={() => setDispAction('REWORK')} className={`py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${dispAction === 'REWORK' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Move to Rework</button>
                                <button onClick={() => setDispAction('SCRAP')} className={`py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${dispAction === 'SCRAP' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Scrap Permanently</button>
                            </div>

                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">2. DISPOSITION REMARKS</p>
                            <textarea value={dispRemarks} onChange={e => setDispRemarks(e.target.value)} placeholder="Provide technical justification for the decision..." className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold mb-8" rows={4} />

                            <div className="p-6 bg-slate-900 rounded-2xl mb-8">
                                <div className="flex justify-between items-center text-white mb-2">
                                    <span className="text-[8px] font-black text-indigo-400 uppercase">Selected Units</span>
                                    <span className="font-black text-xl">{dispSerials.length}</span>
                                </div>
                                <p className="text-[8px] text-slate-400 uppercase font-bold leading-relaxed italic">Decision once applied is logged permanently in unit traceability.</p>
                            </div>

                            <button disabled={dispSerials.length === 0} onClick={handleDisposition} className={`w-full py-5 font-black rounded-xl transition shadow-2xl uppercase tracking-widest text-sm ${dispSerials.length > 0 ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>Authorize Disposition</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MRBDashboard;
