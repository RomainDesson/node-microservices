import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    title: string;

    @Column()
    image: string;

    @Column({ default: 0 })
    like: number;
}
