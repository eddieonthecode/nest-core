import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { isUUID } from "class-validator";
import { randomUUID } from "crypto";
import { paginateRaw } from "nestjs-typeorm-paginate";
import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  Repository,
  TreeRepository,
} from "typeorm";
import { QueryBuilderHelper, QueryValidationHooks } from "../helpers";
import { RequestContext } from "../interceptors";
import {
  BulkSoftMutationResult,
  FindByIdOptions,
  FindOptions,
  FindRequest,
  ObjectFilter,
  PaginationRequest,
  PaginationResponse,
  SoftMutationResult,
  SoftMutationStatus,
} from "../models";
import { BaseEntity, BaseEntitySoftDelete } from "./base.entity";

@Injectable()
export class EntityStore<T extends BaseEntity> {
  protected readonly repository: Repository<T>;
  protected readonly treeRepository: TreeRepository<T>;
  protected readonly qbHelper: QueryBuilderHelper<T>;

  constructor(
    private dataSource: DataSource,
    private entity: EntityTarget<T>,
    private hooks?: QueryValidationHooks,
  ) {
    this.repository = this.dataSource.getRepository(this.entity);
    this.treeRepository = this.dataSource.getTreeRepository(this.entity);

    this.qbHelper = new QueryBuilderHelper<T>(dataSource, entity, hooks);
  }

  //#region Utility Methods
  /**
   * Generate id
   */
  generateId() {
    return randomUUID();
  }

  /**
   * Create model instance
   */
  createModel(data: DeepPartial<T>): T {
    return this.repository.create(data);
  }

  /**
   * Merge model
   */
  mergeModel(target: T, source: DeepPartial<T>): T {
    return this.repository.merge(target, source);
  }

  /**
   * Start transaction
   */
  async transaction<R>(
    runInTransaction: (manager: EntityManager) => Promise<R>,
  ): Promise<R> {
    return await this.dataSource.transaction(async (manager) => {
      return await runInTransaction(manager);
    });
  }

  /**
   * Get repository
   * @param manager entity manager
   * @returns repository for the entity
   */
  getRepository(manager?: EntityManager): Repository<T> {
    if (manager) {
      return manager.getRepository(this.entity);
    }

    return this.repository;
  }

  /**
   * Get query builder
   */
  protected getQueryBuilder(manager?: EntityManager) {
    return this.getRepository(manager).createQueryBuilder(
      this.qbHelper.tableName,
    );
  }

  /**
   * Build search query
   */
  buildSearchQuery(field: string, valuePlaceholder: string, useAccent = false) {
    return this.qbHelper.buildSearchQuery(field, valuePlaceholder, useAccent);
  }

  /**
   * Map to dto
   */
  mapToDto<TDto>(entity: T, dtoClass?: new () => TDto): TDto | T;
  mapToDto<TDto>(entities: T[], dtoClass?: new () => TDto): TDto[] | T[];
  mapToDto<TDto>(
    input: T | T[],
    dtoClass?: new () => TDto,
  ): TDto | TDto[] | T | T[] {
    if (!dtoClass) return input;

    return plainToInstance(dtoClass, input, { excludeExtraneousValues: true });
  }

  /**
   * Map pagination to dto
   */
  mapPaginationToDto<TDto>(
    pagination: PaginationResponse<T>,
    dtoClass: new () => TDto,
  ): PaginationResponse<TDto> {
    const mappedItems = plainToInstance(dtoClass, pagination.items, {
      excludeExtraneousValues: true,
    });

    return {
      items: mappedItems,
      meta: pagination.meta,
    };
  }
  //#endregion

  //#region Find Methods
  /**
   * Find by
   */
  async findBy(req: FindRequest<T>, options?: FindOptions<T>): Promise<T[]> {
    const qb = this.qbHelper.buildBaseQuery(
      this.getQueryBuilder(options?.manager),
      req,
      options,
    );

    return await qb.getMany();
  }

  /**
   * Search
   */
  async search(
    req: PaginationRequest<T>,
    options?: FindOptions<T>,
  ): Promise<PaginationResponse<T>> {
    // First, get paginated ids
    const qb = this.getQueryBuilder(options?.manager);
    qb.select(`${qb.alias}.${this.qbHelper.getColumnName("id")}`, "id");
    const selectIdQb = this.qbHelper.buildBaseQuery(qb, req, options);

    const paginatedIds = await paginateRaw(selectIdQb, {
      limit: req.limit,
      page: req.page,
      countQueries: req.countQueries ?? false,
    });

    const ids = paginatedIds.items.map((row) => row.id);

    if (!ids.length) return { ...paginatedIds, items: [] };

    //  Then, get full entities by ids
    const fullQb = this.qbHelper.buildBaseQuery(
      this.getQueryBuilder(options?.manager),
      {
        filter: { id: { in: ids } } as ObjectFilter<T>,
      },
      options,
    );

    this.qbHelper.addRelation(fullQb, options?.relations);

    const entities = await fullQb.getMany();
    // Restore original order because WHERE IN does not guarantee result ordering
    const entityMap = new Map(entities.map((e) => [e.id, e]));
    // Ensure to filter out any missing entities (in case of soft-deleted items, item deleted between queries, etc)
    const sortedEntities = ids.map((id) => entityMap.get(id)).filter(Boolean);

    return { ...paginatedIds, items: sortedEntities };
  }

