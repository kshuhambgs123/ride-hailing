import { AppDataSource } from "../data-source";
import { Ride } from "../entities/Ride";
import { Transaction, TransactionStatus } from "../entities/Transaction";
import { MARKET } from "../config/market";

export class InvoiceService {
    static async generateInvoiceData(rideId: string) {
        const rideRepo = AppDataSource.getRepository(Ride);
        const txRepo = AppDataSource.getRepository(Transaction);

        const ride = await rideRepo.findOne({
            where: { id: rideId },
            relations: ["driver", "passenger"]
        });

        if (!ride) throw new Error("Ride not found");

        const transactions = await txRepo.find({
            where: { ride: { id: rideId }, status: TransactionStatus.COMPLETED }
        });

        const totalPaid = transactions.reduce((acc, tx) => acc + Number(tx.grossAmount), 0);
        const totalTax = transactions.reduce((acc, tx) => acc + Number(tx.taxAmount), 0);
        const totalFees = transactions.reduce((acc, tx) => acc + Number(tx.feeAmount), 0);

        return {
            invoiceNumber: `INV-${ride.id.substring(0, 8).toUpperCase()}`,
            date: new Date().toISOString(),
            rideDetails: {
                from: ride.pickupAddress || `${ride.pickupLat}, ${ride.pickupLng}`,
                to: ride.destinationAddress || `${ride.destinationLat}, ${ride.destinationLng}`,
                distance: ride.distance || "0 km",
                date: ride.departureTime ? ride.departureTime.toISOString() : ride.createdAt.toISOString()
            },
            parties: {
                passenger: ride.passenger.phoneNumber,
                driver: ride.driver?.phoneNumber || "TBA"
            },
            financials: {
                baseFare: Number(ride.baseFare) || Number(ride.fare),
                tax: totalTax,
                serviceFee: totalFees,
                total: totalPaid || Number(ride.fare),
                currency: MARKET.currency
            }
        };
    }
}
