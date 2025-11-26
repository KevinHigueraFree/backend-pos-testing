import { Product } from "../../products/entities/product.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Transaction {

    @PrimaryGeneratedColumn()
    id: number

    @Column('decimal')
    total: number

    @Column({ type: 'varchar', length: 30, nullable: true })
    coupon: string

    @Column({ type: 'decimal', nullable: true, default : 0 })
    discount: number

    @Column({ default: () => "CURRENT_TIMESTAMP" })
    transactionDate: Date

    @OneToMany(() => TransactionContents, (transactionContents => transactionContents.transaction))
    contents: TransactionContents[]

}

@Entity()
export class TransactionContents {
    @PrimaryGeneratedColumn()
    id: number

    @Column('int')
    quantity: number

    @Column('decimal')
    price: number

    @ManyToOne(() => Product, (product) => product.id, { eager: true, cascade: true })
    product: Product

    @ManyToOne(() => Transaction, (transaction) => transaction.contents, { cascade: true })
    transaction: Transaction
}