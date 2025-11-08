import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { Repository } from 'typeorm';
import { ApplyCouponDto } from './dto/apply-coupon';
import { endOfDay, isAfter } from 'date-fns';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon) private readonly couponRepository: Repository<Coupon>// repository realiza variabas funciones pero pasandole un generic, el codigo se adapta
  ) { }

  create(createCouponDto: CreateCouponDto) {
    return this.couponRepository.save(createCouponDto)
  }

  findAll() {
    return this.couponRepository.find();
  }

  async findOne(id: number) {
    const coupon = await this.couponRepository.findOneBy({ id })
    if (!coupon) {
      throw new NotFoundException(`The coupon with ID: ${id} does not found`)
    }
    return coupon;
  }
  async update(id: number, updateCouponDto: UpdateCouponDto) {
    const coupon = await this.findOne(id)
    Object.assign(coupon, updateCouponDto)
    return await this.couponRepository.save(coupon)

  }

  async remove(id: number) {
    const coupon = await this.findOne(id)
    await this.couponRepository.remove(coupon)
    return { message: 'Removed coupon' }
  }

  async applyCoupon(name: string) {
    const coupon = await this.couponRepository.findOneBy({ name })
    if (!coupon) {
      throw new NotFoundException(`The coupon with name: ${name} does not found`)
    }
    const currrentDate = new Date()
    const expirationDate = endOfDay(coupon.expirationDate)
    if (isAfter(currrentDate, expirationDate)) {
      throw new UnprocessableEntityException(`Expired coupon`)
    }
    return {
      message: 'Valid coupon',
      ...coupon
    }
  }

}
