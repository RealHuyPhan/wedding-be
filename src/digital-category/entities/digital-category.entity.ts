import { Column, Entity, ManyToMany, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { DigitalProduct } from "../../digital-product/entities/digital-product.entity";

@Entity('digital_categories')
export class DigitalCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: '' })
    category: string;

    @Column({ unique: true })
    categoryCode: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    image: string;

    @ManyToMany(() => DigitalProduct, (product) => product.categories)
    digitalProducts: DigitalProduct[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
