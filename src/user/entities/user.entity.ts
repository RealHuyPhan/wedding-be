import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import * as bcrypt from 'bcrypt';
import { Cart } from "../../cart/entities/cart.entity";
import { Order } from "../../order/entities/order.entity";
import { Favorite } from "../../favorite/entities/favorite.entity";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    password: string;

    @Column({ unique: true, nullable: true })
    phone: string;

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    shippingDestinationId: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    unit: string;

    @Column({ nullable: true })
    postcode: string;

    @Column({ default: 'user' })
    role: string;

    @Column({ default: 'local' })
    provider: string;

    @Column({ nullable: true })
    birthday: Date;

    @Column({ nullable: true })
    gender: string;

    @OneToOne(() => Cart, (cart) => cart.user)
    cart: Cart;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    @OneToMany(() => Order, (order: Order) => order.user)
    orders: Order[];

    @OneToMany(() => Favorite, (favorite) => favorite.user)
    favorites: Favorite[];

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.password && !this.password.startsWith('$2b$')) {
            const saltRounds = 10;
            this.password = await bcrypt.hash(this.password, saltRounds);
        }
    }
}
