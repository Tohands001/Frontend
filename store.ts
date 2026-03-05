
import { useState, useEffect, useCallback } from 'react';
import {
  User, Project, UserRole, ProjectStatus, AuditLog,
  SerialNumberRecord, Stage, FieldType, UserStatus,
  SerialType, SerialStatus, ResultAction, ToleranceSpec, PartSyncRule, Checkpoint,
  MrbTicket, MrbStatus, MrbDisposition
} from './types';

// ─── SN FORMAT REGEX PATTERNS ───────────────────────────────────────
const SN_FORMATS: Record<string, string> = {
  'PCB SN': '^KEYMPCB\\d{8}B\\d\\d{4,5}$',
  'Bottom Panel SN': '^KAYBOTMSUB\\d{8}B\\d\\d{4,5}$',
  'Battery SN': '^CCEBAT2PLI\\d{8}B\\d\\d{4,5}$',
  'Display SN': '^HUXTFT45\\d{8}B\\d-\\d{5}$',
  'SIM ID': '^\\d{19,20}$',
  'Device ID': '^T\\d{3}[A-Z]\\d[A-Z]{2,3}\\d{5}$',
  'Speaker Box SN': '^KAYSPKSUB\\d{8}B\\d\\d{4,5}$',
  'Top Panel SN': '^XIASEMITOP\\d{8}B\\d\\d{4,5}$',
  'Keypad PCB SN': '^TOFKEYPCB-\\d{8}B\\d--\\d{4}$',
  'Master Carton SN': '^MC\\d{8}B\\d\\d{4,5}$'
};

// ─── ST-1 TOLERANCE SPECIFICATIONS ──────────────────────────────────
const ST1_TOLERANCES: ToleranceSpec[] = [
  { parameter: 'Battery Charging Voltage', min: 3.8, max: 4.2, unit: 'V' },
  { parameter: 'Charging Current', min: 0.84, max: 1.3, unit: 'A' },
  { parameter: 'USB Power', min: 4.85, max: 5.20, unit: 'V' },
  { parameter: 'Current (Amps)', min: 0.5, max: 1.0, unit: 'A' },
  { parameter: 'TP2', min: 3.28, max: 3.33, unit: 'V' },
  { parameter: 'TP5', min: 3.76, max: 3.85, unit: 'V' },
  { parameter: 'TP7', min: 0.8, max: 1.0, unit: 'V' },
  { parameter: 'TP8', min: 1.3, max: 1.8, unit: 'V' },
];

// ─── STATION CHECKPOINT DEFINITIONS ─────────────────────────────────
const ST2_CHECKPOINTS: Checkpoint[] = [
  { id: 'st2-cp1', label: 'Bottom Panel & PCB condition (No Dent/Crack/Damage/Parts missing)' },
  { id: 'st2-cp2', label: 'Speaker Box properly attached & mounted with 2 screws' },
  { id: 'st2-cp3', label: 'PCBA properly mounted with 4 screws (No rusted/damaged screws)' },
  { id: 'st2-cp4', label: 'Speaker cable properly connected to speaker connection pin' },
  { id: 'st2-cp5', label: 'Antenna properly connected & fixed with 3M tape' },
  { id: 'st2-cp6', label: 'Tested OK sticker present' },
];

const ST3_CHECKPOINTS: Checkpoint[] = [
  { id: 'st3-cp1', label: 'Battery cosmetic condition & voltage in range (3.8–4.2V)' },
  { id: 'st3-cp2', label: 'Battery placement & connection with PCBA' },
  { id: 'st3-cp3', label: 'Battery cover connects properly (No gap acceptable)' },
  { id: 'st3-cp4', label: 'Top panel Display & Keypad PCB FPC cables (No damage)' },
  { id: 'st3-cp5', label: 'Top panel FPC cable connected in correct location & locked' },
  { id: 'st3-cp6', label: 'No FOD & Damage on Display/Screen' },
  { id: 'st3-cp7', label: 'Display cover available' },
];

const ST4_CHECKPOINTS: Checkpoint[] = [
  { id: 'st4-cp1', label: 'Both side USB pin condition OK' },
  { id: 'st4-cp2', label: 'Approved firmware is flashed' },
  { id: 'st4-cp3', label: 'Flash completed successfully' },
];

const ST5_CHECKPOINTS: Checkpoint[] = [
  { id: 'st5-cp1', label: 'Test SIM inserted' },
  { id: 'st5-cp2', label: 'All 9 tests passed' },
  { id: 'st5-cp3', label: 'Data upload complete' },
  { id: 'st5-cp4', label: 'Test SIM removed before moving forward' },
];

const ST6_CHECKPOINTS: Checkpoint[] = [
  { id: 'st6-cp1', label: 'Actual SIM inserted' },
  { id: 'st6-cp2', label: 'WiFi, GSM & BLE passed' },
  { id: 'st6-cp3', label: 'Data upload complete' },
  { id: 'st6-cp4', label: 'Device functional in calculator mode' },
];

const ST7_CHECKPOINTS: Checkpoint[] = [
  { id: 'st7-cp1', label: 'Main PCB properly mounted with 4 screws' },
  { id: 'st7-cp2', label: 'Keypad PCB properly mounted with 4 screws' },
  { id: 'st7-cp3', label: 'Display attached to Top Panel (No gap allowed)' },
  { id: 'st7-cp4', label: 'Both FPC cables (Keypad & Display) connected properly' },
  { id: 'st7-cp5', label: 'Battery connected & secured with 2M tape' },
  { id: 'st7-cp6', label: 'Battery cover locked (O-ring present, 2 screws)' },
  { id: 'st7-cp7', label: 'Device label properly placed' },
  { id: 'st7-cp8', label: 'Top & Bottom cover locked with 7 screws' },
  { id: 'st7-cp9', label: 'Feet rubber present' },
];

const ST8_CHECKPOINTS: Checkpoint[] = [
  { id: 'st8-cp1', label: 'Device ID matches System Info and Bottom Label' },
  { id: 'st8-cp2', label: 'Agency label condition OK' },
  { id: 'st8-cp3', label: 'Top & Bottom cover securely locked with 7 screws' },
  { id: 'st8-cp4', label: 'Laser marking "Tohands & Smart Calculator V5" present' },
  { id: 'st8-cp5', label: 'Front & Bottom panel condition OK' },
  { id: 'st8-cp6', label: 'Power-On test passed' },
  { id: 'st8-cp7', label: 'Display segment check passed' },
  { id: 'st8-cp8', label: 'Charging test passed' },
  { id: 'st8-cp9', label: 'USB pin condition (Charging & Printer side) OK' },
  { id: 'st8-cp10', label: 'Power-Off test passed' },
];

const ST9_CHECKPOINTS: Checkpoint[] = [
  { id: 'st9-cp1', label: 'Device box is properly prepared' },
  { id: 'st9-cp2', label: 'Box serial number matches Device ID on Device Info & Agency Label' },
  { id: 'st9-cp3', label: 'All packaging material included' },
];

const ST10_CHECKPOINTS: Checkpoint[] = [
  { id: 'st10-cp1', label: 'Protective case available' },
  { id: 'st10-cp2', label: 'Device packed with white sleeve' },
  { id: 'st10-cp3', label: 'Power adaptor & cable inserted with Packaging Insert 2' },
  { id: 'st10-cp4', label: 'User manual available in packaging box' },
  { id: 'st10-cp5', label: 'Packaging box sealed with 2 circular seal tape' },
  { id: 'st10-cp6', label: 'Box covered with Tohands White & Green sleeve' },
  { id: 'st10-cp7', label: 'Total weight within 810g–825g range' },
];

