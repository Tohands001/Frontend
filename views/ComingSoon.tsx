import React from 'react';

const ComingSoon: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in zoom-in duration-500">
      <div className="bg-white p-12 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 max-w-lg w-full transform transition-all hover:scale-[1.01]">
        <div className="w-24 h-24 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3 hover:rotate-0 transition-transform duration-300">
          <svg className="w-12 h-12 text-indigo-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Coming Soon</h2>
        <p className="text-slate-500 text-lg leading-relaxed font-medium">
          We are actively working on this module. <br />
          Stay tuned for updates!
        </p>
        
        <div className="mt-12 pt-8 border-t border-slate-50">
          <div className="flex justify-center space-x-3">
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
          </div>
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black mt-6">Module Under Development</p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
