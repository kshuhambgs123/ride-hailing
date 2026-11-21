import { LlmService } from "./LlmService";

export interface BookingIntent {
    pickup?: string;
    destination?: string;
    time?: string;
    confidence: number;
    language?: string;
}

export class VoiceNlpService {
    /**
     * Advanced Polyglot Parser (LLM Powered)
     * Supports English, Hindi, Spanish, French and more.
     */
    static async parseBookingCommand(command: string): Promise<BookingIntent> {
        // Delegate to the Volo Intelligence Layer (LLM)
        const intent = await LlmService.parseIntent(command);

        return {
            pickup: intent.pickup,
            destination: intent.destination,
            confidence: intent.confidence,
            language: intent.language
        };
    }
}
