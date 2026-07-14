import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
    PENDING_PAYMENT = 'PENDING_PAYMENT',
    PROCESSING = 'PROCESSING',
    SHIPPING = 'SHIPPING',
    DELIVERED = 'DELIVERED',
    COMPLETED = 'COMPLETED',
}

export enum PaymentMethod {
    MOMO = 'MOMO',
    CREDIT_CARD = 'CREDIT_CARD',
    VIA_SOCIAL_MEDIA = 'VIA_SOCIAL_MEDIA',
}

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 1. LIÊN KẾT VỚI NGƯỜI DÙNG
    @ManyToOne(() => User, (user) => user.orders, { onDelete: 'SET NULL' })
    user: User;

    // 2. THÔNG TIN GIAO HÀNG (Có thể khác với thông tin mặc định của User)
    @Column()
    shippingName: string;

    @Column()
    shippingPhone: string;

    @Column()
    shippingAddress: string;

    @Column()
    shippingCountry: string;

    @Column({ nullable: true })
    shippingProvince: string;

    @Column({ nullable: true })
    shippingCity: string;

    @Column({ nullable: true })
    shippingPostcode: string;

    @Column({ nullable: true })
    shippingUnit: string;

    // 3. THÔNG TIN THANH TOÁN & TRẠNG THÁI
    @Column({ type: 'decimal', precision: 12, scale: 2 })
    subTotal: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    shippingFee: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    totalAmount: number;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING_PAYMENT,
    })
    status: OrderStatus;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.CREDIT_CARD,
    })
    paymentMethod: PaymentMethod;

    // 4. LIÊN KẾT VỚI CHI TIẾT ĐƠN HÀNG (Order Items)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    @OneToMany(() => OrderItem, (orderItem: OrderItem) => orderItem.order, { cascade: true })
    items: OrderItem[];

    // 5. TIMESTAMPS
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