  /**
   * Search tree
   */
  async searchTree(): Promise<T[]> {
    return await this.treeRepository.findTrees();
  }

  /**
   * Find by id
   */
  async findById(id: string, options?: FindByIdOptions<T>): Promise<T | null> {
    if (!isUUID(id)) {
      return null;
    }

    const data = await this.findOneBy(
      {
        filter: {
          id: {
            eq: id as any,
          },
        },
      },
      options,
    );

    if (!data && options?.throwNotFound) {
      throw new NotFoundException();
    }

    return data;
  }

  /**
   * Find by ids
   */
  async findByIds(ids: string[], options?: FindOptions<T>): Promise<T[]> {
    if (!ids.every((id) => isUUID(id))) {
      throw new BadRequestException(`Ids must be a UUID array`);
    }

    const data = await this.findBy(
      {
        filter: {
          id: {
            in: ids,
          },
        } as ObjectFilter<T>,
      },
      options,
    );

    return data;
  }

  /**
   * Find one by
   */
  async findOneBy(req: FindRequest<T>, options?: FindOptions<T>): Promise<T> {
    const qb = this.qbHelper.buildBaseQuery(
      this.getQueryBuilder(options?.manager),
      req,
      options,
    );

    this.qbHelper.addRelation(qb, options?.relations);

    return await qb.getOne();
  }
  //#endregion

  //#region Save Methods
  /**
   * Create
   */
  async create(
    data: DeepPartial<T>,
    options?: { manager?: EntityManager },
  ): Promise<T> {
    const repo = this.getRepository(options?.manager);
    const entity = repo.create(data);

    return await repo.save(entity);
  }

  /**
   * Update
   */
  async update(
    id: string,
    data: DeepPartial<T>,
    options?: FindByIdOptions<T>,
  ): Promise<T | null> {
    const repo = this.getRepository(options?.manager);
    const existingData = await this.findById(id, {
      ...(options ?? {}),
      withDeleted: true,
    });

    if (!existingData) {
      return null;
    }

    repo.merge(existingData, data);

    return await repo.save(existingData);
  }

  /**
   * Save one or many entities, only accept full entities
   */
  async save(data: T, options?: { manager?: EntityManager }): Promise<T>;
  async save(data: T[], options?: { manager?: EntityManager }): Promise<T[]>;
  async save(
    data: T | T[],
    options?: { manager?: EntityManager },
  ): Promise<T | T[]> {
    const repo = this.getRepository(options?.manager);
    return repo.save(data as any);
  }

  /**
   * Delete by id
   */
  async deleteById(
    id: string,
    options?: FindByIdOptions<T>,
  ): Promise<T | null> {
    const repo = this.getRepository(options?.manager);
    const deletedData = await this.findById(id, {
      ...(options ?? {}),
      withDeleted: true,
    });

    if (!deletedData) {
      return null;
    }

    await repo.delete(id);

    return deletedData;
  }

  /**
   * Bulk delete by ids
   */
  async bulkDelete(ids: string[], options?: FindOptions<T>): Promise<T[]> {
    const deletedData = await this.findByIds(ids, {
      ...(options ?? {}),
      withDeleted: true,
    });

    if (deletedData.length === 0) {
      return [];
    }

    const repo = this.getRepository(options?.manager);

    await repo.delete(ids);
    return deletedData;
  }

  /**
   * Delete by
   */
  async deleteBy(
    req: FindRequest<T>,
    options?: { manager?: EntityManager },
  ): Promise<T[]> {
    const deletedData = await this.findBy(req, options);

    if (deletedData.length === 0) {
      return [];
    }

    const repo = this.getRepository(options?.manager);

    await repo.delete(deletedData.map((item) => item.id));

    return deletedData;
  }

  /**
   * Remove one or many entities, only accept full entities
   */
  async remove(data: T, options?: { manager?: EntityManager }): Promise<T>;
  async remove(data: T[], options?: { manager?: EntityManager }): Promise<T[]>;
  async remove(
    data: T | T[],
    options?: { manager?: EntityManager },
  ): Promise<T | T[]> {
    const repo = this.getRepository(options?.manager);
    return repo.remove(data as any);
  }
  //#endregion
}

//#region Soft Delete
export class EntityStoreSoftDelete<
  T extends BaseEntitySoftDelete,
