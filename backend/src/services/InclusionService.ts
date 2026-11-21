export class InclusionService {
    /**
     * Translates system states into simple verbal instructions.
     * Designed for illiterate or low-vision users.
     */
    static getVerbalGuidance(state: string, data: any): string {
        switch (state) {
            case "RIDE_SEARCHING":
                return "Finding your ride. Please wait while the circle spins.";
            case "DRIVER_ASSIGNED":
                return `A car is coming! The color is ${data.carColor || "silver"}. Your driver is ${data.driverName}.`;
            case "ARRIVED":
                return "Your ride is here! Look for the car ending in number " + data.plateNumber.slice(-4);
            case "PAYMENT_DUE":
                return `The ride is over. Please pay ${data.fare} ${data.currency}. You can use your thumb on the purple button to pay with wallet.`;
            case "LOW_BALANCE":
                return "Your wallet is empty. Please ask someone to help you add money using the big plus button.";
            default:
                return "Welcome to Volo. Press the big green button to go home.";
        }
    }

    /**
     * Maps addresses to simplified visual concepts (Landmarks).
     */
    static simplifyLocation(address: string): { icon: string; label: string } {
        const text = address.toLowerCase();
        if (text.includes("airport") || text.includes("terminal")) return { icon: "airplane", label: "Airport" };
        if (text.includes("railway") || text.includes("station")) return { icon: "train", label: "Station" };
        if (text.includes("hospital") || text.includes("clinic")) return { icon: "hospital-building", label: "Hospital" };
        if (text.includes("home")) return { icon: "home", label: "Home" };
        if (text.includes("office") || text.includes("work")) return { icon: "briefcase", label: "Office" };

        return { icon: "map-marker", label: "Location" };
    }
}
