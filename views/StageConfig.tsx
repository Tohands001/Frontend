
import React, { useState } from 'react';
import { Project, Stage, FieldType, StageField } from '../types';
import { Icons } from '../constants';

const StageConfig: React.FC<{ store: any; projectId: string; navigateTo: any }> = ({ store, projectId, navigateTo }) => {
  const { projects, updateProject } = store;
  const project = projects.find((p: any) => p.id === projectId);
  const [selectedStageIdx, setSelectedStageIdx] = useState(0);

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

  const updateStageName = (idx: number, name: string) => {
    const stages = [...project.stages];
    stages[idx].name = name;
    updateProject(projectId, { stages });
  };

  const currentStage = project.stages[selectedStageIdx];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigateTo('planning')} className="p-2 hover:bg-white rounded-full transition shadow-sm">
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{project.name}</h2>
            <p className="text-slate-500">Stage Configuration & Field Builder</p>
          </div>
        </div>
        <button
          onClick={() => navigateTo('sn-config', projectId)}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition"
        >
          Save & Continue
        </button>
      </header>

      <div className="flex h-[calc(100vh-250px)] gap-6">
        {/* Stage List Sidebar */}
        <div className="w-72 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Workflow</h3>
            <button onClick={addStage} className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition">
              <Icons.Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {project.stages.map((stage: Stage, idx: number) => (
              <div
                key={stage.id}
                onClick={() => setSelectedStageIdx(idx)}
                className={`relative flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedStageIdx === idx ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mr-3 ${selectedStageIdx === idx ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 truncate pr-6">
                  <p className="font-bold text-slate-800 truncate text-sm">{stage.name}</p>
                </div>
                {idx < project.stages.length - 1 && (
                  <div className="absolute -bottom-3 left-6 w-0.5 h-3 bg-slate-200"></div>
                )}
              </div>
            ))}
            {project.stages.length === 0 && (
              <p className="text-center text-slate-400 text-sm mt-10">Add your first stage to begin.</p>
            )}
          </div>
        </div>

        {/* Stage Editor */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          {currentStage ? (
            <>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex-1">
                  <input
                    value={currentStage.name}
                    onChange={(e) => updateStageName(selectedStageIdx, e.target.value)}
                    className="text-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 px-2 py-1 rounded"
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
                <div className="flex space-x-4 items-center">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Operators</label>
                    <select
                      multiple
                      className="text-xs font-bold border rounded-lg px-2 py-1 bg-slate-50 border-slate-200 min-h-[60px]"
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
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fail Routing</label>
                    <select
                      className="text-xs font-bold border rounded-lg px-2 py-1 bg-slate-50 border-slate-200"
                      onChange={(e) => {
                        const stages = [...project.stages];
                        stages[selectedStageIdx].failRouteStageId = e.target.value;
                        updateProject(projectId, { stages });
                      }}
                      value={currentStage.failRouteStageId || ''}
                    >
                      <option value="">Default Fail (Prev Stage)</option>
                      {project.stages.filter((s: any) => s.id !== currentStage.id).map((s: any) => (
                        <option key={s.id} value={s.id}>Fail → {s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                      className="flex items-center space-x-3 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-indigo-400 hover:shadow-sm transition group"
                    >
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-indigo-600 border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                        <btn.icon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">{btn.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Configured Fields</h4>
                  {currentStage.fields.map((field, fIdx) => (
                    <div key={field.id} className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mr-4 border border-slate-100">
                        {field.type === FieldType.SERIAL_NUMBER ? <Icons.ChevronRight className="text-indigo-500" /> : <Icons.Dashboard className="text-indigo-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <input
                            value={field.label}
                            onChange={(e) => {
                              const stages = [...project.stages];
                              stages[selectedStageIdx].fields[fIdx].label = e.target.value;
                              updateProject(projectId, { stages });
                            }}
                            className="bg-transparent font-bold text-slate-800 focus:outline-none"
                          />
                          <span className="ml-2 px-2 py-0.5 bg-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase">{field.type}</span>
                        </div>
                        <div className="mt-1 flex items-center space-x-4">
                          <label className="flex items-center space-x-2 text-xs text-slate-500 cursor-pointer">
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
                      <button className="text-red-400 hover:text-red-600 transition p-2">
                        <Icons.Trash className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {currentStage.fields.length === 0 && (
                    <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                      <p className="text-slate-400">No fields added to this stage yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Icons.Planning className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">No Stage Selected</h3>
              <p className="text-slate-500 max-w-sm mt-2">Select a stage from the sidebar or add a new one to start configuring the data entry fields for your shop floor operators.</p>
              <button onClick={addStage} className="mt-8 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center hover:bg-indigo-700 transition">
                <Icons.Plus className="w-5 h-5 mr-2" />
                Add First Stage
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StageConfig;
