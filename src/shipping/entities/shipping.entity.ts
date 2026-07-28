import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('shipping_destinations')
export class ShippingDestination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  country: string;

  @Column({ nullable: true })
  countryCode: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  provinceCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  shippingFee: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
