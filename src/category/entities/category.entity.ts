import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "../../product/entities/product.entity";

@Entity('categories')
export class Category {
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

    @ManyToMany(() => Product, (product) => product.categories)
    products: Product[];


}
