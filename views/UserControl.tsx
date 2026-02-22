
import React, { useState, useMemo } from 'react';
import { UserRole, User, UserStatus } from '../types';
import { Icons } from '../constants';

const UserControl: React.FC<{ store: any }> = ({ store }) => {
  const { users, currentUser, updateUser, addAuditLog, setUsers, projects } = store;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: UserRole.USER,
    sectionsAccess: [] as string[],
    projectsAccess: [] as string[]
  });
  const [confirmModal, setConfirmModal] = useState<{ type: 'REVOKE' | 'TOGGLE'; userId: string; status?: UserStatus } | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // Admin sees all users for global management
  const filteredUsers = useMemo(() => {
    if (isAdmin) return users;
    return [];
  }, [users, isAdmin]);

  const handleCreate = () => {
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...newUser,
      status: UserStatus.ACTIVE,
      createdBy: currentUser.id
    };
    const updatedUsers = [...users, user];
    setUsers(updatedUsers);
    addAuditLog('User Created', undefined, undefined, null, user);
    setIsModalOpen(false);
    setNewUser({
      username: '',
      password: '',
      fullName: '',
      email: '',
      role: UserRole.USER,
      sectionsAccess: [],
      projectsAccess: []
    });
  };

  const handleEdit = (user: User) => {
    setEditingUser({ ...user, password: '' });
    setShowEditPassword(false);
  };

  const handleUpdate = () => {
    if (editingUser) {
      const originalUser = users.find((u: User) => u.id === editingUser.id);
      const updatedUser = {
        ...editingUser,
        password: editingUser.password || originalUser.password
      };
      updateUser(editingUser.id, updatedUser);
      setEditingUser(null);
    }
  };

  const handleConfirmAction = () => {
    if (!confirmModal) return;
    const { type, userId, status } = confirmModal;
    if (type === 'REVOKE') {
      updateUser(userId, { status: UserStatus.REVOKED });
    } else if (type === 'TOGGLE' && status) {
      updateUser(userId, { status });
    }
    setConfirmModal(null);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">User Management</h2>
          <p className="text-sm md:text-base text-slate-500">Global administration and system controls.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center shadow-lg shadow-indigo-600/20"
          >
            <Icons.Plus className="w-5 h-5 mr-2" />
            Add New User
          </button>
        )}
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">User Profile</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Access Access</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user: User) => (
                <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.status === UserStatus.REVOKED ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 border border-indigo-100">
                        {(user.fullName || user.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">{user.fullName || user.username}</span>
                        <span className="text-[10px] text-slate-400 font-mono italic">@{user.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${user.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' :
                      user.role === UserRole.MODERATOR ? 'bg-orange-100 text-orange-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {user.role === UserRole.ADMIN ? (
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded">All System Access</span>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {user.sectionsAccess?.map(s => (
                              <span key={s} className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{s}</span>
                            ))}
                          </div>
                          {user.projectsAccess?.length > 0 && (
                            <div className="text-[10px] text-indigo-500 font-bold mt-1">
                              {user.projectsAccess.length} Project{user.projectsAccess.length > 1 ? 's' : ''} Linked
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin && user.id !== currentUser.id ? (
                      <div className="flex justify-end space-x-2 text-xs">
                        <button onClick={() => handleEdit(user)} className="text-indigo-600 font-bold hover:underline">Edit</button>
                        <button onClick={() => setConfirmModal({
                          type: 'TOGGLE',
                          userId: user.id,
                          status: user.status === UserStatus.ACTIVE ? UserStatus.DISABLED : UserStatus.ACTIVE
                        })} className="text-slate-500 font-bold hover:underline">
                          {user.status === UserStatus.ACTIVE ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => setConfirmModal({ type: 'REVOKE', userId: user.id })} className="text-red-500 font-bold hover:underline">Revoke</button>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-[9px] uppercase font-bold">System Protected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 overflow-y-auto">
          <div className="bg-[#1e293b] w-full max-w-2xl rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-10 my-4 md:my-8 border border-slate-700/50 animate-in zoom-in-95 duration-200">
            <header className="flex justify-between items-center mb-6 md:mb-10 text-white">
              <h3 className="text-xl md:text-3xl font-black flex items-center tracking-tight">
                <div className="w-10 h-10 md:w-12 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white mr-3 md:mr-4 shadow-xl shadow-indigo-600/20 shrink-0">
                  <Icons.UserControl className="w-6 h-6 md:w-7 h-7" />
                </div>
                Configure Access
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-2 transition-colors">
                <Icons.Plus className="w-6 h-6 md:w-8 md:h-8 rotate-45" />
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Basic Info */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Member Role Profile</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => {
                      const role = e.target.value as UserRole;
                      setNewUser({
                        ...newUser,
                        role,
                        sectionsAccess: role === UserRole.USER ? ['mes'] : ['planning', 'execution', 'mes']
                      });
                    }}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold transition-all outline-none"
                  >
                    <option value={UserRole.USER}>User (Operator Access Only)</option>
                    <option value={UserRole.MODERATOR}>Moderator (Restricted Admin)</option>
                    <option value={UserRole.ADMIN}>Administrator (Full System)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Full Identity Name</label>
                    <input
                      type="text"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      placeholder="e.g. Robert Fox"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 text-white placeholder:text-slate-600 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Work Email Access</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="robert@factory.com"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 text-white placeholder:text-slate-600 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Username ID</label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      placeholder="robert.f"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 text-white placeholder:text-slate-600 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Initial Password</label>
                    <input
                      type="text"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="SecurePass123"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 text-white placeholder:text-slate-600 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Permissioning */}
              <div className="space-y-6">
                {newUser.role === UserRole.MODERATOR && (
                  <div className="animate-in fade-in slide-in-from-right-4">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Sections Authorized</label>
                    <div className="bg-slate-800/30 rounded-3xl p-6 border border-slate-700/50 space-y-3">
                      {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'planning', label: 'Building (Planning)' },
                        { id: 'execution', label: 'Execution' },
                        { id: 'mes', label: 'MES System' },
                        { id: 'traceability', label: 'Traceability' },
                        { id: 'users', label: 'User Control' }
                      ].map(section => (
                        <label key={section.id} className="flex items-center space-x-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={newUser.sectionsAccess.includes(section.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setNewUser({
                                ...newUser,
                                sectionsAccess: checked
                                  ? [...newUser.sectionsAccess, section.id]
                                  : newUser.sectionsAccess.filter(s => s !== section.id)
                              });
                            }}
                            className="w-5 h-5 rounded-lg border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500/20"
                          />
                          <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest group-hover:text-white transition-colors">{section.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(newUser.role === UserRole.USER || newUser.role === UserRole.MODERATOR) && (
                  <div className="animate-in fade-in slide-in-from-right-4">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Specific MES Projects Access</label>
                    <div className="bg-slate-800/80 rounded-3xl p-6 border border-slate-700/50 space-y-4">
                      {/* Search Bar Placeholder */}
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          placeholder="Search projects..."
                          className="w-full bg-[#111827] border border-slate-700/50 rounded-xl px-4 py-3 text-xs font-medium text-slate-400 outline-none"
                        />
                      </div>

                      <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-2">
                        {/* All Projects Toggle */}
                        <label className="flex items-center space-x-3 p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl transition-colors cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={newUser.projectsAccess.includes('*')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setNewUser({
                                ...newUser,
                                projectsAccess: checked ? ['*'] : []
                              });
                            }}
                            className="w-5 h-5 rounded-lg border-indigo-500 bg-slate-700 text-indigo-500 focus:ring-indigo-500/20"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-indigo-100 text-xs">All Projects (*)</span>
                          </div>
                        </label>

                        {/* Specific Projects (Visible only if All Projects not ticked) */}
                        {!newUser.projectsAccess.includes('*') && projects.map((p: any) => (
                          <label key={p.id} className="flex items-center space-x-3 p-2 hover:bg-slate-700/50 rounded-xl transition-colors cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={newUser.projectsAccess.includes(p.id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setNewUser({
                                  ...newUser,
                                  projectsAccess: checked
                                    ? [...newUser.projectsAccess, p.id]
                                    : newUser.projectsAccess.filter(id => id !== p.id)
                                });
                              }}
                              className="w-5 h-5 rounded-lg border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500/20"
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-300 text-xs">{p.name}</span>
                              <span className="text-[9px] text-slate-500 uppercase font-mono">{p.id}</span>
                            </div>
                          </label>
                        ))}
                        {projects.length === 0 && !newUser.projectsAccess.includes('*') && (
                          <p className="text-[10px] font-bold text-slate-500 text-center py-4 italic">No active projects available</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {newUser.role === UserRole.ADMIN && (
                  <div className="h-full flex flex-col items-center justify-center p-10 bg-indigo-600/10 rounded-3xl border border-indigo-500/20 text-center">
                    <Icons.Flash className="w-12 h-12 text-indigo-400 mb-4 opacity-50" />
                    <p className="text-sm font-black text-indigo-100 leading-tight">Administrators have global access bypass.</p>
                    <p className="text-xs text-indigo-400 font-medium mt-2">No specific section or project assignment required.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8 md:mt-12 bg-slate-800/30 p-2 rounded-2xl md:rounded-[2rem] border border-slate-700/50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:flex-1 px-4 md:px-8 py-3 md:py-5 rounded-xl md:rounded-[1.8rem] font-black text-slate-400 hover:text-white transition-colors uppercase text-[10px] tracking-widest min-h-[50px]"
              >
                Discard Changes
              </button>
              <button
                onClick={handleCreate}
                disabled={!newUser.username || !newUser.password || !newUser.fullName}
                className="w-full sm:flex-1 px-4 md:px-8 py-3 md:py-5 bg-indigo-600 rounded-xl md:rounded-[1.8rem] font-black text-white hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 disabled:opacity-50 disabled:shadow-none uppercase text-[10px] tracking-widest min-h-[50px]"
              >
                Provision Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal (Mirroring the darker theme) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 overflow-y-auto">
          <div className="bg-[#1e293b] w-full max-w-2xl rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-10 my-4 md:my-8 border border-slate-700/50 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl md:text-3xl font-black text-white mb-6 md:mb-8 flex items-center tracking-tight">
              <div className="w-10 h-10 md:w-12 bg-slate-700 rounded-xl md:rounded-2xl flex items-center justify-center text-white mr-3 md:mr-4 shadow-xl shrink-0">
                <Icons.UserControl className="w-6 h-6 md:w-7 h-7" />
              </div>
              Edit Profile Access
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Role Authority</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 text-white font-bold outline-none"
                  >
                    <option value={UserRole.USER}>User (Operator)</option>
                    <option value={UserRole.MODERATOR}>Moderator</option>
                    <option value={UserRole.ADMIN}>Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Full Identity</label>
                  <input
                    type="text"
                    value={editingUser.fullName}
                    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 text-white font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Username ID</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 text-white font-bold outline-none"
                  />
                </div>
                {/* Password Update Field (Hidden if editing self) */}
                {currentUser.id !== editingUser.id && (
                  <div className="relative">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Change Password (Leave blank to keep current)</label>
                    <div className="relative group">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        value={editingUser.password}
                        onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="w-full px-5 py-4 pr-14 rounded-2xl border border-slate-700/50 bg-slate-800/50 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      >
                        {showEditPassword ? <Icons.EyeOff className="w-5 h-5" /> : <Icons.Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {editingUser.role === UserRole.MODERATOR && (
                  <div className="animate-in fade-in">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Section Access</label>
                    <div className="bg-slate-800/30 rounded-3xl p-6 border border-slate-700/50 space-y-2">
                      {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'planning', label: 'Building (Planning)' },
                        { id: 'execution', label: 'Execution' },
                        { id: 'mes', label: 'MES System' },
                        { id: 'traceability', label: 'Traceability' },
                        { id: 'users', label: 'User Control' }
                      ].map(section => (
                        <label key={section.id} className="flex items-center space-x-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={editingUser.sectionsAccess?.includes(section.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const sections = editingUser.sectionsAccess || [];
                              setEditingUser({
                                ...editingUser,
                                sectionsAccess: checked
                                  ? [...sections, section.id]
                                  : sections.filter(s => s !== section.id)
                              });
                            }}
                            className="w-5 h-5 rounded-lg border-slate-600 bg-slate-700 text-indigo-600"
                          />
                          <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest group-hover:text-white transition-colors">{section.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(editingUser.role === UserRole.USER || editingUser.role === UserRole.MODERATOR) && (
                  <div className="animate-in fade-in">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Linked Projects</label>
                    <div className="bg-slate-800/80 rounded-3xl p-6 border border-slate-700/50 space-y-3">
                      {/* All Projects Toggle */}
                      <label className="flex items-center space-x-3 p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={editingUser.projectsAccess?.includes('*')}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditingUser({
                              ...editingUser,
                              projectsAccess: checked ? ['*'] : []
                            });
                          }}
                          className="w-5 h-5 rounded-lg border-indigo-500 bg-slate-700 text-indigo-500"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-indigo-100 text-xs">All Projects (*)</span>
                        </div>
                      </label>

                      <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {!editingUser.projectsAccess?.includes('*') && projects.map((p: any) => (
                          <label key={p.id} className="flex items-center space-x-3 p-2 hover:bg-slate-700/50 rounded-xl cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={editingUser.projectsAccess?.includes(p.id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const projectIds = editingUser.projectsAccess || [];
                                setEditingUser({
                                  ...editingUser,
                                  projectsAccess: checked
                                    ? [...projectIds, p.id]
                                    : projectIds.filter(id => id !== p.id)
                                });
                              }}
                              className="w-5 h-5 rounded-lg border-slate-600 bg-slate-700 text-indigo-600"
                            />
                            <span className="font-bold text-slate-300 text-xs group-hover:text-white transition-colors">{p.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8 md:mt-12 bg-slate-800/30 p-2 rounded-2xl md:rounded-[2rem] border border-slate-700/50">
              <button
                onClick={() => setEditingUser(null)}
                className="w-full sm:flex-1 px-4 md:px-8 py-3 md:py-5 rounded-xl md:rounded-[1.8rem] text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors min-h-[50px]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="w-full sm:flex-1 px-4 md:px-8 py-3 md:py-5 bg-indigo-600 rounded-xl md:rounded-[1.8rem] font-black text-white hover:bg-indigo-500 shadow-xl transition-all uppercase text-[10px] tracking-widest min-h-[50px]"
              >
                Commit Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ... Confirmation Modal (Unchanged) ... */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-10 animate-in fade-in zoom-in duration-200 text-center border border-slate-100">
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-2xl shadow-red-500/10 ${confirmModal.type === 'REVOKE' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
              <Icons.UserControl className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 leading-tight">
              {confirmModal.type === 'REVOKE' ? 'Revoke System Access?' : `Apply Account ${confirmModal.status === UserStatus.ACTIVE ? 'Activation' : 'Restriction'}?`}
            </h3>
            <p className="text-slate-500 text-xs md:text-sm font-medium mb-6 md:mb-8">
              {confirmModal.type === 'REVOKE'
                ? 'This action is immediate and permanent. The user will be barred from all platform services.'
                : `The user account will be ${confirmModal.status === UserStatus.ACTIVE ? 'restored to full operational status' : 'temporarily suspended'}.`}
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleConfirmAction}
                className={`w-full py-3 md:py-4 text-white rounded-xl md:rounded-2xl font-black transition-all shadow-xl uppercase text-[10px] tracking-widest ${confirmModal.type === 'REVOKE' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-slate-900 hover:bg-black shadow-slate-900/20'}`}
              >
                Yes, Proceed
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="w-full py-3 md:py-4 bg-white border border-slate-200 text-slate-400 rounded-xl md:rounded-2xl font-black hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest"
              >
                Cancel Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserControl;
