export type SingleValueOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith';

export type ListOperator = 'in' | 'notIn';

type SingleValueFilter<T, K extends keyof T> = {
  [O in SingleValueOperator]?: T[K];
};

type ListValueFilter<T, K extends keyof T> = {
  [O in ListOperator]?: T[K][];
};

export type FieldFilter<T, K extends keyof T> =
  | SingleValueFilter<T, K>
  | ListValueFilter<T, K>;

export type ObjectFilter<T> = {
  [K in keyof T]?: FieldFilter<T, K>;
} & {
  and?: ObjectFilter<T>[];
  or?: ObjectFilter<T>[];
};
