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
import { Order } from '../../order/entities/order.entity';

@Entity('wedding_invitations')
export class WeddingInvitation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.weddingInvitations, { onDelete: 'CASCADE' })
    user: User;

    @OneToMany(() => Order, (order) => order.weddingInvitation)
    orders: Order[];

    @Column({ nullable: true })
    brideName: string;

    @Column({ nullable: true })
    groomName: string;

    @Column({ nullable: true })
    dayOfWeek: string;

    @Column({ nullable: true })
    eventDate: string;

    @Column({ nullable: true })
    eventMonth: string;

    @Column({ nullable: true })
    eventYear: string;

    @Column({ nullable: true })
    eventTime: string;

    @Column({ nullable: true })
    location: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
