import type { z } from "zod";
import type * as s from "../api/schemas";

export type Role = z.infer<typeof s.roleSchema>;
export type CodeLabel = z.infer<typeof s.codeLabelSchema>;
export type User = z.infer<typeof s.userSchema>;
export type TokenResponse = z.infer<typeof s.tokenResponseSchema>;

export type FiscalYear = z.infer<typeof s.fiscalYearSchema>;
export type UnitPair = z.infer<typeof s.unitPairSchema>;
export type MasterRoRow = z.infer<typeof s.masterRoRowSchema>;
export type MasterRoDataset = z.infer<typeof s.masterRoDatasetSchema>;
export type DatasetIssue = z.infer<typeof s.datasetIssueSchema>;
export type Priority = z.infer<typeof s.priorityValueSchema>;

export type ReviewRequestStatus = z.infer<typeof s.reviewRequestStatusSchema>;
export type Category = z.infer<typeof s.categorySchema>;
export type ReviewRequest = z.infer<typeof s.reviewRequestSchema>;
export type DocumentKind = "tor" | "rab";

export type PipelineStageName = z.infer<typeof s.pipelineStageSchema>;
export type StageStatus = z.infer<typeof s.stageStatusSchema>;
export type Stage = z.infer<typeof s.stageSchema>;
export type Progress = z.infer<typeof s.progressSchema>;

export type ItemStatus = z.infer<typeof s.itemStatusSchema>;
export type InspectionType = z.infer<typeof s.inspectionTypeSchema>;
export type CheckMethod = z.infer<typeof s.checkMethodSchema>;
export type CheckExecutor = z.infer<typeof s.checkExecutorSchema>;
export type Evidence = z.infer<typeof s.evidenceSchema>;
export type ResultItem = z.infer<typeof s.resultItemSchema>;
export type Screening2 = z.infer<typeof s.screening2Schema>;
export type HasilFinal = z.infer<typeof s.hasilFinalSchema>;
export type ReviewResult = z.infer<typeof s.reviewResultSchema>;
export type FinalResult = z.infer<typeof s.finalResultSchema>;
export type HistoryEntry = z.infer<typeof s.historyEntrySchema>;
export type Decision = z.infer<typeof s.decisionValueSchema>;

export type ChecklistItem = z.infer<typeof s.checklistItemSchema>;
export type ChecklistVersion = z.infer<typeof s.checklistVersionSchema>;

export type ReferenceDocument = z.infer<typeof s.referenceDocumentSchema>;
export type ReferenceDocType = z.infer<typeof s.referenceDocTypeSchema>;
export type Validity = z.infer<typeof s.validitySchema>;
export type ReferenceDocumentStatus = z.infer<typeof s.referenceDocumentStatusSchema>;

export type ReferenceTableType = z.infer<typeof s.referenceTableTypeSchema>;
export type TableExtraction = z.infer<typeof s.tableExtractionSchema>;
export type ReferenceTableVersion = z.infer<typeof s.referenceTableVersionSchema>;
export type ReferenceTableRow = z.infer<typeof s.referenceTableRowSchema>;
export type VersionStatus = z.infer<typeof s.versionStatusSchema>;

export type CurationStatus = z.infer<typeof s.curationStatusSchema>;
export type CurationSample = z.infer<typeof s.curationSampleSchema>;
export type CurationSampleDetail = z.infer<typeof s.curationSampleDetailSchema>;
export type CurationExport = z.infer<typeof s.curationExportSchema>;

export type Notification = z.infer<typeof s.notificationSchema>;
