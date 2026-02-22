
import React from 'react';
import { Project, ProjectStatus, UserRole } from '../types';
import { Icons } from '../constants';

const Execution: React.FC<{ store: any; navigateTo: any }> = ({ store, navigateTo }) => {
  const { projects, updateProject, addAuditLog, currentUser } = store;

  const accessibleProjects = projects.filter((p: Project) =>
    currentUser!.role === UserRole.ADMIN ||
    currentUser!.projectsAccess?.includes('*') ||
    currentUser!.projectsAccess?.includes(p.id)
  );

  const handlePromote = (projectId: string) => {
    const project = projects.find((p: any) => p.id === projectId);
    if (confirm(`Promote ${project.name} to Production? This will lock all configurations and enable shop floor deployment.`)) {
      updateProject(projectId, { status: ProjectStatus.PRODUCTION });
      addAuditLog('Project Promoted to Production', projectId);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Execution Lifecycle</h2>
        <p className="text-slate-500 mt-1">Manage project transitions from development to live factory floor deployment.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Development Column */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 px-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Development Phase</h3>
          </div>

          <div className="space-y-4">
            {accessibleProjects.filter((p: any) => p.status === ProjectStatus.DEVELOPMENT).map((project: Project) => (
              <div key={project.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-bold text-slate-800">{project.name}</h4>
                  <span className="text-xs font-mono text-slate-400">v{project.version}.0</span>
                </div>
                <div className="flex items-center space-x-6 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Stages</span>
                    <span className="text-lg font-bold text-slate-700">{project.stages.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Linked SNs</span>
                    <span className="text-lg font-bold text-slate-700">0</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Health</span>
                    <span className="text-lg font-bold text-green-500">100%</span>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigateTo('mes')}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
                  >
                    Test Sandbox
                  </button>
                  <button
                    onClick={() => handlePromote(project.id)}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/10"
                  >
                    Release to Production
                  </button>
                </div>
              </div>
            ))}
            {accessibleProjects.filter((p: any) => p.status === ProjectStatus.DEVELOPMENT).length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <p className="text-slate-400">No projects currently in development.</p>
              </div>
            )}
          </div>
        </div>

        {/* Production Column */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 px-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Production</h3>
          </div>

          <div className="space-y-4">
            {accessibleProjects.filter((p: any) => p.status === ProjectStatus.PRODUCTION).map((project: Project) => (
              <div key={project.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-bold text-slate-800">{project.name}</h4>
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  </div>
                  <span className="text-xs font-mono text-slate-400 text-right">LOCKED<br />v{project.version}.0</span>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-tight text-slate-400">
                    <span>Throughput</span>
                    <span className="text-slate-700">84%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full w-[84%]"></div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigateTo('mes')}
                    className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
                  >
                    View Station Load
                  </button>
                  <button
                    className="px-4 border border-slate-200 text-slate-500 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
            {accessibleProjects.filter((p: any) => p.status === ProjectStatus.PRODUCTION).length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <p className="text-slate-400">No active production workflows.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Execution;
