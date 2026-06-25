import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import * as bcrypt from 'bcrypt';

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

    @Column({ default: 'user' })
    role: string;

    @Column({ nullable: true })
    birthday: Date;

    @Column({ nullable: true })
    gender: string;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.password && !this.password.startsWith('$2b$')) {
            const saltRounds = 10;
            this.password = await bcrypt.hash(this.password, saltRounds);
        }
    }
}
