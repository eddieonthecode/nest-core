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

/**
 * Enhanced repository wrapper providing advanced CRUD operations with built-in
 * support for search, pagination, soft deletes, transactions, and DTO mapping.
 *
 * This class extends basic TypeORM repository functionality with:
 * - Advanced search and filtering capabilities
 * - Optimized pagination queries
 * - Transaction management
 * - Automatic DTO mapping
 * - Query building helpers
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectEntityStore(User)
 *     private userStore: EntityStore<User>
 *   ) {}
 *
 *   async searchUsers(req: PaginationRequest<User>) {
 *     return await this.userStore.search(req);
 *   }
 * }
 * ```
 */
@Injectable()
export class EntityStore<T extends BaseEntity> {
  protected readonly repository: Repository<T>;
  protected readonly treeRepository: TreeRepository<T>;
  protected readonly qbHelper: QueryBuilderHelper<T>;

  /**
   * Creates a new EntityStore instance.
   *
   * @param dataSource - TypeORM data source
   * @param entity - Target entity class
   * @param hooks - Optional query validation hooks
   */
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
   * Generates a random UUID for entity IDs.
   *
   * @returns string - Random UUID v4
   */
  generateId() {
    return randomUUID();
  }

  /**
   * Creates a new entity instance with the provided data.
   *
   * @param data - Partial entity data
   * @returns T - New entity instance
   */
  createModel(data: DeepPartial<T>): T {
    return this.repository.create(data);
  }

  /**
   * Merges source data into target entity.
   *
   * @param target - Target entity to merge into
   * @param source - Source data to merge from
   * @returns T - Merged entity
   */
  mergeModel(target: T, source: DeepPartial<T>): T {
    return this.repository.merge(target, source);
  }

  /**
   * Executes operations within a database transaction.
   *
   * @param runInTransaction - Function to run within transaction context
   * @returns Promise<R> - Result of the transaction
   *
   * @example
   * ```typescript
   * await this.userStore.transaction(async (manager) => {
   *   const user = await this.userStore.getRepository(manager).save(userData);
   *   await this.userStore.getRepository(manager).save(profileData);
   * });
   * ```
   */
  async transaction<R>(
    runInTransaction: (manager: EntityManager) => Promise<R>,
  ): Promise<R> {
    return await this.dataSource.transaction(async (manager) => {
      return await runInTransaction(manager);
    });
  }

  /**
   * Gets the repository for this entity, optionally with a specific entity manager.
   *
   * @param manager - Optional entity manager for transactions
   * @returns Repository<T> - Entity repository
   */
  getRepository(manager?: EntityManager): Repository<T> {
    if (manager) {
      return manager.getRepository(this.entity);
    }

    return this.repository;
  }

  /**
   * Creates a query builder for the entity.
   *
   * @param manager - Optional entity manager for transactions
   * @returns SelectQueryBuilder<T> - Query builder instance
   */
  protected getQueryBuilder(manager?: EntityManager) {
    return this.getRepository(manager).createQueryBuilder(
      this.qbHelper.tableName,
    );
  }

  /**
   * Builds a search query for text search functionality.
   *
   * @param field - Database field to search in
   * @param valuePlaceholder - Placeholder for the search value
   * @param useAccent - Whether to use accent-insensitive search
   * @returns string - SQL search query fragment
   */
  buildSearchQuery(field: string, valuePlaceholder: string, useAccent = false) {
    return this.qbHelper.buildSearchQuery(field, valuePlaceholder, useAccent);
  }

