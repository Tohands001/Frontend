
import React, { useState } from 'react';
import { useStore } from './store';
import { UserRole } from './types';
import { Icons } from './constants';

// Views
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Planning from './views/Planning';
import StageConfig from './views/StageConfig';
import SNConfig from './views/SNConfig';
import Execution from './views/Execution';
import MES from './views/MES';
import Traceability from './views/Traceability';
import UserControl from './views/UserControl';

const App: React.FC = () => {
  const store = useStore();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Deep-link detection for Isolated Terminal Mode
  const urlParams = new URLSearchParams(window.location.search);
  const deepProjectId = urlParams.get('projectId');
  const deepStageId = urlParams.get('stageId');
  const isIsolatedTerminal = !!(deepProjectId && deepStageId);

  const handleLogin = (username: string, password?: string) => {
    const result = store.login(username, password);
    if (result.success) {
      if (store.currentUser?.role === UserRole.USER) {
        setActiveView('mes');
      } else {
        setActiveView('planning');
      }
    }
    return result;
  };

  if (!store.currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle Isolated Terminal Rendering
  if (isIsolatedTerminal) {
    return (
      <div className="h-screen bg-slate-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <MES
            store={store}
            navigateTo={() => { }}
            initialProjectId={deepProjectId}
            initialStageId={deepStageId}
            isIsolated={true}
          />
        </div>
      </div>
    );
  }

  const navigateTo = (view: string, projectId: string | null = null) => {
    setActiveView(view);
    setSelectedProjectId(projectId);
    setIsSidebarOpen(false); // Close sidebar on navigation (mobile)
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'planning', label: 'Building (Planning)', icon: Icons.Planning, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'execution', label: 'Execution', icon: Icons.Execution, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'mes', label: 'MES System', icon: Icons.MES, roles: [UserRole.ADMIN, UserRole.MODERATOR, UserRole.USER] },
    { id: 'traceability', label: 'Traceability', icon: Icons.Traceability, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'users', label: 'User Control', icon: Icons.UserControl, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
  ];

  const filteredNavItems = navItems.filter(item => {
    const userRole = store.currentUser!.role;
    if (!item.roles.includes(userRole)) return false;
    if (userRole === UserRole.MODERATOR) {
      return store.currentUser?.sectionsAccess?.includes(item.id);
    }
    return true;
  });

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard store={store} navigateTo={navigateTo} />;
      case 'planning': return <Planning store={store} navigateTo={navigateTo} />;
      case 'stage-config': return <StageConfig store={store} projectId={selectedProjectId!} navigateTo={navigateTo} />;
      case 'sn-config': return <SNConfig store={store} projectId={selectedProjectId!} navigateTo={navigateTo} />;
      case 'execution': return <Execution store={store} navigateTo={navigateTo} />;
      case 'mes': return <MES store={store} navigateTo={navigateTo} />;
      case 'traceability': return <Traceability store={store} />;
      case 'users': return <UserControl store={store} />;
      default: return <Dashboard store={store} navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-indigo-400">TMLWM</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Manufacturing Platform</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
            <Icons.Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeView === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 px-4 py-3 bg-slate-800 rounded-lg mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm">
              {store.currentUser.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{store.currentUser.username}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">{store.currentUser.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={store.logout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <Icons.Logout className="w-5 h-5" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-slate-900">TMLWM</span>
          <div className="w-10"></div> {/* Spacer */}
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
