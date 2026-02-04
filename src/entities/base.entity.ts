import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Base entity class that provides common fields for all entities.
 * Extend this class to automatically get UUID primary key, timestamps, and audit fields.
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User extends BaseEntity {
 *   @Column()
 *   name: string;
 * }
 * ```
 */
export class BaseEntity {
  /** UUID primary key for the entity */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Timestamp when the entity was created */
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  /** ID of the user who created this entity (optional) */
  @Column({ nullable: true, length: 36 })
  createdBy?: string;

  /** Timestamp when the entity was last updated */
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  /** ID of the user who last updated this entity (optional) */
  @Column({ nullable: true, length: 36 })
  updatedBy?: string;
}

/**
 * Base entity class with soft delete functionality.
 * Extends BaseEntity to add soft delete fields for entities that support deletion recovery.
 *
 * @example
 * ```typescript
 * @Entity('posts')
 * export class Post extends BaseEntitySoftDelete {
 *   @Column()
 *   title: string;
 * }
 * ```
 */
export class BaseEntitySoftDelete extends BaseEntity {
  /** Timestamp when the entity was soft deleted (null if not deleted) */
  @DeleteDateColumn({ type: "timestamptz" })
  deletedAt?: Date;

  /** ID of the user who soft deleted this entity (optional) */
  @Column({ nullable: true, length: 36 })
  deletedBy?: string;
}
