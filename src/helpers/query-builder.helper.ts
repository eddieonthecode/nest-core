import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  Brackets,
  DataSource,
  EntityMetadata,
  EntityTarget,
  SelectQueryBuilder,
  TypeORMError,
  WhereExpressionBuilder,
} from "typeorm";
import {
  FindOptions,
  FindRequest,
  FindSort,
  ListOperator,
  ObjectFilter,
  SingleValueOperator,
} from "../models";

/* =======================
 * Operator types
 * ======================= */

interface OperatorContext {
  fieldName: string;
  paramName: string;
  value: any;
}

type OperatorResult = {
  command: string;
  paramValue?: any;
};

type SingleOpHandler = (ctx: OperatorContext) => OperatorResult;
type ListOpHandler = (ctx: OperatorContext) => OperatorResult;

/* =======================
 * Operator handlers
 * ======================= */

const SINGLE_OP_HANDLERS: Record<SingleValueOperator, SingleOpHandler> = {
  eq: ({ fieldName, paramName, value }) => {
    if (value === null) return { command: `${fieldName} IS NULL` };
    return {
      command: `${fieldName} = :${paramName}`,
      paramValue: value,
    };
  },

  neq: ({ fieldName, paramName, value }) => {
    if (value === null) return { command: `${fieldName} IS NOT NULL` };
    return {
      command: `${fieldName} <> :${paramName}`,
      paramValue: value,
    };
  },

  gt: ({ fieldName, paramName, value }) => ({
    command: `${fieldName} > :${paramName}`,
    paramValue: value,
  }),

  gte: ({ fieldName, paramName, value }) => ({
    command: `${fieldName} >= :${paramName}`,
    paramValue: value,
  }),

  lt: ({ fieldName, paramName, value }) => ({
    command: `${fieldName} < :${paramName}`,
    paramValue: value,
  }),

  lte: ({ fieldName, paramName, value }) => ({
    command: `${fieldName} <= :${paramName}`,
    paramValue: value,
  }),

  contains: ({ fieldName, paramName, value }) => ({
    command: `unaccent(LOWER(${fieldName})) ILIKE unaccent(:${paramName})`,
    paramValue: `%${value}%`,
  }),

  notContains: ({ fieldName, paramName, value }) => ({
    command: `unaccent(LOWER(${fieldName})) NOT ILIKE unaccent(:${paramName})`,
    paramValue: `%${value}%`,
  }),

  startsWith: ({ fieldName, paramName, value }) => ({
    command: `unaccent(LOWER(${fieldName})) ILIKE unaccent(:${paramName})`,
    paramValue: `${value}%`,
  }),

  endsWith: ({ fieldName, paramName, value }) => ({
    command: `unaccent(LOWER(${fieldName})) ILIKE unaccent(:${paramName})`,
    paramValue: `%${value}`,
  }),
};

const LIST_OP_HANDLERS: Record<ListOperator, ListOpHandler> = {
  in: ({ fieldName, paramName, value }) => {
    if (!value.length) return { command: "1=0" };
    return {
      command: `${fieldName} IN (:...${paramName})`,
      paramValue: value,
    };
  },

  notIn: ({ fieldName, paramName, value }) => {
    if (!value.length) return { command: "1=1" };
    return {
      command: `${fieldName} NOT IN (:...${paramName})`,
      paramValue: value,
    };
  },
};

/* =======================
 * Validation hook
 * ======================= */

export interface QueryValidationHooks {
  validateFilterField?(field: string, operator: string): void;
}

/* =======================
 * QueryBuilderHelper
 * ======================= */

export class QueryBuilderHelper<T> {
  readonly metadata: EntityMetadata;
  readonly tableName: string;
  private readonly columnSet: Set<string>;

  constructor(
    protected dataSource: DataSource,
    protected entity: EntityTarget<T>,
    protected hooks?: QueryValidationHooks,
  ) {
    this.metadata = this.dataSource.getMetadata(this.entity);
    this.tableName = this.metadata.tableName;
    this.columnSet = new Set(this.metadata.columns.map((c) => c.propertyName));
  }

  /* ---------- Base ---------- */

  buildSearchQuery(field: string, valuePlaceholder: string, useAccent = false) {
    return useAccent
      ? `LOWER(${field}) ILIKE :${valuePlaceholder}`
      : `unaccent(LOWER(${field})) ILIKE unaccent(:${valuePlaceholder})`;
  }

  buildBaseQuery(
    qb: SelectQueryBuilder<T>,
    req: FindRequest<T>,
    options?: FindOptions<T>,
  ): SelectQueryBuilder<T> {
    // Soft delete
    qb = qb.withDeleted();

    this.applySoftDeleteFilter(qb, qb.alias, options);

    // Search
    const keyword = req?.search?.keyword?.trim()?.toLowerCase();
    if (keyword && req.search.fields.length) {
      qb.andWhere(
        new Brackets((searchQb) => {
          req.search.fields.forEach((field) => {
            this.assertColumn(field);

            searchQb.orWhere(
              this.buildSearchQuery(
                `${qb.alias}.${field}`,
                "search",
                req.search.useAccent,
              ),
              { search: `%${keyword}%` },
            );
          });
        }),
      );
    }

    // Filter
    if (req.filter) {
      qb.andWhere(
        new Brackets((filterQb) =>
          this.buildObjectFilter(filterQb, qb.alias, req.filter),
        ),
      );
    }

    // Sort
    this.addSort(qb, req.sort);

    return qb;
  }

  /* ---------- Filter ---------- */

