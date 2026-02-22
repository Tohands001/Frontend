
import { useState, useEffect, useCallback } from 'react';
import {
  User, Project, UserRole, ProjectStatus, AuditLog,
  SerialNumberRecord, Stage, FieldType, UserStatus,
  SerialType, SerialStatus
} from './types';

const SEED_PROJECTS: Project[] = [
  {
    id: 'main-line-001',
    name: 'TML Main Production (12 Stations)',
    description: 'High-volume production line with strict sequential flow and 12 quality checkpoints.',
    status: ProjectStatus.PRODUCTION,
    version: 4,
    stages: Array.from({ length: 12 }, (_, i) => ({
      id: `st-${i + 1}`,
      name: `Station ${i + 1}: ${['Assembly', 'Calibration', 'Programming', 'Merge Point', 'Testing', 'Inspec', 'Packing', 'Labeling', 'Audit', 'Buffer', 'Cleaning', 'Shipping'][i]}`,
      order: i,
      fields: [
        { id: `sn-${i}`, type: FieldType.SERIAL_NUMBER, label: 'Main SN', required: true }
      ],
      assignedUserIds: ['1', '2', '3'],
      isMergeStation: i === 3, // Station 4 is Merge Point
      isReworkStation: false
    })),
    snFormats: { 'Main SN': '^[A-Z0-9]{10}$' }
  },
  {
    id: 'sub-line-sensor',
    name: 'Sensor Module Sub-Flow',
    description: 'Independent flow for sub-component assembly.',
    status: ProjectStatus.PRODUCTION,
    version: 1,
    stages: [
      { id: 'sub-s1', name: 'Sensor Calibration', order: 0, fields: [{ id: 'ssn-1', type: FieldType.SERIAL_NUMBER, label: 'Sub SN', required: true }], assignedUserIds: ['3'] },
      { id: 'sub-s2', name: 'Sensor Sealed', order: 1, fields: [{ id: 'ssn-2', type: FieldType.TEXT_INPUT, label: 'Seal ID', required: true }], assignedUserIds: ['3'] }
    ],
    snFormats: { 'Sub SN': '^SS-[0-9]{5}$' }
  },
  {
    id: 'rework-center',
    name: 'Global Rework & Failure Center',
    description: 'Dedicated center for processing FAILED units.',
    status: ProjectStatus.PRODUCTION,
    version: 1,
    stages: [
      {
        id: 'rework-01',
        name: 'Failure Analysis & Repair',
        order: 0,
        fields: [
          { id: 'def-code', type: FieldType.TEXT_INPUT, label: 'Defect Code', required: true },
          { id: 'root-cause', type: FieldType.TEXT_INPUT, label: 'Root Cause', required: true },
          { id: 'action', type: FieldType.TEXT_INPUT, label: 'Corrective Action', required: true }
        ],
        assignedUserIds: ['1', '2'],
        isReworkStation: true
      }
    ],
    snFormats: {}
  }
];

// Link the main stages
for (let i = 0; i < SEED_PROJECTS[0].stages.length - 1; i++) {
  SEED_PROJECTS[0].stages[i].nextStageId = SEED_PROJECTS[0].stages[i + 1].id;
}
SEED_PROJECTS[1].stages[0].nextStageId = SEED_PROJECTS[1].stages[1].id;

const DEMO_USERS: User[] = [
  { id: '1', username: 'admin', fullName: 'System Administrator', email: 'admin@tmlwm.com', role: UserRole.ADMIN, password: 'admin123', status: UserStatus.ACTIVE, sectionsAccess: ['dashboard', 'planning', 'execution', 'mes', 'traceability', 'users'], projectsAccess: [] },
  { id: '2', username: 'mod01', fullName: 'Production Moderator', email: 'mod@tmlwm.com', role: UserRole.MODERATOR, password: 'mod123', status: UserStatus.ACTIVE, sectionsAccess: ['planning', 'execution', 'mes'], projectsAccess: ['*'] },
  { id: '3', username: 'user01', fullName: 'Floor Operator', email: 'user@tmlwm.com', role: UserRole.USER, password: 'user123', status: UserStatus.ACTIVE, sectionsAccess: ['mes'], projectsAccess: [] }
];

