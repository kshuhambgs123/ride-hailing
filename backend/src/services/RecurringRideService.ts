import { AppDataSource } from "../data-source";
import { RecurringRide, DayOfWeek } from "../entities/RecurringRide";
import { Ride, RideStatus } from "../entities/Ride";

export class RecurringRideService {
    static async createSchedule(userId: string, data: any) {
        const repo = AppDataSource.getRepository(RecurringRide);
        const schedule = repo.create({
            user: { id: userId },
            ...data
        });
        return await repo.save(schedule);
    }

    static async processSchedules() {
        const repo = AppDataSource.getRepository(RecurringRide);
        const dayMap: Record<number, DayOfWeek> = {
            1: DayOfWeek.MONDAY,
            2: DayOfWeek.TUESDAY,
            3: DayOfWeek.WEDNESDAY,
            4: DayOfWeek.THURSDAY,
            5: DayOfWeek.FRIDAY,
            6: DayOfWeek.SATURDAY,
            0: DayOfWeek.SUNDAY
        };

        const today = dayMap[new Date().getDay()];
        const activeSchedules = await repo.find({ where: { isActive: true }, relations: ["user"] });

        for (const schedule of activeSchedules) {
            if (schedule.days.includes(today)) {
                // Logic to create a Ride instance for the current time
                // This would typically be triggered by a cron job 1 hour before departureTime
                console.log(`Processing recurring ride for user ${schedule.user.id} at ${schedule.departureTime}`);
            }
        }
    }
}
