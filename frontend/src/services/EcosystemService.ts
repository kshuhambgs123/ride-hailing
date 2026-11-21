export interface PhantomDriver {
    id: string;
    lat: number;
    lng: number;
    bearing: number;
}

export class EcosystemService {
    /**
     * Generates a swarm of phantom drivers around a location.
     * Hardened for 20M user visual engagement.
     */
    static getPhantomDrivers(lat: number, lng: number, count: number = 8): PhantomDriver[] {
        const drivers: PhantomDriver[] = [];
        for (let i = 0; i < count; i++) {
            drivers.push({
                id: `phantom_${i}`,
                lat: lat + (Math.random() - 0.5) * 0.02,
                lng: lng + (Math.random() - 0.5) * 0.02,
                bearing: Math.random() * 360
            });
        }
        return drivers;
    }
}