export const useStore = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('tmlwm_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('tmlwm_users');
    return saved ? JSON.parse(saved) : DEMO_USERS;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('tmlwm_projects');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length > 0 ? parsed : SEED_PROJECTS;
  });

  const [records, setRecords] = useState<SerialNumberRecord[]>(() => {
    try {
      const saved = localStorage.getItem('tmlwm_records');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('tmlwm_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    localStorage.setItem('tmlwm_current_user', JSON.stringify(currentUser));
    localStorage.setItem('tmlwm_users', JSON.stringify(users));
    localStorage.setItem('tmlwm_projects', JSON.stringify(projects));
    localStorage.setItem('tmlwm_records', JSON.stringify(records));
    localStorage.setItem('tmlwm_logs', JSON.stringify(auditLogs));
  }, [currentUser, users, projects, records, auditLogs]);

  const addAuditLog = (action: string, projectId?: string, sn?: string, before?: any, after?: any) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      userId: currentUser.id,
      action,
      projectId,
      sn,
      beforeData: before,
      afterData: after
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const login = (username: string, password?: string) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return { success: false, message: 'Invalid credentials' };
    if (user.status !== UserStatus.ACTIVE) return { success: false, message: 'Account disabled or revoked' };
    setCurrentUser(user);
    addAuditLog('User Login');
    return { success: true };
  };

  const logout = () => {
    addAuditLog('User Logout');
    setCurrentUser(null);
  };

  const createSerial = (sn: string, projectId: string, type: SerialType, subType?: string) => {
    const existing = records.find(r => r.sn === sn);
    if (existing) return { success: false, message: 'Serial number already exists' };

    const project = projects.find(p => p.id === projectId);
    if (!project) return { success: false, message: 'Project not found' };

    const firstStageId = project.stages[0].id;
    const newRecord: SerialNumberRecord = {
      sn,
      projectId,
      type,
      subType,
      currentStageId: firstStageId,
      status: SerialStatus.CREATED,
      parentSerialId: null,
      scrapFlag: false,
      reworkCount: 0,
      createdTimestamp: Date.now(),
      updatedTimestamp: Date.now(),
      history: []
    };

    setRecords(prev => [...prev, newRecord]);
    addAuditLog('Serial Created', projectId, sn, null, newRecord);
    return { success: true };
  };

  const submitStageData = (projectId: string, sn: string, stageId: string, data: any, result: 'PASSED' | 'FAILED', remark?: string) => {
    if (!currentUser) return { success: false, message: 'User not authenticated' };

    const record = records.find(r => r.sn === sn);
    if (!record) return { success: false, message: 'Serial not found' };

    // Module 7: Scrap Check
    if (record.scrapFlag) return { success: false, message: 'UNIT SCRAPPED: Action prohibited' };

    // Module 2/10: Sequence Check
    if (record.currentStageId !== stageId && !record.history.some(h => h.stageId === stageId && h.status === 'FAILED')) {
      return { success: false, message: 'SEQUENCE VIOLATION: Unit not expected at this station' };
    }

    const project = projects.find(p => p.id === projectId);
    const stage = project?.stages.find(s => s.id === stageId);

    // Module 5: Rework Logic
    let nextStatus = result === 'PASSED' ? SerialStatus.IN_PROCESS : SerialStatus.FAILED;
    let nextStageId = stageId;

    if (result === 'FAILED') {
      nextStageId = 'rework-01'; // Route to rework
    } else if (result === 'PASSED') {
      if (stage?.isReworkStation) {
        // Return to original failed stage
        const lastFail = [...record.history].reverse().find(h => h.status === 'FAILED');
        nextStageId = lastFail?.stageId || stageId;
        nextStatus = SerialStatus.IN_REWORK;
      } else {
        nextStageId = stage?.nextStageId || stageId;
        if (!stage?.nextStageId) nextStatus = SerialStatus.COMPLETED;
      }
    }

    const historyItem = {
      stageId,
      timestamp: Date.now(),
      userId: currentUser.id,
      status: result,
      data,
      remark,
      defectCode: data['def-code'],
      rootCause: data['root-cause'],
      correctiveAction: data['action']
    };

    const updatedRecord: SerialNumberRecord = {
      ...record,
      currentStageId: nextStageId,
      status: nextStatus as SerialStatus,
      reworkCount: result === 'FAILED' ? record.reworkCount + 1 : record.reworkCount,
      updatedTimestamp: Date.now(),
      history: [...record.history, historyItem]
    };

    setRecords(prev => prev.map(r => r.sn === sn ? updatedRecord : r));
    addAuditLog('Stage Submitted', projectId, sn, record, updatedRecord);
    return { success: true };
  };

  const mergeSerials = (mainSn: string, subSn: string) => {
    const main = records.find(r => r.sn === mainSn);
    const sub = records.find(r => r.sn === subSn);

    if (!main || !sub) return { success: false, message: 'Serials not found' };
    if (sub.status !== SerialStatus.COMPLETED) return { success: false, message: 'Sub-serial must be COMPLETED' };
    if (sub.parentSerialId) return { success: false, message: 'Sub-serial already linked' };

    const updatedSub = { ...sub, parentSerialId: mainSn, updatedTimestamp: Date.now() };
    setRecords(prev => prev.map(r => r.sn === subSn ? updatedSub : r));
    addAuditLog('Serial Merged', main.projectId, mainSn, sub, updatedSub);
    return { success: true };
  };

  const scrapSerial = (sn: string, reason: string) => {
    const record = records.find(r => r.sn === sn);
    if (!record) return { success: false, message: 'Serial not found' };

    const updatedRecord = {
      ...record,
      status: SerialStatus.SCRAPPED,
      scrapFlag: true,
      updatedTimestamp: Date.now(),
      history: [...record.history, {
        stageId: record.currentStageId,
        timestamp: Date.now(),
        userId: currentUser?.id || 'sys',
        status: 'FAILED' as const,
        data: { scrap: true },
        remark: reason
      }]
    };

    setRecords(prev => prev.map(r => r.sn === sn ? updatedRecord : r));
    addAuditLog('Serial Scrapped', record.projectId, sn, record, updatedRecord);
    return { success: true };
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const before = { ...user };
    const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    setUsers(updatedUsers);
    addAuditLog('User Updated', undefined, undefined, before, updates);

    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const createProject = (name: string, description: string, stageCount: number = 1) => {
    const stages: Stage[] = Array.from({ length: stageCount }, (_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: `Stage ${i + 1}`,
      order: i,
      fields: [],
      assignedUserIds: []
    }));

    for (let i = 0; i < stages.length - 1; i++) {
      stages[i].nextStageId = stages[i + 1].id;
    }

    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      status: ProjectStatus.DRAFT,
      version: 1,
      stages,
      snFormats: {}
    };
    setProjects(prev => [...prev, newProject]);
    addAuditLog('Project Created', newProject.id, undefined, null, newProject);
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    const project = projects.find(p => p.id === projectId);
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
    addAuditLog('Project Updated', projectId, undefined, project, updates);
  };

  return {
    currentUser,
    users,
    projects,
    records,
    auditLogs,
    login,
    logout,
    createProject,
    updateProject,
    submitStageData,
    createSerial,
    mergeSerials,
    scrapSerial,
    updateUser,
    addAuditLog,
    setUsers
  };
};
