import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from "typeorm";
import { Topic } from "src/topic/entities/topic.entity";

@Entity('blogs')
export class Blog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: '' })
    title: string;

    @Column({ unique: true })
    slug: string;

    @Column({ default: "" })
    description: string;

    @Column({ type: 'text' })
    contentHtml: string;

    @Column({ nullable: true })
    thumbnail: string;

    @ManyToMany(() => Topic, topic => topic.blogs, { eager: true })
    @JoinTable({ name: 'blog_topics' })
    topics: Topic[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
