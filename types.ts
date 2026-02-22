
export enum UserRole {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  USER = 'USER'
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  DEVELOPMENT = 'DEVELOPMENT',
  PRODUCTION = 'PRODUCTION',
  ARCHIVED = 'ARCHIVED'
}

export enum FieldType {
  LOGIN = 'LOGIN',
  SERIAL_NUMBER = 'SERIAL_NUMBER',
  SUB_SERIAL_NUMBER = 'SUB_SERIAL_NUMBER',
  CAMERA = 'CAMERA',
  CHECKBOX_INSPECTION = 'CHECKBOX_INSPECTION',
  DATE = 'DATE',
  TEXT_INPUT = 'TEXT_INPUT'
}

export enum SerialType {
  MAIN = 'MAIN',
  SUB = 'SUB'
}

export enum SerialStatus {
  CREATED = 'CREATED',
  IN_PROCESS = 'IN_PROCESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  IN_REWORK = 'IN_REWORK',
  SCRAPPED = 'SCRAPPED'
}

export interface Checkpoint {
  id: string;
  label: string;
  result?: 'PASS' | 'FAIL';
  remark?: string;
}

export interface StageField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[]; // For option select
  checkpoints?: Checkpoint[];
  snFormatRegex?: string;
  subType?: string; // For SUB type serials (A/B/C)
}

export interface Stage {
  id: string;
  name: string;
  order: number;
  fields: StageField[];
  nextStageId?: string;
  failRouteStageId?: string;
  assignedUserIds: string[]; // List of user IDs allowed to execute this stage
  requiresLogin?: boolean;
  isMergeStation?: boolean; // Module 4
  isReworkStation?: boolean; // Module 5
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  version: number;
  stages: Stage[];
  snFormats: Record<string, string>; // Mapping of fieldLabel to Regex string
  modelName?: string;
}

export interface SerialNumberRecord {
  sn: string;
  projectId: string;
  type: SerialType;
  subType?: string; // A/B/C
  currentStageId: string;
  status: SerialStatus;
  parentSerialId?: string | null; // Module 4
  scrapFlag: boolean; // Module 7
  reworkCount: number; // Module 5
  createdTimestamp: number;
  updatedTimestamp: number;
  history: Array<{
    stageId: string;
    timestamp: number;
    userId: string;
    status: 'PASSED' | 'FAILED';
    data: any;
    remark?: string;
    defectCode?: string; // Module 5
    rootCause?: string; // Module 5
    correctiveAction?: string; // Module 5
    isOverride?: boolean;
    overrideReason?: string;
    isReplacementEvent?: boolean; // Module 6
    unlinkedSerialId?: string; // Module 6
  }>;
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  REVOKED = 'REVOKED'
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password: string;
  sectionsAccess: string[]; // IDs of nav items
  projectsAccess: string[]; // IDs of projects
  createdBy?: string;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  projectId?: string;
  sn?: string;
  beforeData?: any;
  afterData?: any;
}
