import { Category } from "src/category/entities/category.entity";
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    label: string;

    @Column()
    value: string;

    @Column()
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ nullable: true })
    image: string;


    @Column({ default: false })
    isHotItem: boolean;

    @Column({ default: false })
    isDiscountItem: boolean;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    discountPrice: number;

    @Column({ nullable: true })
    discountPercent: number;

    @Column({ nullable: true })
    discountStartDate: Date;

    @Column({ nullable: true })
    discountEndDate: Date;

    @ManyToMany(() => Category, (category) => category.products)
    @JoinTable() // Chỉ cần JoinTable ở 1 bên (thường là bên Product)
    categories: Category[];


}
