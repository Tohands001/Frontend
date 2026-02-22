
import React, { useState } from 'react';
import { Project, Stage, FieldType, StageField } from '../types';
import { Icons } from '../constants';

const StageConfig: React.FC<{ store: any; projectId: string; navigateTo: any }> = ({ store, projectId, navigateTo }) => {
  const { projects, updateProject, deleteStage, renameStage } = store;
  const project = projects.find((p: any) => p.id === projectId);
  const [selectedStageIdx, setSelectedStageIdx] = useState(0);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [tempStageName, setTempStageName] = useState('');
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!project) return <div>Project not found</div>;

  const addStage = () => {
    const newStage: Stage = {
      id: Math.random().toString(36).substr(2, 9),
      name: `New Stage ${project.stages.length + 1}`,
      order: project.stages.length,
      fields: [],
      assignedUserIds: []
    };

    // Auto-link logic
    const stages = [...project.stages, newStage];
    if (stages.length > 1) {
      stages[stages.length - 2].nextStageId = newStage.id;
    }

    updateProject(projectId, { stages });
    setSelectedStageIdx(stages.length - 1);
  };

  const handleRename = async (stageId: string) => {
    const trimmed = tempStageName.trim();
    if (!trimmed) {
      setEditingStageId(null);
      return;
    }
    if (trimmed.length > 50) {
      alert("Stage name must be under 50 characters");
      return;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    renameStage(projectId, stageId, trimmed);
    setIsProcessing(false);
    setEditingStageId(null);
  };

  const handleDeleteStage = async () => {
    if (stageToDelete) {
      setIsProcessing(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      deleteStage(projectId, stageToDelete);
      setIsProcessing(false);
      setStageToDelete(null);

      const newIdx = Math.max(0, Math.min(selectedStageIdx, project.stages.length - 2));
      setSelectedStageIdx(newIdx);
    }
  };

  const addField = (stageIdx: number, type: FieldType) => {
    const field: StageField = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: type === FieldType.SERIAL_NUMBER ? 'Main Serial Number' : `New ${type.replace('_', ' ')}`,
      required: true,
      checkpoints: type === FieldType.CHECKBOX_INSPECTION ? [{ id: 'cp1', label: 'Item OK?' }] : undefined
    };

    const stages = [...project.stages];
    stages[stageIdx].fields.push(field);
    updateProject(projectId, { stages });
  };

  const updateStageNameDirect = (idx: number, name: string) => {
    const stages = [...project.stages];
    stages[idx].name = name;
    updateProject(projectId, { stages });
  };

  const currentStage = project.stages[selectedStageIdx];

  return (
    <div className="space-y-4 md:space-y-6 text-left">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3 md:space-x-4">
          <button onClick={() => navigateTo('planning')} className="p-2 hover:bg-white rounded-full transition shadow-sm shrink-0">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{project.name}</h2>
            <p className="text-slate-500 text-xs md:text-sm">Stage Configuration & Field Builder</p>
          </div>
        </div>
        <button
          onClick={() => navigateTo('sn-config', projectId)}
          className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md text-sm md:text-base"
        >
          Save & Continue
        </button>
      </header>

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-250px)] gap-4 md:gap-6">
        {/* Stage List Sidebar */}
        <div className="w-full lg:w-72 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col shrink-0 min-h-[300px] lg:min-h-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-[10px] md:text-sm font-bold text-slate-800 uppercase tracking-widest">Workflow</h3>
            <button onClick={addStage} className="p-1 md:p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition">
              <Icons.Plus className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] lg:max-h-none">
            {project.stages.map((stage: Stage, idx: number) => (
              <div
                key={stage.id}
                onClick={() => setSelectedStageIdx(idx)}
                className={`relative group flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedStageIdx === idx ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
              >
                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] font-bold mr-2 md:mr-3 shrink-0 ${selectedStageIdx === idx ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 truncate pr-2">
                  {editingStageId === stage.id ? (
                    <input
                      autoFocus
                      value={tempStageName}
                      onChange={(e) => setTempStageName(e.target.value)}
                      onBlur={() => handleRename(stage.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(stage.id);
                        if (e.key === 'Escape') setEditingStageId(null);
                      }}
                      className="w-full bg-white border border-indigo-300 rounded px-1 text-sm font-bold text-slate-800 outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p className="font-bold text-slate-800 truncate text-sm">{stage.name}</p>
                  )}
                </div>

                {!editingStageId && (
                  <div className="flex items-center space-x-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStageId(stage.id);
                        setTempStageName(stage.name);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Icons.Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStageToDelete(stage.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Icons.Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {idx < project.stages.length - 1 && (
                  <div className="absolute -bottom-3 left-6 md:left-[22px] w-0.5 h-3 bg-slate-200 hidden lg:block"></div>
                )}
              </div>
            ))}
            {project.stages.length === 0 && (
              <p className="text-center text-slate-400 text-xs md:text-sm mt-10">Add your first stage to begin.</p>
            )}
          </div>
        </div>

        {/* Stage Editor */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-0">
          {currentStage ? (
            <>
              <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <input
                    value={currentStage.name}
                    onChange={(e) => updateStageNameDirect(selectedStageIdx, e.target.value)}
                    className="w-full text-lg md:text-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 px-2 py-1 rounded truncate"
                  />
                  <div className="mt-2 flex items-center space-x-4">
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentStage.requiresLogin}
                        onChange={(e) => {
                          const stages = [...project.stages];
                          stages[selectedStageIdx].requiresLogin = e.target.checked;
                          updateProject(projectId, { stages });
                        }}
                      />
                      <span>Require Identity Login</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap md:flex-nowrap gap-4 items-start">
                  <div className="flex flex-col min-w-[120px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Operators</label>
                    <select
                      multiple
                      className="text-[10px] md:text-xs font-bold border rounded-lg px-2 py-1 bg-slate-50 border-slate-200 min-h-[50px] md:min-h-[60px]"
                      value={currentStage.assignedUserIds}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const selectedOptions = Array.from(e.target.selectedOptions, option => (option as HTMLOptionElement).value);
                        const stages = [...project.stages];
                        stages[selectedStageIdx].assignedUserIds = selectedOptions;
                        updateProject(projectId, { stages });
                      }}
                    >
                      {store.users.filter((u: any) => u.role === 'OPERATOR').map((u: any) => (
                        <option key={u.id} value={u.id}>@{u.username}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col min-w-[120px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fail Routing</label>
                    <select
                      className="text-[10px] md:text-xs font-bold border rounded-lg px-2 py-1 bg-slate-50 border-slate-200"
                      onChange={(e) => {
                        const stages = [...project.stages];
                        stages[selectedStageIdx].failRouteStageId = e.target.value;
                        updateProject(projectId, { stages });
                      }}
                      value={currentStage.failRouteStageId || ''}
                    >
                      <option value="">Default Fail (Prev)</option>
                      {project.stages.filter((s: any) => s.id !== currentStage.id).map((s: any) => (
                        <option key={s.id} value={s.id}>Fail → {s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 mb-8">
                  {[
                    { type: FieldType.SERIAL_NUMBER, icon: Icons.ChevronRight, label: 'Main SN' },
                    { type: FieldType.SUB_SERIAL_NUMBER, icon: Icons.ChevronRight, label: 'Sub SN' },
                    { type: FieldType.CHECKBOX_INSPECTION, icon: Icons.Dashboard, label: 'Inspection' },
                    { type: FieldType.CAMERA, icon: Icons.Camera, label: 'Camera/File' },
                    { type: FieldType.LOGIN, icon: Icons.UserControl, label: 'Identity/Login' },
                    { type: FieldType.DATE, icon: Icons.ChevronRight, label: 'Date/Time' },
                  ].map((btn) => (
                    <button
                      key={btn.type}
                      onClick={() => addField(selectedStageIdx, btn.type)}
                      className="flex items-center space-x-3 p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-indigo-400 hover:shadow-sm transition group text-left"
                    >
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center text-indigo-600 border border-slate-100 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                        <btn.icon className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <span className="font-bold text-slate-700 text-xs md:text-sm truncate">{btn.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Configured Fields</h4>
                  {currentStage.fields.map((field, fIdx) => (
                    <div key={field.id} className="flex items-center p-3 md:p-4 bg-slate-50 rounded-xl border border-slate-200 gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg flex items-center justify-center border border-slate-100 shrink-0">
                        {field.type === FieldType.SERIAL_NUMBER ? <Icons.ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" /> : <Icons.Dashboard className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <input
                            value={field.label}
                            onChange={(e) => {
                              const stages = [...project.stages];
                              stages[selectedStageIdx].fields[fIdx].label = e.target.value;
                              updateProject(projectId, { stages });
                            }}
                            className="bg-transparent font-bold text-slate-800 focus:outline-none text-sm md:text-base truncate border-b border-transparent focus:border-indigo-200"
                          />
                          <span className="w-fit px-1.5 md:px-2 py-0.5 bg-slate-200 rounded text-[8px] md:text-[10px] font-bold text-slate-500 uppercase shrink-0">{field.type}</span>
                        </div>
                        <div className="mt-1">
                          <label className="flex items-center space-x-2 text-[10px] md:text-xs text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => {
                                const stages = [...project.stages];
                                stages[selectedStageIdx].fields[fIdx].required = e.target.checked;
                                updateProject(projectId, { stages });
                              }}
                            />
                            <span>Mandatory Field</span>
                          </label>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const stages = [...project.stages];
                          stages[selectedStageIdx].fields = stages[selectedStageIdx].fields.filter((_, i) => i !== fIdx);
                          updateProject(projectId, { stages });
                        }}
                        className="text-red-400 hover:text-red-600 transition p-2 shrink-0"
                      >
                        <Icons.Trash className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  ))}
                  {currentStage.fields.length === 0 && (
                    <div className="text-center py-12 md:py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 p-4">
                      <p className="text-slate-400 text-sm">No fields added to this stage yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center min-h-[400px]">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 shrink-0">
                <Icons.Planning className="w-8 h-8 md:w-10 md:h-10 text-slate-300" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-slate-800">No Stage Selected</h3>
              <p className="text-slate-500 max-w-sm mt-2 text-sm">Select a stage from the sidebar or add a new one to start configuring the data entry fields for your shop floor operators.</p>
              <button onClick={addStage} className="mt-6 md:mt-8 bg-indigo-600 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl font-bold flex items-center hover:bg-indigo-700 transition mx-auto">
                <Icons.Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Add First Stage
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stage Deletion Modal */}
      {stageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 transform animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 text-left">Delete Stage?</h3>
            <p className="text-slate-500 text-sm mb-6 text-left">
              Removing this stage will permanently delete its fields and reorder the workflow. This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                disabled={isProcessing}
                onClick={() => setStageToDelete(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={handleDeleteStage}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center min-h-[44px]"
              >
                {isProcessing ? (
                  <Icons.Settings className="w-4 h-4 animate-spin" />
                ) : 'Delete Stage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageConfig;
