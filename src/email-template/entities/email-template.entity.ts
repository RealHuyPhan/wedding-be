import { Column, Entity, PrimaryGeneratedColumn, } from "typeorm";

export enum EmailTemplateCode {
    // Đặt hàng & Hủy
    ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
    NEW_ORDER_ALERT = 'NEW_ORDER_ALERT',
    FRAUD_CANCELLATION = 'FRAUD_CANCELLATION',

    // Trạng thái đơn hàng
    STATUS_PROCESSING = 'STATUS_PROCESSING',
    STATUS_SHIPPING = 'STATUS_SHIPPING',
    STATUS_DELIVERED = 'STATUS_DELIVERED',
    STATUS_COMPLETED = 'STATUS_COMPLETED',

    // (Dự phòng cho tương lai: Quên mật khẩu, Xác thực email...)
    RESET_PASSWORD = 'RESET_PASSWORD',
    WELCOME_USER = 'WELCOME_USER'
}


@Entity('email_templates')
export class EmailTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: EmailTemplateCode,
        unique: true
    })
    code: string;

    @Column({ default: "" })
    name: string

    @Column({ default: '' })
    subject: string

    @Column({ type: 'text', default: '' })
    contentHtml: string

    // @Column({ type: 'json', default: '{}' })
    // availableVariables: string
}
