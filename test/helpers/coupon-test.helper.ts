import { DataSource } from 'typeorm';
import { Coupon } from '../../src/coupons/entities/coupon.entity';
import { CreateCouponDto } from '../../src/coupons/dto/create-coupon.dto';
import { couponCreateDtos } from '../../src/common/test-data';
import { addDays, subDays } from 'date-fns';

/**
 * Helper para crear datos de prueba comunes en tests de cupones
 */
export class CouponTestHelper {
  constructor(private dataSource: DataSource) {}

  /**
   * Crea un cupón de prueba con fecha futura por defecto
   */
  async createCoupon(dto?: CreateCouponDto, daysFromNow: number = 1): Promise<Coupon> {
    const couponRepository = this.dataSource.getRepository(Coupon);
    const createDto = dto || couponCreateDtos[0];
    return await couponRepository.save({
      ...createDto,
      expirationDate: addDays(new Date(), daysFromNow),
    });
  }

  /**
   * Crea un cupón expirado (fecha pasada)
   */
  async createExpiredCoupon(dto?: CreateCouponDto, daysAgo: number = 1): Promise<Coupon> {
    const couponRepository = this.dataSource.getRepository(Coupon);
    const createDto = dto || couponCreateDtos[0];
    return await couponRepository.save({
      ...createDto,
      expirationDate: subDays(new Date(), daysAgo),
    });
  }

  /**
   * Crea múltiples cupones de prueba
   */
  async createCoupons(count: number = 2, daysFromNow: number = 1): Promise<Coupon[]> {
    const coupons: Coupon[] = [];
    for (let i = 0; i < count && i < couponCreateDtos.length; i++) {
      coupons.push(await this.createCoupon(couponCreateDtos[i], daysFromNow));
    }
    return coupons;
  }
}