  /**
   * Maps entity or entities to DTO instances.
   *
   * @param entity - Single entity or array of entities
   * @param dtoClass - Target DTO class
   * @returns TDto | TDto[] | T | T[] - Mapped DTO(s) or original entities if no DTO class provided
   *
   * @example
   * ```typescript
   * const users = await this.userStore.findBy({});
   * const userDtos = this.userStore.mapToDto(users, UserDto);
   * ```
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
   * Maps pagination response to DTO instances.
   *
   * @param pagination - Pagination response with entities
   * @param dtoClass - Target DTO class
   * @returns PaginationResponse<TDto> - Pagination response with DTOs
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
   * Finds entities matching the provided search criteria.
   *
   * @param req - Find request with search, filter, and sort criteria
   * @param options - Optional find options including relations and manager
   * @returns Promise<T[]> - Array of matching entities
   *
   * @example
   * ```typescript
   * // Find active users
   * const users = await this.userStore.findBy({
   *   filter: { status: { eq: 'active' } }
   * });
   *
   * // Find with text search
   * const users = await this.userStore.findBy({
   *   search: { text: 'john', fields: ['name', 'email'] }
   * });
   * ```
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
   * Performs paginated search with optimized two-step query process.
   *
   * This method uses a two-step approach for better performance:
   * 1. First query gets only IDs with pagination
   * 2. Second query gets full entities with relations
   *
   * @param req - Pagination request with search criteria and pagination info
   * @param options - Optional find options including relations and manager
   * @returns Promise<PaginationResponse<T>> - Paginated results with metadata
   *
   * @example
   * ```typescript
   * // Search users with pagination
   * const result = await this.userStore.search({
   *   page: 1,
   *   limit: 10,
   *   filter: { status: { eq: 'active' } },
   *   sort: [{ field: 'createdAt', order: 'DESC' }]
   * });
   *
   * // Returns: { items: User[], meta: { totalItems, currentPage, ... } }
   * ```
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
   * Searches for tree-structured entities using TypeORM's tree repository.
   *
   * @returns Promise<T[]> - Array of tree entities with parent-child relationships
   *
   * @example
   * ```typescript
   * // For entities with tree structure (categories, menus, etc.)
   * const categories = await this.categoryStore.searchTree();
   * // Returns nested tree structure with parent-child relationships
   * ```
   */
  async searchTree(): Promise<T[]> {
    return await this.treeRepository.findTrees();
  }

