import { AppDataSource } from "../data-source";
import { Ride } from "../entities/Ride";
import { Coupon } from "../entities/Coupon";

export class EconService {
    private static rideRepository = AppDataSource.getRepository(Ride);
    private static couponRepository = AppDataSource.getRepository(Coupon);

    static PLATFORM_FEE_PERCENTAGE = 0.10; // 10% platform fee

    static async applyCoupon(ride: Ride, couponCode: string): Promise<Ride> {
        const coupon = await this.couponRepository.findOne({ where: { code: couponCode, isActive: true, tenantId: ride.tenantId } });

        if (!coupon || coupon.expiryDate < new Date()) {
            return ride;
        }

        if (Number(ride.fare) < Number(coupon.minRideValue)) {
            return ride;
        }

        const discount = Math.min(
            (Number(ride.fare) * coupon.discountPercentage) / 100,
            Number(coupon.maxDiscountValue)
        );

        ride.discountAmount = discount;
        ride.couponId = coupon.id;
        ride.fare = Number(ride.fare) - discount;

        return ride;
    }

    static calculatePlatformFee(fare: number): number {
        return fare * this.PLATFORM_FEE_PERCENTAGE;
    }

    static async finalizeRideEconomics(rideId: string) {
        const ride = await this.rideRepository.findOneBy({ id: rideId });
        if (ride) {
            ride.platformFee = this.calculatePlatformFee(Number(ride.fare));
            await this.rideRepository.save(ride);
        }
    }
}
