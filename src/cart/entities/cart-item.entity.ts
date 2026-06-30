import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Cart } from "./cart.entity";
import { Product } from "../../product/entities/product.entity";

@Entity('cart_items')
export class CartItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: 1 })
    quantity: number;

    // Optional: Lưu giá tại thời điểm thêm vào giỏ hàng
    // Nếu để trống, sẽ lấy giá từ bảng Product
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    priceAtAdded: number;

    @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
    cart: Cart;

    @ManyToOne(() => Product, (product) => product.cartItems, { onDelete: 'CASCADE' })
    product: Product;
}
