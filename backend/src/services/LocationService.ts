export interface PlaceSuggestion {
    id: string;
    label: string;
    address: string;
    lat: number;
    lng: number;
    isLandmark?: boolean;
}

export class LocationService {
    /**
     * Search for places with autocomplete (Enterprise Layer)
     */
    static async searchPlaces(query: string): Promise<PlaceSuggestion[]> {
        console.log(`[Volo Location] Searching for: ${query}`);

        // Mocking an enterprise place search (Google/Mapbox/OpenStreet)
        const mockDatabase: PlaceSuggestion[] = [
            { id: "1", label: "Central Park", address: "New York, NY", lat: 40.785091, lng: -73.968285 },
            { id: "2", label: "Times Square", address: "Manhattan, NY", lat: 40.758896, lng: -73.985130 },
            { id: "3", label: "JFK Airport", address: "Queens, NY", lat: 40.6413, lng: -73.7781, isLandmark: true },
            { id: "4", label: "Empire State Building", address: "350 5th Ave", lat: 40.7484, lng: -73.9857 },
            { id: "5", label: "Grand Central Station", address: "89 E 42nd St", lat: 40.7527, lng: -73.9772, isLandmark: true },
        ];

        return mockDatabase.filter(p =>
            p.label.toLowerCase().includes(query.toLowerCase()) ||
            p.address.toLowerCase().includes(query.toLowerCase())
        );
    }

    /**
     * Reverse geocoding for current position labels
     */
    static async getAddressFromCoords(lat: number, lng: number): Promise<string> {
        // Simplified mock mapping
        if (Math.abs(lat - 40.7831) < 0.1) return "Near Central Park, New York";
        return "Unknown Scenic Route";
    }
}