const ST13_CHECKPOINTS: Checkpoint[] = [
  { id: 'st13-cp1', label: 'Speaker mesh placed in speaker grille front-facing portion' },
  { id: 'st13-cp2', label: 'Speaker properly placed into speaker front cover' },
  { id: 'st13-cp3', label: 'Industrial glue (CP001) applied & speaker box closed securely' },
  { id: 'st13-cp4', label: 'Production part SN label pasted' },
  { id: 'st13-cp5', label: 'Speaker box placed in designated place of Bottom Panel' },
  { id: 'st13-cp6', label: 'Feet rubber properly placed in Bottom Panel' },
];

const ST14_CHECKPOINTS: Checkpoint[] = [
  { id: 'st14-cp1', label: 'Keypad PCB secured with 4 screws' },
  { id: 'st14-cp2', label: 'Display panel & top panel sub-assembly free from damage/defects' },
  { id: 'st14-cp3', label: 'Protective film intact' },
  { id: 'st14-cp4', label: 'Display panel properly attached to top panel' },
  { id: 'st14-cp5', label: 'Keypad & Display FPC cables properly attached & free from damage' },
  { id: 'st14-cp6', label: 'Production Part SN labels affixed' },
];

// ─── 14-STATION SEED PROJECT ────────────────────────────────────────
const TOHANDS_STAGES: Stage[] = [
  // ST-1: PCB Testing
  {
    id: 'st-1', name: 'Station 1: PCB Testing', order: 0,
    fields: [
      { id: 'st1-sn', type: FieldType.SERIAL_NUMBER, label: 'PCB SN', required: true, snFormatRegex: SN_FORMATS['PCB SN'] },
      { id: 'st1-tolerance', type: FieldType.NUMERIC_TOLERANCE, label: 'Electrical Check Sheet', required: true, toleranceSpecs: ST1_TOLERANCES },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.REWORK,
  },
  // ST-2: PCB Mounting
  {
    id: 'st-2', name: 'Station 2: PCB Mounting', order: 1,
    fields: [
      { id: 'st2-sn', type: FieldType.SERIAL_NUMBER, label: 'PCB SN', required: true, snFormatRegex: SN_FORMATS['PCB SN'] },
      { id: 'st2-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Mounting Inspection', required: true, checkpoints: ST2_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.REWORK,
  },
  // ST-3: Top Panel Mounting (with Part Sync)
  {
    id: 'st-3', name: 'Station 3: Top Panel Mounting', order: 2,
    fields: [
      { id: 'st3-sn', type: FieldType.SERIAL_NUMBER, label: 'PCB SN', required: true, snFormatRegex: SN_FORMATS['PCB SN'] },
      {
        id: 'st3-parts', type: FieldType.PART_SYNC, label: 'Part Synchronization', required: true,
        partSyncRules: [
          { label: 'Bottom Panel SN', snFormatRegex: SN_FORMATS['Bottom Panel SN'], requireFresh: false, mustPassStation: 'st-13', linkToParent: true },
          { label: 'Battery SN', snFormatRegex: SN_FORMATS['Battery SN'], requireFresh: true, linkToParent: true },
        ]
      },
      { id: 'st3-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Panel Mounting Inspection', required: true, checkpoints: ST3_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.REWORK,
  },
  // ST-4: Firmware Flashing
  {
    id: 'st-4', name: 'Station 4: Firmware Flashing', order: 3,
    fields: [
      { id: 'st4-sn', type: FieldType.SERIAL_NUMBER, label: 'PCB SN', required: true, snFormatRegex: SN_FORMATS['PCB SN'] },
      { id: 'st4-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Flashing Verification', required: true, checkpoints: ST4_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.REWORK,
  },
  // ST-5: Phase 1 Testing (with Part Sync)
  {
    id: 'st-5', name: 'Station 5: Phase 1 Testing', order: 4,
    fields: [
      { id: 'st5-sn', type: FieldType.SERIAL_NUMBER, label: 'PCB SN', required: true, snFormatRegex: SN_FORMATS['PCB SN'] },
      {
        id: 'st5-parts', type: FieldType.PART_SYNC, label: 'Part Synchronization', required: true,
        partSyncRules: [
          { label: 'Top Panel SN', snFormatRegex: SN_FORMATS['Top Panel SN'], requireFresh: false, mustPassStation: 'st-14', linkToParent: true },
          { label: 'Battery SN', snFormatRegex: SN_FORMATS['Battery SN'], requireFresh: true, linkToParent: true },
          { label: 'Display SN', snFormatRegex: SN_FORMATS['Display SN'], requireFresh: true, linkToParent: true },
        ]
      },
      { id: 'st5-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Phase 1 Testing', required: true, checkpoints: ST5_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.REWORK,
    failRouteStageId: 'st-4', // Fail → ST-4 or Rework
  },
  // ST-6: Phase 2 Testing (with SIM Part Sync)
  {
    id: 'st-6', name: 'Station 6: Phase 2 Testing', order: 5,
    fields: [
      { id: 'st6-sn', type: FieldType.SERIAL_NUMBER, label: 'PCB SN', required: true, snFormatRegex: SN_FORMATS['PCB SN'] },
      {
        id: 'st6-parts', type: FieldType.PART_SYNC, label: 'SIM Synchronization', required: true,
        partSyncRules: [
          { label: 'SIM ID', snFormatRegex: SN_FORMATS['SIM ID'], requireFresh: true, linkToParent: true },
        ]
      },
      { id: 'st6-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Phase 2 Testing', required: true, checkpoints: ST6_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.REWORK,
    failRouteStageId: 'st-4', // Fail → ST-4 or Rework
  },
  // ST-7: Final Assembly (Device ID Entry + Part Sync)
  {
    id: 'st-7', name: 'Station 7: Final Assembly', order: 6,
    fields: [
      { id: 'st7-device-id', type: FieldType.DEVICE_ID_ENTRY, label: 'Device ID', required: true, deviceIdFormat: SN_FORMATS['Device ID'] },
      {
        id: 'st7-parts', type: FieldType.PART_SYNC, label: 'PCB Linkage', required: true,
        partSyncRules: [
          { label: 'PCB SN', snFormatRegex: SN_FORMATS['PCB SN'], requireFresh: false, mustPassStation: 'st-6', linkToParent: true },
        ]
      },
      { id: 'st7-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Assembly Inspection', required: true, checkpoints: ST7_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.REWORK,
    failRouteStageId: 'st-4',
  },
  // ST-8: Final QC
  {
    id: 'st-8', name: 'Station 8: Final QC', order: 7,
    fields: [
      { id: 'st8-sn', type: FieldType.SERIAL_NUMBER, label: 'Device ID', required: true, snFormatRegex: SN_FORMATS['Device ID'] },
      { id: 'st8-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Final QC Inspection', required: true, checkpoints: ST8_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.REWORK,
  },
  // ST-9: Box Building (HOLD on fail)
  {
    id: 'st-9', name: 'Station 9: Box Building', order: 8,
    fields: [
      { id: 'st9-sn', type: FieldType.SERIAL_NUMBER, label: 'Device ID', required: true, snFormatRegex: SN_FORMATS['Device ID'] },
      { id: 'st9-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Box Building Checks', required: true, checkpoints: ST9_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.HOLD,
    holdOnFail: true,
  },
  // ST-10: Packaging & QC (HOLD on fail)
  {
    id: 'st-10', name: 'Station 10: Packaging & QC', order: 9,
    fields: [
      { id: 'st10-sn', type: FieldType.SERIAL_NUMBER, label: 'Device ID', required: true, snFormatRegex: SN_FORMATS['Device ID'] },
      { id: 'st10-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Packaging QC', required: true, checkpoints: ST10_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.HOLD,
    holdOnFail: true,
  },
  // ST-11: Master Carton Packaging (HOLD on fail)
  {
    id: 'st-11', name: 'Station 11: Master Carton', order: 10,
    fields: [
      { id: 'st11-sn', type: FieldType.SERIAL_NUMBER, label: 'Master Carton SN', required: true, snFormatRegex: SN_FORMATS['Master Carton SN'] },
      { id: 'st11-carton', type: FieldType.MASTER_CARTON_SYNC, label: 'Device ID Aggregation', required: true, masterCartonSize: 20 },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.HOLD,
    holdOnFail: true,
  },
  // ST-12: Document Audit (HOLD on fail)
  {
    id: 'st-12', name: 'Station 12: Document Audit', order: 11,
    fields: [
      { id: 'st12-sn', type: FieldType.SERIAL_NUMBER, label: 'Master Carton SN', required: true, snFormatRegex: SN_FORMATS['Master Carton SN'] },
      { id: 'st12-audit', type: FieldType.DOCUMENT_AUDIT, label: 'SN Matching Audit', required: true, masterCartonSize: 20 },
      {
        id: 'st12-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Sample Audit', required: true, checkpoints: [
          { id: 'st12-cp1', label: 'Sample test completed' },
          { id: 'st12-cp2', label: 'All sample devices passed' },
        ]
      },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.HOLD,
    holdOnFail: true,
  },
];

// Semi-Dependent Stations
const SEMI_DEPENDENT_STAGES: Stage[] = [
  // ST-13: Bottom Panel Assembly
  {
    id: 'st-13', name: 'Station 13: Bottom Panel Assembly', order: 12,
    fields: [
      { id: 'st13-sn', type: FieldType.SERIAL_NUMBER, label: 'Bottom Panel SN', required: true, snFormatRegex: SN_FORMATS['Bottom Panel SN'] },
      {
        id: 'st13-parts', type: FieldType.PART_SYNC, label: 'Speaker Sync', required: true,
        partSyncRules: [
          { label: 'Speaker Box SN', snFormatRegex: SN_FORMATS['Speaker Box SN'], requireFresh: true, linkToParent: true },
        ]
      },
      { id: 'st13-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Assembly Inspection', required: true, checkpoints: ST13_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.REWORK,
    isSemiDependent: true,
    feedsIntoStageId: 'st-2', // Passes to ST-2 in main flow
  },
  // ST-14: Top Panel Assembly
  {
    id: 'st-14', name: 'Station 14: Top Panel Assembly', order: 13,
    fields: [
      { id: 'st14-sn', type: FieldType.SERIAL_NUMBER, label: 'Top Panel SN', required: true, snFormatRegex: SN_FORMATS['Top Panel SN'] },
      {
        id: 'st14-parts', type: FieldType.PART_SYNC, label: 'Keypad PCB Sync', required: true,
        partSyncRules: [
          { label: 'Keypad PCB SN', snFormatRegex: SN_FORMATS['Keypad PCB SN'], requireFresh: true, linkToParent: true },
        ]
      },
      { id: 'st14-checklist', type: FieldType.CHECKBOX_INSPECTION, label: 'Assembly Inspection', required: true, checkpoints: ST14_CHECKPOINTS },
    ],
    assignedUserIds: ['1', '2', '3'],
    failAction: ResultAction.REWORK,
    isSemiDependent: true,
    feedsIntoStageId: 'st-5', // Passes to ST-5 in main flow
  },
];

// Link main flow stages
for (let i = 0; i < TOHANDS_STAGES.length - 1; i++) {
  TOHANDS_STAGES[i].nextStageId = TOHANDS_STAGES[i + 1].id;
}

const ALL_STAGES = [...TOHANDS_STAGES, ...SEMI_DEPENDENT_STAGES];

const SEED_PROJECTS: Project[] = [
  {
    id: 'tohands-main',
    name: 'Tohands Smart Calculator V5 (14 Stations)',
    description: '14-stage production control with strict sequential flow, part synchronization, tolerance validation, and master carton aggregation.',
    status: ProjectStatus.PRODUCTION,
    version: 17, // Rework Validation Demo: Added Battery & Speaker Box sub-serials
    stages: ALL_STAGES,
    snFormats: SN_FORMATS,
    modelName: 'Smart Calculator V5'
  },
];

const SEED_RECORDS: SerialNumberRecord[] = [
  // Completed Units (Main)
  {
    sn: 'KEYMPCB20260301B10001', projectId: 'tohands-main', type: SerialType.MAIN, currentStageId: 'st-7', status: SerialStatus.IN_PROCESS,
    scrapFlag: false, reworkCount: 0, mrbRepeatCount: 0, createdTimestamp: Date.now() - 86400000 * 3, updatedTimestamp: Date.now() - 86400000 * 2,
    linkedParts: {}, deviceId: 'T120R4CAK00001', holdFlag: false,
    history: [
      { stageId: 'st-1', timestamp: Date.now() - 3600000 * 5, userId: '3', status: 'PASSED', data: {} },
      { stageId: 'st-2', timestamp: Date.now() - 3600000 * 4, userId: '3', status: 'PASSED', data: {} },
      { stageId: 'st-3', timestamp: Date.now() - 3600000 * 3, userId: '3', status: 'PASSED', data: {} },
      { stageId: 'st-4', timestamp: Date.now() - 3600000 * 2, userId: '3', status: 'PASSED', data: {} },
      { stageId: 'st-5', timestamp: Date.now() - 3600000 * 1.5, userId: '3', status: 'PASSED', data: {} },
      { stageId: 'st-6', timestamp: Date.now() - 3600000 * 1, userId: '3', status: 'PASSED', data: {} }
    ]
  },
  {
    sn: 'KEYMPCB20240101AA0002', projectId: 'tohands-main', type: SerialType.MAIN, currentStageId: 'st-12', status: SerialStatus.COMPLETED,
    scrapFlag: false, reworkCount: 1, mrbRepeatCount: 0, createdTimestamp: Date.now() - 86400000 * 2.5, updatedTimestamp: Date.now() - 86400000 * 1.5,
    linkedParts: {}, deviceId: 'T120R4CAK00002', masterCartonId: 'MC20240101AA0001', holdFlag: false,
    history: [{ stageId: 'st-1', timestamp: Date.now() - 86400000 * 2.5, userId: '3', status: 'FAILED', data: {} }, { stageId: 'st-1', timestamp: Date.now() - 86400000 * 2.4, userId: '3', status: 'PASSED', data: {} }]
  },
  // WIP Units (Main)
  {
    sn: 'KEYMPCB20240101AA0003', projectId: 'tohands-main', type: SerialType.MAIN, currentStageId: 'st-5', status: SerialStatus.IN_PROCESS,
    scrapFlag: false, reworkCount: 0, mrbRepeatCount: 0, createdTimestamp: Date.now() - 3600000 * 5, updatedTimestamp: Date.now() - 3600000 * 2,
    linkedParts: {}, holdFlag: false,
    history: [{ stageId: 'st-1', timestamp: Date.now() - 3600000 * 5, userId: '3', status: 'PASSED', data: {} }, { stageId: 'st-4', timestamp: Date.now() - 3600000 * 2, userId: '3', status: 'PASSED', data: {} }]
  },
  {
    sn: 'KEYMPCB20240101AA0004', projectId: 'tohands-main', type: SerialType.MAIN, currentStageId: 'st-2', status: SerialStatus.IN_PROCESS,
    scrapFlag: false, reworkCount: 0, mrbRepeatCount: 0, createdTimestamp: Date.now() - 3600000 * 2, updatedTimestamp: Date.now() - 3600000 * 1,
    linkedParts: {}, holdFlag: false,
    history: [{ stageId: 'st-1', timestamp: Date.now() - 3600000 * 2, userId: '3', status: 'PASSED', data: {} }]
  },
  // Hold Unit (Main)
  {
    sn: 'KEYMPCB20240101AA0005', projectId: 'tohands-main', type: SerialType.MAIN, currentStageId: 'st-10', status: SerialStatus.ON_HOLD,
    scrapFlag: false, reworkCount: 2, mrbRepeatCount: 0, createdTimestamp: Date.now() - 86400000 * 1, updatedTimestamp: Date.now() - 3600000 * 4,
    linkedParts: {}, holdFlag: true,
    history: [{ stageId: 'st-10', timestamp: Date.now() - 3600000 * 4, userId: '3', status: 'FAILED', data: {}, remark: 'Weight out of range' }]
  },
  // Scrapped Unit (Main)
  {
    sn: 'KEYMPCB20240101AA0006', projectId: 'tohands-main', type: SerialType.MAIN, currentStageId: 'st-1', status: SerialStatus.SCRAPPED,
    scrapFlag: true, reworkCount: 0, mrbRepeatCount: 0, createdTimestamp: Date.now() - 86400000 * 2, updatedTimestamp: Date.now() - 86400000 * 1.8,
    linkedParts: {}, holdFlag: false,
    history: [{ stageId: 'st-1', timestamp: Date.now() - 86400000 * 1.8, userId: '3', status: 'FAILED', data: {}, remark: 'PCB Burned during testing' }]
  },
  // Demo Parts for Rework Validation
  {
    sn: 'CCEBAT2PLI20240301B00001', projectId: 'tohands-main', type: SerialType.SUB, subType: 'Battery SN', currentStageId: 'st-3', status: SerialStatus.CREATED,
    scrapFlag: false, reworkCount: 0, mrbRepeatCount: 0, createdTimestamp: Date.now(), updatedTimestamp: Date.now(),
    linkedParts: {}, holdFlag: false, history: []
  },
  {
    sn: 'KAYSPKSUB20240301B00001', projectId: 'tohands-main', type: SerialType.SUB, subType: 'Speaker Box SN', currentStageId: 'st-13', status: SerialStatus.CREATED,
    scrapFlag: false, reworkCount: 0, mrbRepeatCount: 0, createdTimestamp: Date.now(), updatedTimestamp: Date.now(),
    linkedParts: {}, holdFlag: false, history: []
  }
];

const DEMO_USERS: User[] = [
  { id: '1', username: 'admin', fullName: 'System Administrator', email: 'admin@tmlwm.com', role: UserRole.ADMIN, password: 'admin123', status: UserStatus.ACTIVE, sectionsAccess: ['dashboard', 'planning', 'execution', 'mes', 'rework', 'mrb-board', 'info-centre', 'users'], projectsAccess: [] },
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

    // VERSION CHECK: If saved version is older than SEED_PROJECTS version, force update
    if (parsed.length > 0) {
      const seedProj = SEED_PROJECTS.find(p => p.id === parsed[0].id);
      if (seedProj && seedProj.version > parsed[0].version) {
        return SEED_PROJECTS;
      }
      return parsed;
    }
    return SEED_PROJECTS;
  });

  const [records, setRecords] = useState<SerialNumberRecord[]>(() => {
    try {
      const savedProjects = localStorage.getItem('tmlwm_projects');
      const parsedProjects = savedProjects ? JSON.parse(savedProjects) : [];

      const savedRecords = localStorage.getItem('tmlwm_records');
      const parsedRecords = savedRecords ? JSON.parse(savedRecords) : [];

      // VERSION CHECK for RECORDS: If project version upgraded, wipe stale records
      if (parsedProjects.length > 0) {
        const seedProj = SEED_PROJECTS.find(p => p.id === parsedProjects[0].id);
        if (seedProj && seedProj.version > parsedProjects[0].version) {
          localStorage.removeItem('tmlwm_records');
          return SEED_RECORDS;
        }
      }

      return parsedRecords.length > 0 ? parsedRecords : SEED_RECORDS;
    } catch (e) { return SEED_RECORDS; }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('tmlwm_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [mrbTickets, setMrbTickets] = useState<MrbTicket[]>(() => {
    try {
      const saved = localStorage.getItem('tmlwm_mrb');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    localStorage.setItem('tmlwm_current_user', JSON.stringify(currentUser));
    localStorage.setItem('tmlwm_users', JSON.stringify(users));
    localStorage.setItem('tmlwm_projects', JSON.stringify(projects));
    localStorage.setItem('tmlwm_records', JSON.stringify(records));
    localStorage.setItem('tmlwm_logs', JSON.stringify(auditLogs));
    localStorage.setItem('tmlwm_mrb', JSON.stringify(mrbTickets));
  }, [currentUser, users, projects, records, auditLogs, mrbTickets]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        const data = JSON.parse(e.newValue);
        if (e.key === 'tmlwm_records') setRecords(data);
        if (e.key === 'tmlwm_projects') setProjects(data);
        if (e.key === 'tmlwm_logs') setAuditLogs(data);
        if (e.key === 'tmlwm_users') setUsers(data);
        if (e.key === 'tmlwm_mrb') setMrbTickets(data);
        if (e.key === 'tmlwm_current_user') setCurrentUser(data);
      } catch (err) {
        console.error('Storage sync error:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  // ─── SERIAL CREATION ──────────────────────────────────────────────
  const createSerial = (sn: string, projectId: string, type: SerialType, subType?: string, initialStageId?: string): { success: boolean; message?: string; record?: SerialNumberRecord } => {
    const existing = records.find(r => r.sn === sn);
    if (existing) return { success: false, message: `Serial number already exists. Current station: ${existing.currentStageId}` };

    const project = projects.find(p => p.id === projectId);
    if (!project) return { success: false, message: 'Project not found' };

    const finalInitialStageId = initialStageId || project.stages[0].id;
    const newRecord: SerialNumberRecord = {
      sn,
      projectId,
      type,
      subType,
      currentStageId: finalInitialStageId,
      status: SerialStatus.CREATED,
      parentSerialId: null,
      scrapFlag: false,
      reworkCount: 0,
      mrbRepeatCount: 0,
      createdTimestamp: Date.now(),
      updatedTimestamp: Date.now(),
      linkedParts: {},
      holdFlag: false,
      history: []
    };

    setRecords(prev => [...prev, newRecord]);
    addAuditLog('Serial Created', projectId, sn, null, newRecord);
    return { success: true, record: newRecord };
  };

  // ─── PART SYNC VALIDATION ─────────────────────────────────────────
  const validatePartSync = (parentSn: string, partLabel: string, partSn: string, rule: PartSyncRule): { success: boolean; message?: string } => {
    // Format check
    const regex = new RegExp(rule.snFormatRegex);
    if (!regex.test(partSn)) {
      return { success: false, message: `${partLabel}: Invalid format. Expected pattern: ${rule.snFormatRegex}` };
    }

    // Freshness / existing check
    const existingRecord = records.find(r => r.sn === partSn);

    if (rule.requireFresh) {
      // Part must not exist in any record's linkedParts
      const alreadyLinked = records.some(r =>
        Object.values(r.linkedParts).includes(partSn)
      );
      if (alreadyLinked) {
        return { success: false, message: `${partLabel}: ${partSn} is already linked to another unit. Duplication prohibited.` };
      }
    }

    if (rule.mustPassStation && existingRecord) {
      // Check the part has passed the required station
      const hasPassed = existingRecord.history.some(h => h.stageId === rule.mustPassStation && h.status === 'PASSED');
      if (!hasPassed) {
        return { success: false, message: `${partLabel}: ${partSn} has not passed ${rule.mustPassStation}. Cannot link.` };
      }
    }

    // Check if already linked to another parent
    if (rule.linkToParent) {
      const alreadyLinked = records.some(r =>
        r.sn !== parentSn && Object.values(r.linkedParts).includes(partSn)
      );
      if (alreadyLinked) {
        const linkedTo = records.find(r => r.sn !== parentSn && Object.values(r.linkedParts).includes(partSn));
        return { success: false, message: `${partLabel}: ${partSn} already linked to ${linkedTo?.sn || 'another unit'}. 1:1 mapping violation.` };
      }
    }

    // NEW: Self-duplicate check (prevent same SN for different parts on SAME unit)
    const parentRecord = records.find(r => r.sn === parentSn);
    if (parentRecord) {
      const alreadyUsedOnSameUnit = Object.entries(parentRecord.linkedParts).find(([label, sn]) => sn === partSn && label !== partLabel);
      if (alreadyUsedOnSameUnit) {
        return { success: false, message: `${partLabel}: ${partSn} is already used as ${alreadyUsedOnSameUnit[0]} on this unit.` };
      }
    }

    return { success: true };
  };

  // ─── LINK PART ─────────────────────────────────────────────────────
  const linkPart = (parentSn: string, partLabel: string, partSn: string) => {
    setRecords(prev => prev.map(r => {
      if (r.sn === parentSn) {
        return { ...r, linkedParts: { ...r.linkedParts, [partLabel]: partSn }, updatedTimestamp: Date.now() };
      }
      return r;
    }));
    addAuditLog('Part Linked', undefined, parentSn, { partLabel }, { partSn });
  };

  // ─── TOLERANCE VALIDATION ─────────────────────────────────────────
  const validateTolerances = (data: Record<string, number>, specs: ToleranceSpec[]): { allPass: boolean; results: Record<string, boolean> } => {
    const results: Record<string, boolean> = {};
    let allPass = true;
    for (const spec of specs) {
      const value = data[spec.parameter];
      const pass = value !== undefined && value >= spec.min && value <= spec.max;
      results[spec.parameter] = pass;
      if (!pass) allPass = false;
    }
    return { allPass, results };
  };

  // ─── SUBMIT STAGE DATA (REFACTORED) ───────────────────────────────
  const submitStageData = (projectId: string, sn: string, stageId: string, data: any, result: 'PASSED' | 'FAILED', remark?: string) => {
    if (!currentUser) return { success: false, message: 'User not authenticated' };

    const record = records.find(r => r.sn === sn || r.deviceId === sn);
    if (!record) return { success: false, message: 'Serial not found' };

    if (record.scrapFlag) return { success: false, message: 'UNIT SCRAPPED: Action prohibited' };
    if (record.holdFlag) return { success: false, message: 'UNIT ON HOLD: Requires Admin Override to release.' };

    // Sequence check
    if (record.currentStageId !== stageId && !record.history.some(h => h.stageId === stageId && h.status === 'FAILED')) {
      return { success: false, message: 'SEQUENCE VIOLATION: Unit not expected at this station' };
    }

    const project = projects.find(p => p.id === projectId);
    const stage = project?.stages.find(s => s.id === stageId);
    if (!stage) return { success: false, message: 'Stage not found' };

    // STRICTOR VALIDATION for PASSED results
    if (result === 'PASSED') {
      for (const field of stage.fields) {
        if (field.type === FieldType.PART_SYNC && field.partSyncRules) {
          for (const rule of field.partSyncRules) {
            const partSn = data.partSyncValues?.[rule.label];
            if (!partSn) return { success: false, message: `MISSING PART: ${rule.label} is required.` };
            // Double check validation if possible here, though usually done prior.
            // For now, ensuring it's present is minimum.
          }
        }
        if (field.type === FieldType.CHECKBOX_INSPECTION && field.checkpoints) {
          for (const cp of field.checkpoints) {
            if (data[cp.id] !== 'PASS') {
              return { success: false, message: `INVALID CHECKPOINT: ${cp.label} must be PASSED.` };
            }
          }
        }
        if (field.type === FieldType.NUMERIC_TOLERANCE && field.toleranceSpecs) {
          const { allPass } = validateTolerances(data.toleranceValues || {}, field.toleranceSpecs);
          if (!allPass) return { success: false, message: 'TOLERANCE VIOLATION: Values out of range for SUCCESS.' };
        }
      }
    }

    let nextStatus: SerialStatus = result === 'PASSED' ? SerialStatus.IN_PROCESS : SerialStatus.FAILED;
    let nextStageId = stageId;
    let holdFlag = record.holdFlag;
    let nextPossibleStationId = record.nextPossibleStationId;

    if (result === 'FAILED') {
      if (stage.holdOnFail || stage.failAction === ResultAction.HOLD) {
        // HOLD: Freeze the unit
        nextStatus = SerialStatus.ON_HOLD;
        holdFlag = true;
        nextStageId = stageId; // Unit stays at current station
      } else {
        // REWORK: Route to fail stage or rework
        nextStatus = SerialStatus.FAILED;
        nextStageId = stage.failRouteStageId || stageId;
        nextPossibleStationId = stageId; // Can re-enter at this station after rework
      }
    } else if (result === 'PASSED') {
      if (stage.isSemiDependent && stage.feedsIntoStageId) {
        // Semi-dependent: mark as COMPLETED (ready for main line)
        nextStageId = stageId;
        nextStatus = SerialStatus.COMPLETED;
      } else if (stage.nextStageId) {
        nextStageId = stage.nextStageId;
        nextStatus = SerialStatus.IN_PROCESS;
      } else {
        // Last station in flow
        nextStatus = SerialStatus.COMPLETED;
      }
      // Reset nextPossibleStationId on pass
      nextPossibleStationId = undefined;
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
      status: nextStatus,
      holdFlag,
      nextPossibleStationId,
      reworkCount: result === 'FAILED' ? record.reworkCount + 1 : record.reworkCount,
      updatedTimestamp: Date.now(),
      deviceId: data.deviceIdInput || record.deviceId, // Persist Device ID if provided
      history: [...record.history, historyItem]
    };

    if (result === 'PASSED' && data.cartonDeviceIds && data.cartonDeviceIds.length > 0) {
      const cartonField = stage.fields.find(f => f.type === FieldType.MASTER_CARTON_SYNC);
      const required = cartonField?.masterCartonSize || 20;
      const aggRes = aggregateMasterCarton(sn, data.cartonDeviceIds, required);
      if (!aggRes.success) return { success: false, message: `AGGREGATION ERROR: ${aggRes.message}` };
    }

    setRecords(prev => prev.map(r => (r.sn === sn || r.deviceId === sn) ? updatedRecord : r));
    addAuditLog('Stage Submitted', projectId, sn, record, updatedRecord);
    return { success: true, holdTriggered: holdFlag && !record.holdFlag };
  };

  // ─── ADMIN OVERRIDE HOLD ──────────────────────────────────────────
  const adminOverrideHold = (sn: string, reason: string) => {
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return { success: false, message: 'Admin credentials required for Hold Override.' };
    }
    const record = records.find(r => r.sn === sn);
    if (!record) return { success: false, message: 'Serial not found' };
    if (!record.holdFlag) return { success: false, message: 'Unit is not on Hold.' };

    const updatedRecord: SerialNumberRecord = {
      ...record,
      holdFlag: false,
      status: SerialStatus.IN_PROCESS,
      updatedTimestamp: Date.now(),
      history: [...record.history, {
        stageId: record.currentStageId,
        timestamp: Date.now(),
        userId: currentUser.id,
        status: 'PASSED' as const,
        data: { holdOverride: true },
        remark: `Admin Override: ${reason}`,
        isOverride: true,
        overrideReason: reason
      }]
    };

    setRecords(prev => prev.map(r => r.sn === sn ? updatedRecord : r));
    addAuditLog('Admin Hold Override', record.projectId, sn, record, updatedRecord);
    return { success: true };
  };

  // ─── MASTER CARTON AGGREGATION (ST-11) ─────────────────────────────
  const aggregateMasterCarton = (masterCartonSn: string, deviceIds: string[], requiredSize: number = 20): { success: boolean; message?: string } => {
    if (deviceIds.length !== requiredSize) {
      return { success: false, message: `Exactly ${requiredSize} device IDs required. Currently: ${deviceIds.length}` };
    }

    // Check for duplicates
    const unique = new Set(deviceIds);
    if (unique.size !== deviceIds.length) {
      return { success: false, message: 'Duplicate Device IDs detected. Each ID must be unique.' };
    }

    // Verify all devices passed ST-10
    for (const did of deviceIds) {
      const rec = records.find(r => r.sn === did || r.deviceId === did);
      if (!rec) return { success: false, message: `Device ${did} not found in system.` };
      const passedST10 = rec.history.some(h => h.stageId === 'st-10' && h.status === 'PASSED');
      if (!passedST10) return { success: false, message: `Device ${did} has not passed Station 10.` };
    }

    // Link all devices to master carton
    setRecords(prev => prev.map(r => {
      if (deviceIds.includes(r.sn) || deviceIds.includes(r.deviceId || '')) {
        return { ...r, masterCartonId: masterCartonSn, updatedTimestamp: Date.now() };
      }
      return r;
    }));

    addAuditLog('Master Carton Aggregated', 'tohands-main', masterCartonSn, { deviceIds });
    return { success: true };
  };

  // ─── DOCUMENT AUDIT MATCH (ST-12) ─────────────────────────────────
  const documentAuditMatch = (masterCartonSn: string, scannedIds: string[]): { matches: Record<string, boolean>; allMatch: boolean } => {
    const linkedDevices = records.filter(r => r.masterCartonId === masterCartonSn).map(r => r.deviceId || r.sn);
    const matches: Record<string, boolean> = {};
    let allMatch = true;

    for (const expected of linkedDevices) {
      const found = scannedIds.includes(expected);
      matches[expected] = found;
      if (!found) allMatch = false;
    }

    return { matches, allMatch };
  };

  // ─── REWORK STATION LOGIC (PRODUCTION-GRADE) ────────────────────────

  /**
   * 1. enterRework — Validates and locks a unit into IN_REWORK status
   */
  const enterRework = (sn: string) => {
    const record = records.find(r => r.sn === sn || r.deviceId === sn);
    if (!record) return { success: false, message: 'REJECT: Serial Number not found in system.' };

    // Already scrapped
    if (record.scrapFlag || record.status === SerialStatus.SCRAPPED) {
      return { success: false, message: 'REJECT: Unit is permanently SCRAPPED. Cannot enter rework.' };
    }
    // Already completed
    if (record.status === SerialStatus.COMPLETED) {
      return { success: false, message: 'REJECT: Unit is COMPLETED and shipped. Cannot enter rework.' };
    }
    // RESUMPTION LOGIC
    if (record.status === SerialStatus.IN_REWORK) {
      const failedStageId = record.currentStageId;
      const project = projects.find((p: Project) => p.id === record.projectId);
      const failedStage = project?.stages.find((s: Stage) => s.id === failedStageId);
      const lastFailure = [...record.history].reverse().find(h => h.status === 'FAILED');
      const failedByUser = lastFailure ? users.find((u: User) => u.id === lastFailure.userId) : null;

      return {
        success: true,
        record: record,
        resumed: true,
        failureInfo: {
          failedStation: failedStage?.name || failedStageId,
          failedStageId: failedStageId,
          failureReason: lastFailure?.remark || 'Procedural Hold / MRB Decision',
          failureTimestamp: lastFailure?.timestamp || record.updatedTimestamp,
          failedBy: failedByUser?.fullName || lastFailure?.userId || 'System',
          reworkCount: record.reworkCount,
          deviceId: record.deviceId || 'N/A',
          mrbTicketId: record.mrbTicketId || null,
          mrbRepeatCount: record.mrbRepeatCount
        }
      };
    }
    // Must be in an eligible status
    const eligible = [
      SerialStatus.FAILED, SerialStatus.ON_HOLD,
      SerialStatus.REWORK_PENDING, SerialStatus.MRB_HOLD
    ];
    const statusStr = String(record.status);
    const isEligible = eligible.includes(record.status) ||
      ['FAILED', 'ON_HOLD', 'ON HOLD', 'REWORK-PENDING', 'MRB-HOLD'].includes(statusStr) ||
      record.holdFlag;

    if (!isEligible) {
      const lastHistory = record.history[record.history.length - 1];
      if (lastHistory && lastHistory.data?.action === 'REWORK_COMPLETE') {
        return { success: false, message: `REJECT: Rework already completed for this failure record. Unit is currently "${record.status}".` };
      }
      return { success: false, message: `REJECT: Unit status is "${record.status}". Must be FAILED, ON HOLD, REWORK-PENDING, or MRB-HOLD to enter rework.` };
    }

    // Validate failed station is between ST-1 and ST-14
    const failedStageId = record.currentStageId;
    const project = projects.find((p: Project) => p.id === record.projectId);
    const failedStage = project?.stages.find((s: Stage) => s.id === failedStageId);

    // Lock the unit
    const updatedRecord: SerialNumberRecord = {
      ...record,
      status: SerialStatus.IN_REWORK,
      updatedTimestamp: Date.now(),
      history: [...record.history, {
        stageId: 'rework',
        timestamp: Date.now(),
        userId: currentUser?.id || 'sys',
        status: 'PASSED' as const,
        data: { action: 'ENTER_REWORK', previousStatus: record.status },
        remark: `REWORK ENTRY: Unit locked for rework from ${failedStage?.name || failedStageId}`
      }]
    };

    setRecords(prev => prev.map(r =>
      (r.sn === record.sn || (record.deviceId && r.sn === record.deviceId)) ? updatedRecord : r
    ));
    addAuditLog('Rework Entry', record.projectId, record.sn, record, updatedRecord);

    // Return the failure info for auto-display
    const lastFailure = [...record.history].reverse().find(h => h.status === 'FAILED');
    const failedByUser = lastFailure ? users.find((u: User) => u.id === lastFailure.userId) : null;

    return {
      success: true,
      record: updatedRecord,
      failureInfo: {
        failedStation: failedStage?.name || failedStageId,
        failedStageId: failedStageId,
        failureReason: lastFailure?.remark || 'Procedural Hold / MRB Decision',
        failureTimestamp: lastFailure?.timestamp || record.updatedTimestamp,
        failedBy: failedByUser?.fullName || lastFailure?.userId || 'System',
        reworkCount: record.reworkCount,
        deviceId: record.deviceId || 'N/A',
        mrbTicketId: record.mrbTicketId || null,
        mrbRepeatCount: record.mrbRepeatCount
      }
    };
  };

  /**
   * 2. replacePartInRework — Strict type-matched component replacement
   *    Main PCB is BLOCKED from replacement.
   */
  const replacePartInRework = (parentSn: string, partLabel: string, newPartSn: string, remarks: string) => {
    // Block Main PCB replacement
    if (partLabel === 'Main PCB' || partLabel === 'PCB SN') {
      return { success: false, message: 'BLOCKED: Main PCB can NEVER be replaced. Use "Normal Rework" or "Scrap" instead.' };
    }

    const parent = records.find(r => r.sn === parentSn || r.deviceId === parentSn);
    if (!parent) return { success: false, message: 'Parent device serial not found.' };

    // CRITICAL: Component must be ALREADY LINKED
    const currentOldSn = parent.linkedParts[partLabel];
    if (!currentOldSn) {
      return { success: false, message: `REJECTION: Component "${partLabel}" is not linked to this device at any station. No replacement allowed.` };
    }

    if (parent.status !== SerialStatus.IN_REWORK) {
      return { success: false, message: 'Unit must be in IN_REWORK status to replace parts.' };
    }
    if (!remarks.trim()) return { success: false, message: 'Replacement remarks are mandatory.' };

    // Validate new part exists
    const newPart = records.find(r => r.sn === newPartSn || r.deviceId === newPartSn);
    if (!newPart) return { success: false, message: `INVENTORY ERROR: Part "${newPartSn}" not found in database.` };

    // Validate new part not linked to another device
    if (newPart.parentSerialId && newPart.parentSerialId !== parent.sn) {
      return { success: false, message: `OWNERSHIP ERROR: Part "${newPartSn}" is already linked to device ${newPart.parentSerialId}.` };
    }

    // Validate new part not scrapped
    if (newPart.scrapFlag || newPart.status === SerialStatus.SCRAPPED) {
      return { success: false, message: `SCRAP VIOLATION: Part "${newPartSn}" is marked as SCRAPPED.` };
    }

    // Validate part status is "Fresh" (CREATED) or "Available" (IN_PROCESS + no parent)
    const isFresh = newPart.status === SerialStatus.CREATED;
    const isAvailable = (newPart.status === SerialStatus.IN_PROCESS || newPart.status === SerialStatus.COMPLETED) && !newPart.parentSerialId;

    if (!isFresh && !isAvailable && newPart.parentSerialId !== parent.sn) {
      return { success: false, message: `STATUS REJECTION: Part is "${newPart.status}". Only "Fresh" or "Available" parts are eligible.` };
    }

    // Strict type matching: new part's subType must match the partLabel
    if (newPart.subType && newPart.subType !== partLabel) {
      return { success: false, message: `TYPE MISMATCH: Scanning a "${newPart.subType}" for a "${partLabel}" slot is prohibited.` };
    }

    const oldPartSn = currentOldSn;

    const updatedParent: SerialNumberRecord = {
      ...parent,
      linkedParts: { ...parent.linkedParts, [partLabel]: newPartSn },
      updatedTimestamp: Date.now(),
      history: [...parent.history, {
        stageId: 'rework',
        timestamp: Date.now(),
        userId: currentUser?.id || 'sys',
        status: 'PASSED' as const,
        data: { action: 'PART_REPLACE', partLabel, oldPartSn, newPartSn },
        remark: `REWORK REPLACE [${partLabel}]: Old=${oldPartSn} → New=${newPartSn}. ${remarks}`,
        isReplacementEvent: true,
        unlinkedSerialId: oldPartSn
      }]
    };

    setRecords(prev => prev.map(r => {
      if (r.sn === parent.sn || (parent.deviceId && r.sn === parent.deviceId)) return updatedParent;
      // Unlink old part (free for reuse)
      if (r.sn === oldPartSn) {
        return { ...r, parentSerialId: null, updatedTimestamp: Date.now() };
      }
      // Link new part
      if (r.sn === newPartSn) {
        return { ...r, parentSerialId: parent.sn, updatedTimestamp: Date.now() };
      }
      return r;
    }));

    addAuditLog('Part Replaced in Rework', parent.projectId, parent.sn, parent, updatedParent);
    return { success: true, oldPartSn, newPartSn };
  };

  /**
   * 3. normalReworkMainPCB — Correction-only rework (no replacement)
   *    Main PCB stays linked. Only remarks are recorded.
   */
  const normalReworkMainPCB = (parentSn: string, remarks: string) => {
    const record = records.find(r => r.sn === parentSn || r.deviceId === parentSn);
    if (!record) return { success: false, message: 'Serial not found.' };
    if (record.status !== SerialStatus.IN_REWORK) {
      return { success: false, message: 'Unit must be in IN_REWORK status.' };
    }
    if (!remarks.trim()) return { success: false, message: 'Rework remarks are mandatory for Main PCB Normal Rework.' };

    const updatedRecord: SerialNumberRecord = {
      ...record,
      updatedTimestamp: Date.now(),
      history: [...record.history, {
        stageId: 'rework',
        timestamp: Date.now(),
        userId: currentUser?.id || 'sys',
        status: 'PASSED' as const,
        data: { action: 'NORMAL_REWORK_MAIN_PCB', correctionOnly: true },
        remark: `MAIN PCB NORMAL REWORK (Correction Only): ${remarks}`
      }]
    };

    setRecords(prev => prev.map(r =>
      (r.sn === record.sn || (record.deviceId && r.sn === record.deviceId)) ? updatedRecord : r
    ));
    addAuditLog('Main PCB Normal Rework', record.projectId, record.sn, record, updatedRecord);
    return { success: true };
  };

  /**
   * 4. scrapMainPCB — Irreversible scrap with supervisor gate
   */
  const scrapMainPCB = (sn: string, reason: string, supervisorConfirmed: boolean = false) => {
    // Role check
    if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.MODERATOR) {
      return { success: false, message: 'AUTHORIZATION DENIED: Only Supervisors (Admin/Moderator) can authorize scrap.' };
    }
    // Confirmation gate
    if (!supervisorConfirmed) {
      return { success: false, message: 'Supervisor confirmation required. Please complete the 3-step scrap approval.' };
    }
    if (!reason.trim()) return { success: false, message: 'Scrap reason is mandatory.' };

    const record = records.find(r => r.sn === sn || r.deviceId === sn);
    if (!record) return { success: false, message: 'Serial not found.' };

    // AUTO-CREATE MRB TICKET ( Governance Record )
    const mrbRes = createMrbTicket({
      projectId: record.projectId,
      partName: 'Main PCB',
      defectCategory: 'Rework Scrap',
      description: `AUTOGENERATED FROM REWORK SCRAP. Device ID: ${record.deviceId || 'N/A'}, PCB SN: ${record.sn}. Reason: ${reason}`,
      lineName: 'Rework Station',
      shift: 'N/A',
      createdBy: currentUser.fullName,
      source: 'Rework Scrap',
      serialNumbers: [record.sn]
    });

    const updatedRecord: SerialNumberRecord = {
      ...record,
      status: SerialStatus.SCRAPPED,
      scrapFlag: true,
      mrbTicketId: mrbRes.ticketId,
      updatedTimestamp: Date.now(),
      draftReworkData: undefined, // Clear draft on scrap
      history: [...record.history, {
        stageId: 'rework',
        timestamp: Date.now(),
        userId: currentUser.id,
        status: 'FAILED' as const,
        data: {
          action: 'SCRAP_MAIN_PCB',
          mrbTicketId: mrbRes.ticketId,
          deviceId: record.deviceId,
          mainPcbSn: record.sn,
          scrapApprovedBy: currentUser.fullName,
          irreversible: true
        },
        remark: `SCRAP Main PCB [IRREVERSIBLE]: ${reason}`
      }]
    };

    // Unlink all soft-linked parts → mark available for reuse
    const linkedSns = Object.values(record.linkedParts);
    setRecords(prev => prev.map(r => {
      if (r.sn === record.sn || (record.deviceId && r.sn === record.deviceId)) return updatedRecord;
      if (linkedSns.includes(r.sn) || linkedSns.includes(r.deviceId || '')) {
        return { ...r, parentSerialId: null, updatedTimestamp: Date.now() };
      }
      return r;
    }));

    addAuditLog('Main PCB Scrapped (Irreversible)', record.projectId, record.sn, record, updatedRecord);
    return { success: true };
  };

  /**
   * 5. completeRework — Finalize, increment count, route back to production
   */
  const completeRework = (parentSn: string, remarks: string) => {
    const record = records.find(r => r.sn === parentSn || r.deviceId === parentSn);
    if (!record) return { success: false, message: 'Serial not found.' };
    if (record.status !== SerialStatus.IN_REWORK) {
      return { success: false, message: 'Unit must be in IN_REWORK status to complete rework.' };
    }
    if (!remarks.trim()) return { success: false, message: 'Completion remarks are mandatory.' };

    // Determine return station
    const returnStationId = record.nextPossibleStationId || record.currentStageId;
    const project = projects.find((p: Project) => p.id === record.projectId);
    const returnStage = project?.stages.find((s: Stage) => s.id === returnStationId);

    const updatedRecord: SerialNumberRecord = {
      ...record,
      status: SerialStatus.IN_PROCESS,
      currentStageId: returnStationId,
      reworkCount: record.reworkCount + 1,
      holdFlag: false,
      updatedTimestamp: Date.now(),
      draftReworkData: undefined, // Clear draft data on completion
      history: [...record.history, {
        stageId: 'rework',
        timestamp: Date.now(),
        userId: currentUser?.id || 'sys',
        status: 'PASSED' as const,
        data: {
          action: 'REWORK_COMPLETE',
          returnStation: returnStationId,
          reworkCountAfter: record.reworkCount + 1
        },
        remark: `REWORK COMPLETE: Routed to ${returnStage?.name || returnStationId}. ${remarks}`
      }]
    };

    setRecords(prev => prev.map(r =>
      (r.sn === record.sn || (record.deviceId && r.sn === record.deviceId)) ? updatedRecord : r
    ));
    addAuditLog('Rework Completed', record.projectId, record.sn, record, updatedRecord);
    return { success: true, returnStation: returnStage?.name || returnStationId };
  };


  // ─── MERGE SERIALS ─────────────────────────────────────────────────
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

  // ─── SCRAP SERIAL ──────────────────────────────────────────────────
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

  // ─── USER MANAGEMENT ───────────────────────────────────────────────
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

  // ─── PROJECT MANAGEMENT ────────────────────────────────────────────
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

  const deleteProject = (projectId: string) => {
    if (currentUser?.role !== UserRole.ADMIN) return { success: false, message: 'Admin access required' };
    addAuditLog('Project Deletion Initiated', projectId);
    setRecords(prev => prev.filter(r => r.projectId !== projectId));
    setProjects(prev => prev.filter(p => p.id !== projectId));
    addAuditLog('Project Deleted Permanently', projectId);
    return { success: true };
  };

  const deleteStage = (projectId: string, stageId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const stages = project.stages.filter(s => s.id !== stageId)
      .map((s, idx) => ({ ...s, order: idx }));
    for (let i = 0; i < stages.length - 1; i++) {
      stages[i].nextStageId = stages[i + 1].id;
    }
    if (stages.length > 0) {
      delete stages[stages.length - 1].nextStageId;
    }
    updateProject(projectId, { stages });
    addAuditLog('Stage Deleted', projectId, undefined, { stageId });
  };

  const renameStage = (projectId: string, stageId: string, newName: string) => {
    if (!newName.trim()) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const stages = project.stages.map(s => s.id === stageId ? { ...s, name: newName } : s);
    updateProject(projectId, { stages });
    addAuditLog('Stage Renamed', projectId, undefined, { stageId, newName });
  };

  const createMrbTicket = (data: Omit<MrbTicket, 'id' | 'timestamp' | 'dispositions' | 'status'>) => {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = mrbTickets.filter(t => t.id.includes(dateStr)).length + 1;
    const ticketId = `MRB-${dateStr}-${count.toString().padStart(4, '0')}`;

    const newTicket: MrbTicket = {
      ...data,
      id: ticketId,
      source: data.source || 'Manual',
      timestamp: Date.now(),
      dispositions: [],
      status: MrbStatus.OPEN,
    };

    setMrbTickets(prev => [...prev, newTicket]);

    // Lock serials
    setRecords(prev => prev.map(r => {
      if (data.serialNumbers.includes(r.sn) || data.serialNumbers.includes(r.deviceId || '')) {
        return { ...r, status: SerialStatus.MRB_HOLD, mrbTicketId: ticketId, updatedTimestamp: Date.now() };
      }
      return r;
    }));

    addAuditLog('MRB Ticket Created', data.projectId, ticketId, { serialNumbers: data.serialNumbers });
    return { success: true, ticketId };
  };

  const disposeMrbTicket = (ticketId: string, serialsToDispose: string[], action: 'SCRAP' | 'REWORK', remarks: string) => {
    const ticket = mrbTickets.find(t => t.id === ticketId);
    if (!ticket) return { success: false, message: 'Ticket not found' };

    const newDisposition: MrbDisposition = {
      serialNumbers: serialsToDispose,
      action,
      remarks,
      disposedBy: currentUser?.id || 'SYSTEM',
      timestamp: Date.now(),
    };

    setMrbTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const remainingSerials = t.serialNumbers.filter(sn => !serialsToDispose.includes(sn));
        const newStatus = remainingSerials.length === 0 ? MrbStatus.CLOSED : MrbStatus.PARTIALLY_CLOSED;
        return { ...t, dispositions: [...t.dispositions, newDisposition], status: newStatus };
      }
      return t;
    }));

    // Update record status
    setRecords(prev => prev.map(r => {
      if (serialsToDispose.includes(r.sn) || serialsToDispose.includes(r.deviceId || '')) {
        const isRepeat = r.history.some(h => h.isReplacementEvent); // Simple check for now
        return {
          ...r,
          status: action === 'SCRAP' ? SerialStatus.SCRAPPED : SerialStatus.REWORK_PENDING,
          scrapFlag: action === 'SCRAP',
          mrbRepeatCount: r.mrbRepeatCount + 1,
          updatedTimestamp: Date.now(),
          draftReworkData: undefined // Clear draft on MRB move
        };
      }
      return r;
    }));

    addAuditLog(`MRB Disposition: ${action}`, ticket.projectId, ticketId, { serialsToDispose });
    return { success: true };
  };

  const saveReworkDraft = (sn: string, data: any) => {
    setRecords(prev => prev.map(r =>
      (r.sn === sn || (r.deviceId && r.sn === r.deviceId)) ? { ...r, draftReworkData: data, updatedTimestamp: Date.now() } : r
    ));
    return { success: true };
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
    deleteProject,
    deleteStage,
    renameStage,
    submitStageData,
    createSerial,
    mergeSerials,
    scrapSerial,
    updateUser,
    addAuditLog,
    setUsers,
    // New 14-station functions
    validatePartSync,
    linkPart,
    validateTolerances,
    adminOverrideHold,
    aggregateMasterCarton,
    documentAuditMatch,
    // MRB Functions
    mrbTickets,
    createMrbTicket,
    disposeMrbTicket,
    // Rework Functions (Production-Grade)
    enterRework,
    replacePartInRework,
    normalReworkMainPCB,
    scrapMainPCB,
    completeRework,
    saveReworkDraft,
  };
};
