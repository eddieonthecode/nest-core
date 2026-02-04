export enum SoftMutationStatus {
  NOT_FOUND = 'NOT_FOUND',
  NO_OP = 'NO_OP', // No operation needed (e.g., already deleted or already restored)
  SUCCESS = 'SUCCESS',
}

export interface SoftMutationResult<T> {
  status: SoftMutationStatus;
  entity?: T;
}

export interface BulkSoftMutationResult<T> {
  total: number;
  success: T[];
  noOp: T[];
  notFound: string[];
}
