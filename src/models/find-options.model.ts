import { Exclude } from 'class-transformer';
import { EntityManager } from 'typeorm';

type Primitive = string | number | boolean | symbol | null | undefined | bigint;

type IsRelation<T> = T extends (...args: any[]) => any
  ? false
  : T extends Primitive | Date
    ? false
    : T extends object
      ? true
      : false;

type RelationKeys<T> = {
  [K in keyof T]: IsRelation<T[K]> extends true ? K : never;
}[keyof T];

export type RelationsOnly<T> = Pick<T, RelationKeys<T>>;

type ElementType<T> = T extends (infer E)[] ? E : T;

export type JoinOptions = {
  join?: 'left' | 'inner';
  withDeleted?: boolean;
};

export type NestedRelations<T> = {
  [K in keyof T]?: JoinOptions & {
    relations?: NestedRelations<ElementType<T[K]>>;
  };
};

export class FindOptions<T> {
  @Exclude()
  relations?: NestedRelations<RelationsOnly<T>> | RelationKeys<T>[];

  @Exclude()
  withDeleted?: boolean;

  @Exclude()
  onlyDeleted?: boolean;

  @Exclude()
  manager?: EntityManager;
}

export class FindByIdOptions<T> extends FindOptions<T> {
  throwNotFound?: boolean;
}
