import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { DigitalProduct } from '../../digital-product/entities/digital-product.entity';
import { DigitalTemplate } from '../../digital-template/entities/digital-template.entity';

export enum InvitationStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('paid_digital_invitations')
export class PaidDigitalInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  inviteCode: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  digitalProductId: string;

  @ManyToOne(() => DigitalProduct, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'digitalProductId' })
  digitalProduct: DigitalProduct;

  @Column({ nullable: true })
  templateId: string;

  @ManyToOne(() => DigitalTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template: DigitalTemplate;

  @Column({ type: 'jsonb' })
  coupleData: {
    groomName: string;
    brideName: string;
    dayOfWeek?: string;
    eventDate: string;
    eventMonth: string;
    eventYear: string;
    eventTime: string;
    location: string;
    musicUrl?: string;
    customNote?: string;
  };

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.ACTIVE,
  })
  status: InvitationStatus;

  @Column({ default: 0 })
  viewsCount: number;

  @CreateDateColumn()
  activatedAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
