import { Category } from "src/category/entities/category.entity";
import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { CartItem } from "src/cart/entities/cart-item.entity";

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: '' })
    product: string;

    @Column({ unique: true })
    productCode: string;

    @Column()
    description: string;

    @Column()
    tags: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ type: 'jsonb', nullable: true })
    images: { url: string, isCover: boolean }[];

    @Column({ nullable: true })
    printingTechnique: string;

    @Column({ nullable: true })
    paperStock: string;

    @Column({ nullable: true })
    dimensions: string;

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
    @JoinTable({ name: 'product_categories' }) // Chỉ cần JoinTable ở 1 bên (thường là bên Product)
    categories: Category[];

    @OneToMany(() => CartItem, (cartItem) => cartItem.product)
    cartItems: CartItem[];

}
