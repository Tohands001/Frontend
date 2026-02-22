
import React, { useState } from 'react';
import { Project, ProjectStatus, Stage, UserRole } from '../types';
import { Icons } from '../constants';

const Planning: React.FC<{ store: any; navigateTo: any }> = ({ store, navigateTo }) => {
  const { projects, createProject, deleteProject, currentUser } = store;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; projectId: string | null }>({
    isOpen: false,
    projectId: null
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', stageCount: 5 });

  const accessibleProjects = projects.filter((p: Project) =>
    currentUser!.role === UserRole.ADMIN ||
    currentUser!.projectsAccess?.includes('*') ||
    currentUser!.projectsAccess?.includes(p.id)
  );

  const handleCreate = () => {
    if (!newProject.name) return;
    createProject(newProject.name, newProject.description, newProject.stageCount);
    setIsModalOpen(false);
    setNewProject({ name: '', description: '', stageCount: 5 });
  };

  const handleDelete = async () => {
    if (deleteModal.projectId) {
      setIsDeleting(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
      deleteProject(deleteModal.projectId);
      setIsDeleting(false);
      setDeleteModal({ isOpen: false, projectId: null });
    }
  };

  const startConfig = (projectId: string) => {
    navigateTo('stage-config', projectId);
  };

  const projectToDelete = projects.find((p: any) => p.id === deleteModal.projectId);

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Project Planning</h2>
          <p className="text-sm md:text-base text-slate-500">Design workflows and configure production stages.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center"
        >
          <Icons.Plus className="w-5 h-5 mr-2" />
          Create New Project
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accessibleProjects.map((project: Project) => (
          <div key={project.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${project.status === ProjectStatus.DRAFT ? 'bg-slate-100 text-slate-600' :
                  project.status === ProjectStatus.DEVELOPMENT ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                  {project.status}
                </span>
                <span className="text-xs text-slate-400 font-mono">v{project.version}.0</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800">{project.name}</h3>
              <p className="text-slate-500 text-sm mt-2 line-clamp-2 min-h-[40px]">{project.description || 'No description provided.'}</p>

              <div className="mt-6 flex items-center text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <Icons.Planning className="w-4 h-4 mr-2 text-indigo-500" />
                <span className="font-semibold">{project.stages.length}</span>
                <span className="ml-1">stages defined</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex space-x-2">
              <button
                onClick={() => startConfig(project.id)}
                disabled={project.status === ProjectStatus.PRODUCTION && currentUser.role !== UserRole.ADMIN}
                className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Configure Stages
              </button>
              {currentUser.role === UserRole.ADMIN && (
                <button
                  onClick={() => setDeleteModal({ isOpen: true, projectId: project.id })}
                  className="p-2 border border-slate-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                  title="Delete Project"
                >
                  <Icons.Trash className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {accessibleProjects.length === 0 && (
          <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <Icons.Planning className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No projects created yet</p>
            <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-bold mt-2 hover:underline">Click here to start your first project</button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 transform transition-all animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Project?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{projectToDelete?.name}"</span>?
              This action cannot be undone. All stages and workflow data will be permanently removed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteModal({ isOpen: false, projectId: null })}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center min-h-[40px]"
              >
                {isDeleting ? (
                  <>
                    <Icons.Settings className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : 'Yes, Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 transform transition-all animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Create New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g., iPhone 15 Assembly Line"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                  placeholder="Details about the production goals and scope..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Number of Stages (1-20)</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newProject.stageCount}
                  onChange={(e) => setNewProject({ ...newProject, stageCount: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newProject.name}
                className="flex-1 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planning;
