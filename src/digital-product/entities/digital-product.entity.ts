import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { DigitalCategory } from "../../digital-category/entities/digital-category.entity";
import { DigitalTemplate } from "../../digital-template/entities/digital-template.entity";

@Entity('digital_products')
export class DigitalProduct {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: '' })
    product: string;

    @Column({ unique: true })
    productCode: string;

    @Column({ default: '' })
    description: string;

    @Column({ default: '' })
    tags: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ type: 'jsonb', nullable: true })
    images: { url: string; isCover: boolean }[];

    @Column({ nullable: true })
    previewUrl: string;

    @Column({ nullable: true })
    templateId: string;

    @ManyToOne(() => DigitalTemplate, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'templateId' })
    template: DigitalTemplate;

    @Column({ nullable: true })
    musicUrl: string;

    @Column({ default: false })
    isHotItem: boolean;

    @ManyToMany(() => DigitalCategory, (category) => category.digitalProducts)
    @JoinTable({ name: 'digital_product_categories' })
    categories: DigitalCategory[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
