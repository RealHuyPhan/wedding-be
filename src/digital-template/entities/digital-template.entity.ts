import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('digital_templates')
export class DigitalTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({ type: 'text', default: '' })
  htmlContent: string;

  @Column({ type: 'text', default: '' })
  cssContent: string;

  @Column({ type: 'text', default: '' })
  jsContent: string;

  @Column({ nullable: true })
  defaultMusicUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
