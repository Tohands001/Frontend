
import React, { useState } from 'react';
import { Project, ProjectStatus, FieldType } from '../types';
import { Icons } from '../constants';

const SNConfig: React.FC<{ store: any; projectId: string; navigateTo: any }> = ({ store, projectId, navigateTo }) => {
  const { projects, updateProject, addAuditLog } = store;
  const project = projects.find((p: any) => p.id === projectId);
  const [isSimulating, setIsSimulating] = useState(false);

  if (!project) return <div>Project not found</div>;

  const handleCompleteSetup = () => {
    setIsSimulating(true);
    setTimeout(() => {
      // Extract all SN related field labels
      const snFields = project.stages.flatMap(s => s.fields.filter(f => f.type === FieldType.SERIAL_NUMBER || f.type === FieldType.SUB_SERIAL_NUMBER));

      const snFormats: Record<string, string> = {};
      snFields.forEach(f => {
        snFormats[f.label] = '^[A-Z0-9]{5,15}$'; // Generic pattern for MVP
      });

      // Default sample if none found
      if (Object.keys(snFormats).length === 0) {
        snFormats['Main Serial Number'] = '^[A-Z]{3}-[0-9]{6}$';
      }

      updateProject(projectId, {
        status: ProjectStatus.DEVELOPMENT,
        snFormats
      });
      addAuditLog('Setup Completed & Formats Learned', projectId);
      setIsSimulating(false);
      navigateTo('planning');
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-10">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Serial Number Configuration</h2>
        <p className="text-slate-500 mt-2">Train the identification engine to recognize your production formats.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="space-y-6">
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Step 1: Download Template
            </h3>
            <p className="text-sm text-indigo-700 mt-2">The system will generate a CSV file with headers matching all SN and Sub-SN fields you defined in your stages.</p>
            <button className="mt-4 bg-white text-indigo-600 px-5 py-2 rounded-xl font-bold border border-indigo-200 hover:bg-indigo-100 transition shadow-sm">
              Download Template (.csv)
            </button>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              Step 2: Upload Samples
            </h3>
            <p className="text-sm text-slate-600 mt-2">Populate the template with 10-20 examples of valid Serial Numbers. Our engine will learn the patterns automatically.</p>

            <div className="mt-6 border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center bg-white">
              <Icons.Plus className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-slate-400 font-medium">Click to upload completed template</p>
              <input type="file" className="hidden" />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col space-y-4">
          <button
            onClick={handleCompleteSetup}
            disabled={isSimulating}
            className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${isSimulating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
          >
            {isSimulating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Engine is learning formats...
              </span>
            ) : 'Complete Project Setup'}
          </button>
          <button
            onClick={() => navigateTo('stage-config', projectId)}
            className="w-full py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition"
          >
            Back to Configuration
          </button>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start space-x-3">
        <div className="p-1 bg-blue-100 rounded text-blue-600 mt-0.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>Note:</strong> Once setup is completed, the project will move to the <strong>Development</strong> phase. Workflow changes will be locked, but testing with simulated serial numbers will be enabled.
        </p>
      </div>
    </div>
  );
};

export default SNConfig;
