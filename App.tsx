
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
import InfoCentre from './views/InfoCentre';
import UserControl from './views/UserControl';
import Rework from './views/Rework';
import MRBDashboard from './views/MRBDashboard';
import StationView from './views/StationView';

import ComingSoon from './views/ComingSoon';
import MainDashboard from './views/MainDashboard';



const App: React.FC = () => {
  const store = useStore();
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'main-dashboard';
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('projectId');
  });
  const [selectedStageId, setSelectedStageId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('stageId');
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const mesViews = ['dashboard', 'planning', 'execution', 'rework', 'mrb-board', 'info-centre', 'mes', 'stage-config', 'sn-config', 'station-view'];

  const [currentSection, setCurrentSection] = useState<'main' | 'mes'>(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') || 'dashboard';
    return mesViews.includes(view) ? 'mes' : 'main';
  });


  // Sync state to URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', activeView);
    if (selectedProjectId) {
      params.set('projectId', selectedProjectId);
    } else {
      params.delete('projectId');
    }
    if (selectedStageId) {
      params.set('stageId', selectedStageId);
    } else {
      params.delete('stageId');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    // Sync section with view
    if (mesViews.includes(activeView)) {
      setCurrentSection('mes');
    } else {
      setCurrentSection('main');
    }
  }, [activeView, selectedProjectId, selectedStageId]);


  // Deep-link detection for Isolated Terminal Mode
  const urlParams = new URLSearchParams(window.location.search);
  const deepProjectId = urlParams.get('projectId');
  const deepStageId = urlParams.get('stageId');
  const queryView = urlParams.get('view');
  // Isolated Terminal Mode: triggered by projectId+stageId but NOT if explicitly requesting station-view
  const isIsolatedTerminal = !!(deepProjectId && deepStageId && queryView !== 'station-view');

  const handleLogin = (username: string, password?: string) => {
    const result = store.login(username, password);
    if (result.success) {
      setActiveView('main-dashboard');
      setCurrentSection('main');
    }

    return result;
  };

  if (!store.currentUser) {
    return <Login onLogin={handleLogin} />;
  }

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

  const navigateTo = (view: string, projectId: string | null = null, stageId: string | null = null) => {
    if (view === 'mes-section') {
      setActiveView('dashboard');
      setCurrentSection('mes');
      setIsSidebarOpen(false);
      return;
    }
    if (view === 'main-dashboard') {
      setActiveView('main-dashboard');
      setCurrentSection('main');
      setIsSidebarOpen(false);
      return;
    }
    setActiveView(view);

    setSelectedProjectId(projectId);
    setSelectedStageId(stageId);
    setIsSidebarOpen(false); // Close sidebar on navigation (mobile)
  };

  const mainNavItems = [
    { id: 'supply-demand', label: 'Supply & Demand', icon: Icons.Collection, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'communication', label: 'Communication', icon: Icons.Chat, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'planning-execution', label: 'Planning & Execution', icon: Icons.PresentationChart, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'mes-section', label: 'MES System', icon: Icons.MES, roles: [UserRole.ADMIN, UserRole.MODERATOR, UserRole.USER] },
    { id: 'erp-system', label: 'ERP System', icon: Icons.OfficeBuilding, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'users', label: 'User Control', icon: Icons.UserControl, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
  ];

  const mesNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'planning', label: 'Building (Planning)', icon: Icons.Planning, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'execution', label: 'Execution', icon: Icons.Execution, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'rework', label: 'Rework Station', icon: Icons.Refresh, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'mrb-board', label: 'MRB Board', icon: Icons.Lock, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'info-centre', label: 'Info Centre', icon: Icons.Traceability, roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    { id: 'mes', label: 'Factory Terminal', icon: Icons.MES, roles: [UserRole.ADMIN, UserRole.MODERATOR, UserRole.USER] },
  ];

  const filteredNavItems = (currentSection === 'mes' ? mesNavItems : mainNavItems).filter(item => {
    const userRole = store.currentUser!.role;
    if (!item.roles.includes(userRole)) return false;
    if (userRole === UserRole.MODERATOR) {
      return store.currentUser?.sectionsAccess?.includes(item.id);
    }
    return true;
  });


  const renderView = () => {
    switch (activeView) {
      case 'main-dashboard': return <MainDashboard store={store} navigateTo={navigateTo} />;
      case 'dashboard': return <Dashboard store={store} navigateTo={navigateTo} />;

      case 'planning': return <Planning store={store} navigateTo={navigateTo} />;
      case 'stage-config': return <StageConfig store={store} projectId={selectedProjectId!} navigateTo={navigateTo} />;
      case 'sn-config': return <SNConfig store={store} projectId={selectedProjectId!} navigateTo={navigateTo} />;
      case 'execution': return <Execution store={store} navigateTo={navigateTo} />;
      case 'mes': return <MES store={store} navigateTo={navigateTo} />;
      case 'rework': return <Rework store={store} />;
      case 'mrb-board': return <MRBDashboard store={store} />;
      case 'info-centre': return <InfoCentre store={store} />;
      case 'users': return <UserControl store={store} />;
      case 'station-view': return <StationView store={store} projectId={selectedProjectId!} stageId={selectedStageId!} />;
      case 'supply-demand':
      case 'communication':
      case 'planning-execution':
      case 'erp-system':
        return <ComingSoon />;
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
          <a
            href="?view=main-dashboard"
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button !== 1) {
                e.preventDefault();
                navigateTo('main-dashboard');
              }
            }}
            className="block hover:opacity-80 transition-opacity"
          >

            <h1 className="text-xl font-bold tracking-tight text-indigo-400">TMLWM</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Manufacturing Platform</p>
          </a>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
            <Icons.Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {currentSection === 'mes' && (
            <button
              onClick={() => setCurrentSection('main')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-indigo-400 hover:bg-slate-800 transition-all duration-200 mb-4 border border-indigo-500/20"
            >
              <Icons.ChevronLeft className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wider">Back to Main</span>
            </button>
          )}

          <div className="mb-4 px-4">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              {currentSection === 'mes' ? 'MES Operations' : 'Primary Navigation'}
            </h2>
          </div>

          {filteredNavItems.map((item) => (

            <a
              key={item.id}
              href={`?view=${item.id}`}
              onClick={(e) => {
                // SPA Navigation: Only prevent default if not a special click
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button !== 1) {
                  e.preventDefault();
                  navigateTo(item.id);
                }
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeView === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </a>
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
          {activeView !== 'main-dashboard' && (
            <div className="flex items-center space-x-4 mb-6 animate-in fade-in slide-in-from-left-4">
              <button 
                onClick={() => navigateTo('main-dashboard')}
                className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm group"
              >
                <Icons.ChevronLeft className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Back</span>
              </button>
              
              <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <button onClick={() => navigateTo('main-dashboard')} className="hover:text-indigo-600 transition-colors">Home</button>
                <Icons.ChevronRight className="w-3 h-3 opacity-30" />
                <span className="text-slate-900">{
                  [...mainNavItems, ...mesNavItems].find(i => i.id === activeView)?.label || activeView.replace('-', ' ')
                }</span>
              </div>
            </div>
          )}
          {renderView()}
        </div>

      </main>
    </div>
  );
};

export default App;