  /**
   * Finds an entity by its UUID primary key.
   *
   * @param id - UUID of the entity to find
   * @param options - Optional find options including error handling and deleted entities
   * @returns Promise<T | null> - Found entity or null if not found
   *
   * @example
   * ```typescript
   * // Find user by ID
   * const user = await this.userStore.findById('123e4567-e89b-12d3-a456-426614174000');
   *
   * // Find and throw if not found
   * const user = await this.userStore.findById(id, { throwNotFound: true });
   *
   * // Include soft-deleted entities
   * const user = await this.userStore.findById(id, { withDeleted: true });
   * ```
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
   * Finds multiple entities by their UUID primary keys.
   *
   * @param ids - Array of UUIDs to find
   * @param options - Optional find options including relations
   * @returns Promise<T[]> - Array of found entities
   * @throws BadRequestException if any ID is not a valid UUID
   *
   * @example
   * ```typescript
   * // Find multiple users by IDs
   * const users = await this.userStore.findByIds([
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   '123e4567-e89b-12d3-a456-426614174001'
   * ]);
   * ```
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
   * Finds a single entity matching the provided search criteria.
   *
   * @param req - Find request with search, filter, and sort criteria
   * @param options - Optional find options including relations and manager
   * @returns Promise<T> - First matching entity
   *
   * @example
   * ```typescript
   * // Find user by email
   * const user = await this.userStore.findOneBy({
   *   filter: { email: { eq: 'user@example.com' } }
   * });
   *
   * // Find with relations
   * const user = await this.userStore.findOneBy(
   *   { filter: { id: { eq: userId } } },
   *   { relations: ['profile', 'roles'] }
   * );
   * ```
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
   * Creates a new entity with the provided data.
   *
   * @param data - Partial entity data for creation
   * @param options - Optional entity manager for transactions
   * @returns Promise<T> - Created entity with generated ID and timestamps
   *
   * @example
   * ```typescript
   * // Create new user
   * const user = await this.userStore.create({
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   * ```
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
   * Updates an existing entity by its ID.
   *
   * @param id - UUID of the entity to update
   * @param data - Partial entity data for updates
   * @param options - Optional find options and entity manager
   * @returns Promise<T | null> - Updated entity or null if not found
   *
   * @example
   * ```typescript
   * // Update user
   * const updatedUser = await this.userStore.update(userId, {
   *   name: 'Jane Doe',
   *   email: 'jane@example.com'
   * });
   * ```
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
   * Saves one or more complete entities to the database.
   * This method expects full entity objects, not partial data.
   *
   * @param data - Single entity or array of entities to save
   * @param options - Optional entity manager for transactions
   * @returns Promise<T | T[]> - Saved entity/entities
   *
   * @example
   * ```typescript
   * // Save single entity
   * const savedUser = await this.userStore.save(userEntity);
   *
   * // Save multiple entities
   * const savedUsers = await this.userStore.save([user1, user2, user3]);
   * ```
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
   * Permanently deletes an entity by its UUID primary key.
   *
   * @param id - UUID of the entity to delete
   * @param options - Optional find options and entity manager
   * @returns Promise<T | null> - Deleted entity or null if not found
   *
   * @example
   * ```typescript
   * // Delete user permanently
   * const deletedUser = await this.userStore.deleteById(userId);
   * ```
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
   * Permanently deletes multiple entities by their UUID primary keys.
   *
   * @param ids - Array of UUIDs to delete
   * @param options - Optional find options and entity manager
   * @returns Promise<T[]> - Array of deleted entities
   *
   * @example
   * ```typescript
   * // Delete multiple users
   * const deletedUsers = await this.userStore.bulkDelete([
   *   'id1', 'id2', 'id3'
   * ]);
   * ```
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
   * Deletes entities matching the provided search criteria.
   *
   * @param req - Find request with search, filter, and sort criteria
   * @param options - Optional entity manager for transactions
   * @returns Promise<T[]> - Array of deleted entities
   *
   * @example
   * ```typescript
   * // Delete all inactive users
   * const deletedUsers = await this.userStore.deleteBy({
   *   filter: { status: { eq: 'inactive' } }
   * });
   * ```
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
   * Removes one or more complete entities from the database.
   * This method expects full entity objects and performs a hard delete.
   *
   * @param data - Single entity or array of entities to remove
   * @param options - Optional entity manager for transactions
   * @returns Promise<T | T[]> - Removed entity/entities
   *
   * @example
   * ```typescript
   * // Remove single entity
   * const removedUser = await this.userStore.remove(userEntity);
   *
   * // Remove multiple entities
   * const removedUsers = await this.userStore.remove([user1, user2]);
   * ```
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

/**
 * Enhanced EntityStore for entities that support soft delete functionality.
 * Extends EntityStore with additional methods for soft delete operations.
 *
 * This class provides:
 * - Soft delete and recovery operations
 * - Bulk soft delete operations
 * - Finding deleted entities
 * - Audit trail for soft delete actions
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PostService {
 *   constructor(
 *     @InjectEntityStore(Post)
 *     private postStore: EntityStoreSoftDelete<Post>
 *   ) {}
 *
 *   async softDeletePost(id: string) {
 *     return await this.postStore.softDeleteById(id);
 *   }
 * }
 * ```
 */
export class EntityStoreSoftDelete<
  T extends BaseEntitySoftDelete,
> extends EntityStore<T> {
  /**
   * Creates a new EntityStoreSoftDelete instance.
   *
   * @param dataSource - TypeORM data source
   * @param entity - Target soft-delete entity class
   */
  constructor(dataSource: DataSource, entity: EntityTarget<T>) {
    super(dataSource, entity);
  }

  /**
   * Soft deletes an entity by its UUID primary key.
   * Sets the deletedAt and deletedBy fields instead of removing the record.
   *
   * @param id - UUID of the entity to soft delete
   * @param options - Optional find options and entity manager
   * @returns Promise<SoftMutationResult<T>> - Result of the soft delete operation
   *
   * @example
   * ```typescript
   * // Soft delete a post
   * const result = await this.postStore.softDeleteById(postId);
   *
   * if (result.status === SoftMutationStatus.SUCCESS) {
   *   console.log('Post soft deleted:', result.entity);
   * } else if (result.status === SoftMutationStatus.NOT_FOUND) {
   *   console.log('Post not found');
   * }
   * ```
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
   * Performs bulk soft delete operations on multiple entities by their UUIDs.
   *
   * @param ids - Array of UUIDs to soft delete
   * @param options - Optional find options and entity manager
   * @returns Promise<BulkSoftMutationResult<T>> - Detailed result of the bulk operation
   *
   * @example
   * ```typescript
   * // Bulk soft delete multiple posts
   * const result = await this.postStore.bulkSoftDelete([
   *   'id1', 'id2', 'id3'
   * ]);
   *
   * console.log(`Successfully deleted: ${result.success.length}`);
   * console.log(`Already deleted: ${result.noOp.length}`);
   * console.log(`Not found: ${result.notFound.length}`);
   * ```
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
   * Soft deletes entities matching the provided filter criteria.
   *
   * @param req - Find request with search, filter, and sort criteria
   * @param options - Optional entity manager for transactions
   * @returns Promise<BulkSoftMutationResult<T>> - Detailed result of the operation
   *
   * @example
   * ```typescript
   * // Soft delete all inactive posts
   * const result = await this.postStore.softDeleteBy({
   *   filter: { status: { eq: 'inactive' } }
   * });
   * ```
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
   * Recovers a previously soft-deleted entity by its UUID primary key.
   * Clears the deletedAt and deletedBy fields to restore the entity.
   *
   * @param id - UUID of the entity to recover
   * @param options - Optional find options and entity manager
   * @returns Promise<SoftMutationResult<T>> - Result of the recovery operation
   *
   * @example
   * ```typescript
   * // Recover a soft-deleted post
   * const result = await this.postStore.recoverById(postId);
   *
   * if (result.status === SoftMutationStatus.SUCCESS) {
   *   console.log('Post recovered:', result.entity);
   * } else if (result.status === SoftMutationStatus.NOT_FOUND) {
   *   console.log('Post not found');
   * }
   * ```
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
   * Performs bulk recovery operations on multiple soft-deleted entities by their UUIDs.
   *
   * @param ids - Array of UUIDs to recover
   * @param options - Optional find options and entity manager
   * @returns Promise<BulkSoftMutationResult<T>> - Detailed result of the bulk operation
   *
   * @example
   * ```typescript
   * // Bulk recover multiple posts
   * const result = await this.postStore.bulkRecover([
   *   'id1', 'id2', 'id3'
   * ]);
   *
   * console.log(`Successfully recovered: ${result.success.length}`);
   * console.log(`Already active: ${result.noOp.length}`);
   * console.log(`Not found: ${result.notFound.length}`);
   * ```
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
   * Recovers entities matching the provided filter criteria.
   *
   * @param req - Find request with search, filter, and sort criteria
   * @param options - Optional entity manager for transactions
   * @returns Promise<BulkSoftMutationResult<T>> - Detailed result of the operation
   *
   * @example
   * ```typescript
   * // Recover all soft-deleted posts older than 30 days
   * const result = await this.postStore.recoverBy({
   *   filter: {
   *     deletedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
   *   }
   * });
   * ```
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

  /**
   * Performs audit actions for soft delete operations.
   * Updates the deletedAt, deletedBy, and updatedBy fields based on the action type.
   *
   * @param ids - Array of entity IDs to update
   * @param action - Type of action ('softDelete' or 'recover')
   * @param manager - Optional entity manager for transactions
   *
   * @private
   */
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