  buildObjectFilter(
    qb: WhereExpressionBuilder,
    alias: string,
    filter?: ObjectFilter<T>,
  ) {
    try {
      if (!filter) return;

      if (
        typeof filter !== "object" ||
        filter === null ||
        filter.constructor !== Object
      ) {
        throw new BadRequestException("Filter must be an object");
      }

      for (const field in filter) {
        const fieldFilter = filter[field];
        if (!fieldFilter) continue;

        if (field === "and" || field === "or") {
          if (!Array.isArray(fieldFilter)) {
            throw new BadRequestException(`Invalid logical operator: ${field}`);
          }

          qb.andWhere(
            new Brackets((groupQb) => {
              fieldFilter.forEach((nested) => {
                const method = field === "and" ? "andWhere" : "orWhere";
                groupQb[method](
                  new Brackets((nestedQb) =>
                    this.buildObjectFilter(nestedQb, alias, nested),
                  ),
                );
              });
            }),
          );
          continue;
        }

        this.assertColumn(field);

        for (const operator of Object.keys(fieldFilter)) {
          const value = fieldFilter[operator];
          if (value === undefined) continue;

          this.hooks?.validateFilterField?.(field, operator);

          const paramName = `${field}_${randomUUID().replaceAll("-", "_")}`;
          const fieldName = `${alias}.${field}`;

          let result: OperatorResult;

          if (this.isSingleValueOperator(operator)) {
            if (!this.isPrimitive(value)) {
              throw new BadRequestException(
                `Invalid value for ${field} with operator ${operator}`,
              );
            }

            result = SINGLE_OP_HANDLERS[operator]({
              fieldName,
              paramName,
              value,
            });
          } else if (this.isListOperator(operator)) {
            if (
              !Array.isArray(value) ||
              !value.every((v) => this.isPrimitive(v))
            ) {
              throw new BadRequestException(
                `Invalid value for ${field} with operator ${operator}`,
              );
            }

            result = LIST_OP_HANDLERS[operator]({
              fieldName,
              paramName,
              value,
            });
          } else {
            throw new BadRequestException(`Unknown operator: ${operator}`);
          }

          qb.andWhere(
            result.command,
            result.paramValue !== undefined
              ? { [paramName]: result.paramValue }
              : {},
          );
        }
      }
    } catch (err) {
      if (err instanceof TypeORMError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  private hasSoftDelete(qb: SelectQueryBuilder<any>, alias: string): boolean {
    const meta = qb.expressionMap.aliases.find(
      (a) => a.name === alias,
    )?.metadata;
    return !!meta?.deleteDateColumn;
  }

  /* ---------- Relation & Sort ---------- */
  addRelation(
    qb: SelectQueryBuilder<T>,
    relations?: FindOptions<T>["relations"],
    parentAlias?: string,
  ) {
    if (!relations) return;

    const currentAlias = parentAlias ?? qb.alias;

    if (Array.isArray(relations)) {
      relations.forEach((relation) => {
        const path = `${currentAlias}.${String(relation)}`;
        const alias = String(relation);

        qb.leftJoinAndSelect(path, alias);

        if (this.hasSoftDelete(qb, alias)) {
          qb.andWhere(`${alias}.${this.getColumnName("deletedAt")} IS NULL`);
        }
      });
      return;
    }

    Object.entries(relations).forEach(([relation, config]: [string, any]) => {
      if (!config) return;

      const path = `${currentAlias}.${relation}`;
      const alias = relation;

      if (config.join === "left") {
        qb.leftJoinAndSelect(path, alias);
      } else {
        qb.innerJoinAndSelect(path, alias);
      }

      this.applySoftDeleteFilter(qb, alias, config);

      if (config.relations) {
        this.addRelation(qb, config.relations as any, alias);
      }
    });
  }

  /**
   * Applies soft-delete filtering to a query builder based on given options.
   */
  applySoftDeleteFilter(
    qb: SelectQueryBuilder<T>,
    alias: string,
    options?: FindOptions<T>,
  ) {
    // Check if the entity supports soft-delete
    if (!this.hasSoftDelete(qb, alias)) return;

    // Only return deleted (in recycle bin) items
    if (options?.onlyDeleted) {
      qb.where(`${alias}.${this.getColumnName("deletedAt")} IS NOT NULL`);
    }
    // Only return active (not deleted) items
    else if (!options?.withDeleted) {
      qb.where(`${alias}.${this.getColumnName("deletedAt")} IS NULL`);
    }
    // If withDeleted is true, return all (both deleted and active), no filter needed
  }

  addSort(qb: SelectQueryBuilder<T>, sort?: FindSort[]) {
    if (!sort?.length) return;

    sort.forEach(({ field, order }) => {
      this.assertColumn(field);
      qb.addOrderBy(
        `${qb.alias}.${field}`,
        order.toUpperCase() as "ASC" | "DESC",
      );
    });
  }

  /**
   * Get the actual database column name for an entity property
   */
  getColumnName(propertyName: string): string {
    const column = this.metadata.findColumnWithPropertyName(propertyName);
    if (!column) {
      throw new Error(
        `Column "${propertyName}" not found in table ${this.tableName}`,
      );
    }
    return column.databaseName;
  }

  /* ---------- Utils ---------- */

  private assertColumn(field: string) {
    if (!this.columnSet.has(field)) {
      throw new BadRequestException(`Invalid field: ${field}`);
    }
  }

  private isPrimitive(value: unknown) {
    return (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value instanceof Date ||
      value === null
    );
  }

  private isSingleValueOperator(op: string): op is SingleValueOperator {
    return op in SINGLE_OP_HANDLERS;
  }

  private isListOperator(op: string): op is ListOperator {
    return op in LIST_OP_HANDLERS;
  }
}
