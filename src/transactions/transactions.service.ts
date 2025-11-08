import { BadRequestException, Injectable, NotFoundException, Options } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction, TransactionContents } from './entities/transaction.entity';
import { Between, FindManyOptions, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { endOfDay, isValid, parseISO, startOfDay } from 'date-fns';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionContents) private readonly transactionContentsRepository: Repository<TransactionContents>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    private readonly couponService: CouponsService
  ) { }
  async create(createTransactionDto: CreateTransactionDto) {

    return await this.productRepository.manager.transaction(async (transactionEntityManager) => {


      const transaction = new Transaction()
      const total = createTransactionDto.contents.reduce((total, item) => total + (item.quantity * item.price), 0)

      transaction.total = total
      await transactionEntityManager.save(transaction);// vamos a usar una transaction para verificar que  se pueda realizar la tranaction(venta)

      if (createTransactionDto.coupon) {
        const coupon = await this.couponService.applyCoupon(createTransactionDto.coupon)
        const discount = (coupon.percentage / 100) * total
        
        transaction.discount = discount
        transaction.coupon = coupon.name
        transaction.total -= discount
      }

      for (const contents of createTransactionDto.contents) {
        const product = await transactionEntityManager.findOneBy(Product, { id: contents.productId })
        let errors: string[] = [];
        if (!product) {
          errors.push(`The product with ID ${contents.productId} does not found`);
          throw new NotFoundException(errors)
        }


        if (contents.quantity > product.inventory) {
          errors.push(`The product ${product.name} exced the enable quantity`)
          throw new BadRequestException(errors)
        }

        product.inventory -= contents.quantity;

        //Create TransactionContents instance
        const transactionContents = new TransactionContents()
        transactionContents.price = contents.price;
        transactionContents.product = product;
        transactionContents.quantity = contents.quantity;
        transactionContents.transaction = transaction;


        await transactionEntityManager.save(transaction)
        await transactionEntityManager.save(transactionContents)

      }
      return "Sale storaged correctly";
    })
  }

  findAll(transactionDate: string) {
    const options: FindManyOptions<Transaction> = {
      relations: {
        contents: true
      }
    }

    if (transactionDate) {
      const date = parseISO(transactionDate)//parseISO convierte el string a formato de fecha

      if (!isValid(date)) {
        throw new BadRequestException('Invalid Date')
      }

      const start = startOfDay(date)
      const end = endOfDay(date)

      //nos taremos las ventas desde el inicio hasta el final
      options.where = {
        transactionDate: Between(start, end)
      }
    }

    return this.transactionRepository.find(options);
  }

  async findOne(id: number) {
    const transaction = await this.transactionRepository.findOne({
      where: {
        id: id
      },
      relations: {
        contents: true
      }
    })

    if (!transaction) {
      throw new NotFoundException(`The Transaction with ID ${id} does not found`)
    }

    return transaction;

  }

  async remove(id: number) {
    const transaction = await this.findOne(id)

    if (!transaction) {
      throw new NotFoundException(`The Transaction with ID ${id} does not found`)
    }

    for (const contents of transaction.contents) {
      const product = await this.productRepository.findOneBy({ id: contents.product.id })

      if (product) {
        product.inventory += contents.quantity
        await this.productRepository.save(product)
      }

      const transactionContents = await this.transactionContentsRepository.findOneBy({ id: contents.id })

      if (transactionContents) {
        await this.transactionContentsRepository.remove(transactionContents)
      }
    }

    await this.transactionRepository.remove(transaction)
    return { message: `The Transaction with ID ${id} was removed` }
  }
}
