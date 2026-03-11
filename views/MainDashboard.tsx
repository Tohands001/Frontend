import React from 'react';
import { Icons } from '../constants';

const MainDashboard: React.FC<{ store: any; navigateTo: any }> = ({ store, navigateTo }) => {
  const { currentUser } = store;

  const modules = [
    {
      id: 'supply-demand',
      label: 'Supply & Demand',
      description: 'Inventory management and supply chain optimization.',
      icon: Icons.Collection,
      color: 'bg-blue-500',
      shadow: 'shadow-blue-500/20',
      status: 'Coming Soon'
    },
    {
      id: 'communication',
      label: 'Communication',
      description: 'Internal team collaboration and notification hub.',
      icon: Icons.Chat,
      color: 'bg-purple-500',
      shadow: 'shadow-purple-500/20',
      status: 'Coming Soon'
    },
    {
      id: 'planning-execution',
      label: 'Planning & Execution',
      description: 'Strategic planning and resource allocation.',
      icon: Icons.PresentationChart,
      color: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/20',
      status: 'Coming Soon'
    },
    {
      id: 'mes-section',
      label: 'MES System',
      description: 'Manufacturing Execution System for real-time control.',
      icon: Icons.MES,
      color: 'bg-indigo-500',
      shadow: 'shadow-indigo-500/20',
      status: 'Active'
    },
    {
      id: 'erp-system',
      label: 'ERP System',
      description: 'Enterprise Resource Planning and finance integration.',
      icon: Icons.OfficeBuilding,
      color: 'bg-rose-500',
      shadow: 'shadow-rose-500/20',
      status: 'Coming Soon'
    },
    {
      id: 'users',
      label: 'User Control',
      description: 'Administrative tools and access management.',
      icon: Icons.UserControl,
      color: 'bg-amber-500',
      shadow: 'shadow-amber-500/20',
      status: 'Active'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 animate-in fade-in duration-700">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Welcome back, <span className="text-indigo-600">{currentUser.fullName}</span>
        </h1>
        <p className="text-slate-500 mt-2 text-lg font-medium">Select a module to begin your operations.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => navigateTo(mod.id)}
            className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 text-left transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-indigo-100"
          >
            <div className={`w-16 h-16 ${mod.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-2xl ${mod.shadow} group-hover:scale-110 transition-transform duration-300`}>
              <mod.icon className="w-8 h-8" />
            </div>
            
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-bold text-slate-900">{mod.label}</h3>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${mod.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                {mod.status}
              </span>
            </div>
            
            <p className="text-slate-500 leading-relaxed font-medium">
              {mod.description}
            </p>

            <div className="mt-8 flex items-center text-indigo-600 font-bold text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
              Launch Module <Icons.ChevronRight className="w-4 h-4 ml-2" />
            </div>

            {/* Decorative background element */}
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-indigo-50/50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </button>
        ))}
      </div>

      <footer className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center text-slate-400">
        <p className="text-xs font-bold uppercase tracking-[0.2em]">TMLWM Manufacturing OS v2.0</p>
        <div className="flex gap-6">
          <span className="text-[10px] font-black tracking-tighter italic">Enterprise Edition</span>
        </div>
      </footer>
    </div>
  );
};

export default MainDashboard;
