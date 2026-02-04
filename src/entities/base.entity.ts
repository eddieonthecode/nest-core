import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export class BaseEntity {
  @PrimaryGeneratedColumn('uuid') // Primary key
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ nullable: true, length: 36 })
  createdBy?: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ nullable: true, length: 36 })
  updatedBy?: string;
}

export class BaseEntitySoftDelete extends BaseEntity {
  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date;

  @Column({ nullable: true, length: 36 })
  deletedBy?: string;
}
