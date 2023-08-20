import {Column, Entity, ObjectIdColumn, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: string

    @Column({ unique: true })
    admin_id: string

    @Column()
    title: string

    @Column()
    image: string

    @Column({ default: 0 })
    like: number

}
