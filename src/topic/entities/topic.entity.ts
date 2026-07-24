import { Column, Entity, PrimaryGeneratedColumn, ManyToMany } from "typeorm";
import { Blog } from "src/blog/entities/blog.entity";

@Entity('topics')
export class Topic {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: '' })
    topic: string;

    @Column({ unique: true })
    topicCode: string;

    @Column({ nullable: true })
    description: string;

    @ManyToMany(() => Blog, blog => blog.topics)
    blogs: Blog[];
}
