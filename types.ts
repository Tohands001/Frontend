
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
  TEXT_INPUT = 'TEXT_INPUT',
  NUMERIC_TOLERANCE = 'NUMERIC_TOLERANCE',
  PART_SYNC = 'PART_SYNC',
  DEVICE_ID_ENTRY = 'DEVICE_ID_ENTRY',
  MASTER_CARTON_SYNC = 'MASTER_CARTON_SYNC',
  DOCUMENT_AUDIT = 'DOCUMENT_AUDIT'
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
  SCRAPPED = 'SCRAPPED',
  ON_HOLD = 'ON_HOLD',
  MRB_HOLD = 'MRB-HOLD',
  REWORK_PENDING = 'REWORK-PENDING'
}

export enum ResultAction {
  NEXT_STATION = 'NEXT_STATION',
  REWORK = 'REWORK',
  HOLD = 'HOLD',
  COMPLETE = 'COMPLETE'
}

export interface ToleranceSpec {
  parameter: string;
  min: number;
  max: number;
  unit: string;
}

export interface PartSyncRule {
  label: string;
  snFormatRegex: string;
  requireFresh: boolean;
  mustPassStation?: string; // Station ID the part must have passed
  linkToParent: boolean;
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
  options?: string[];
  checkpoints?: Checkpoint[];
  snFormatRegex?: string;
  subType?: string;
  toleranceSpecs?: ToleranceSpec[];
  partSyncRules?: PartSyncRule[];
  deviceIdFormat?: string;
  masterCartonSize?: number; // e.g. 20
}

export interface Stage {
  id: string;
  name: string;
  order: number;
  fields: StageField[];
  nextStageId?: string;
  failRouteStageId?: string;
  assignedUserIds: string[];
  requiresLogin?: boolean;
  isMergeStation?: boolean;
  isReworkStation?: boolean;
  failAction?: ResultAction; // What happens on FAIL (default REWORK)
  holdOnFail?: boolean; // ST-9 to ST-12
  isSemiDependent?: boolean; // ST-13, ST-14
  feedsIntoStageId?: string; // Which main-line station this sub-assembly feeds into
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  version: number;
  stages: Stage[];
  snFormats: Record<string, string>;
  modelName?: string;
}

export interface SerialNumberRecord {
  sn: string;
  projectId: string;
  type: SerialType;
  subType?: string;
  currentStageId: string;
  status: SerialStatus;
  parentSerialId?: string | null;
  scrapFlag: boolean;
  reworkCount: number;
  createdTimestamp: number;
  updatedTimestamp: number;
  linkedParts: Record<string, string>; // partLabel → partSN (1:1 mapping)
  deviceId?: string; // Linked at ST-7
  masterCartonId?: string; // Linked at ST-11
  holdFlag: boolean;
  nextPossibleStationId?: string; // For rework re-entry
  mrbTicketId?: string; // Linked MRB Ticket
  mrbRepeatCount: number; // For repeat failure tracking
  history: Array<{
    stageId: string;
    timestamp: number;
    userId: string;
    status: 'PASSED' | 'FAILED';
    data: any;
    remark?: string;
    defectCode?: string;
    rootCause?: string;
    correctiveAction?: string;
    isOverride?: boolean;
    overrideReason?: string;
    unlinkedSerialId?: string;
  }>;
  draftReworkData?: {
    defectiveQueue: any[];
    mainPcbAction: string;
    mainPcbRemarks: string;
    reworkAction: string;
    finalRemarks: string;
  };
}

export interface ReworkEntry {
  id: string;
  defectivePartLabel: string;
  oldPartSn: string;
  newPartSn: string;
  remarks: string;
  replacedBy: string;
  timestamp: number;
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
  sectionsAccess: string[];
  projectsAccess: string[];
  createdBy?: string;
}

export enum MrbStatus {
  OPEN = 'OPEN',
  PARTIALLY_CLOSED = 'PARTIALLY_CLOSED',
  CLOSED = 'CLOSED'
}

export interface MrbDisposition {
  serialNumbers: string[];
  action: 'SCRAP' | 'REWORK';
  remarks: string;
  disposedBy: string;
  timestamp: number;
}

export interface MrbTicket {
  id: string; // MRB-YYYYMMDD-XXXX
  projectId: string;
  partName: string;
  defectCategory: string;
  description: string;
  lineName: string;
  shift: string;
  createdBy: string;
  source?: string; // e.g. "Manual" or "Rework Scrap"
  timestamp: number;
  serialNumbers: string[]; // Set of serials in this ticket
  dispositions: MrbDisposition[];
  status: MrbStatus;
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