> extends EntityStore<T> {
  constructor(dataSource: DataSource, entity: EntityTarget<T>) {
    super(dataSource, entity);
  }

  /**
   * Soft delete by id
   */
  async softDeleteById(
    id: string,
    options?: FindByIdOptions<T>,
  ): Promise<SoftMutationResult<T>> {
    const entity = await this.findById(id, {
      ...(options ?? {}),
      withDeleted: true,
    });

    if (!entity) {
      return { status: SoftMutationStatus.NOT_FOUND };
    }

    if (entity.deletedAt) {
      return { status: SoftMutationStatus.NO_OP, entity };
    }

    await this.softAuditAction([id], "softDelete", options?.manager);

    return { status: SoftMutationStatus.SUCCESS, entity };
  }

  /**
   * Bulk soft delete by ids
   */
  async bulkSoftDelete(
    ids: string[],
    options?: FindOptions<T>,
  ): Promise<BulkSoftMutationResult<T>> {
    const entities = await this.findByIds(ids, {
      ...(options ?? {}),
      withDeleted: true,
    });

    const success: T[] = [];
    const noOp: T[] = [];
    const foundIds = new Set(entities.map((e) => e.id));

    for (const entity of entities) {
      if (entity.deletedAt) noOp.push(entity);
      else success.push(entity);
    }

    await this.softAuditAction(
      success.map((s) => s.id),
      "softDelete",
      options?.manager,
    );

    return {
      total: ids.length,
      success,
      noOp,
      notFound: ids.filter((id) => !foundIds.has(id)),
    };
  }

  /**
   * Soft delete by filter
   */
  async softDeleteBy(
    req: FindRequest<T>,
    options?: FindOptions<T>,
  ): Promise<BulkSoftMutationResult<T>> {
    const entities = await this.findBy(req, {
      ...(options ?? {}),
      withDeleted: true,
    });

    const success: T[] = [];
    const noOp: T[] = [];

    for (const entity of entities) {
      if (entity.deletedAt) noOp.push(entity);
      else success.push(entity);
    }

    await this.softAuditAction(
      success.map((s) => s.id),
      "softDelete",
      options?.manager,
    );

    return {
      total: entities.length,
      success,
      noOp,
      notFound: [],
    };
  }

  /**
   * Recover by id
   */
  async recoverById(
    id: string,
    options?: FindByIdOptions<T>,
  ): Promise<SoftMutationResult<T>> {
    const entity = await this.findById(id, {
      ...(options ?? {}),
      withDeleted: true,
    });

    if (!entity) {
      return { status: SoftMutationStatus.NOT_FOUND };
    }

    if (!entity.deletedAt) {
      return { status: SoftMutationStatus.NO_OP, entity };
    }

    await this.softAuditAction([id], "recover", options?.manager);

    return { status: SoftMutationStatus.SUCCESS, entity };
  }

  /**
   * Bulk recover by ids
   */
  async bulkRecover(
    ids: string[],
    options?: FindOptions<T>,
  ): Promise<BulkSoftMutationResult<T>> {
    const entities = await this.findByIds(ids, {
      ...(options ?? {}),
      withDeleted: true,
    });

    const success: T[] = [];
    const noOp: T[] = [];
    const foundIds = new Set(entities.map((e) => e.id));

    for (const entity of entities) {
      if (!entity.deletedAt) noOp.push(entity);
      else success.push(entity);
    }

    await this.softAuditAction(
      success.map((s) => s.id),
      "recover",
      options?.manager,
    );
    return {
      total: ids.length,
      success,
      noOp,
      notFound: ids.filter((id) => !foundIds.has(id)),
    };
  }

  /**
   * Recover by filter
   */
  async recoverBy(
    req: FindRequest<T>,
    options?: { manager?: EntityManager },
  ): Promise<BulkSoftMutationResult<T>> {
    const entities = await this.findBy(req, {
      ...(options ?? {}),
      withDeleted: true,
    });

    const success: T[] = [];
    const noOp: T[] = [];

    for (const entity of entities) {
      if (!entity.deletedAt) noOp.push(entity);
      else success.push(entity);
    }

    await this.softAuditAction(
      success.map((s) => s.id),
      "recover",
      options?.manager,
    );

    return {
      total: entities.length,
      success,
      noOp,
      notFound: [],
    };
  }

  private async softAuditAction(
    ids: string[],
    action: "softDelete" | "recover",
    manager?: EntityManager,
  ) {
    if (!ids.length) return;

    const now = new Date();
    const currentUserId = RequestContext.userId;

    const updateData =
      action === "softDelete"
        ? { deletedAt: now, deletedBy: currentUserId }
        : { deletedAt: null, deletedBy: null, updatedBy: currentUserId };

    const qb = this.getQueryBuilder(manager)
      .update()
      .set(updateData as any)
      .where(`${this.qbHelper.getColumnName("id")} IN (:...ids)`, { ids });

    // optional: for softDelete, only update entities not deleted yet
    if (action === "softDelete") {
      qb.andWhere(`${this.qbHelper.getColumnName("deletedAt")} IS NULL`);
    }

    await qb.execute();
  }
}
//#endregion
