import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            "welcome": "Welcome to Volo",
            "book_ride": "Book a Ride",
            "my_trips": "My Trips",
            "profile": "Profile",
            "emergency": "Emergency SOS",
            "achievements": "Achievements"
        }
    },
    hi: {
        translation: {
            "welcome": "Volo में आपका स्वागत है",
            "book_ride": "सवारी बुक करें",
            "my_trips": "मेरी यात्राएं",
            "profile": "प्रोफ़ाइल",
            "emergency": "आपातकालीन एसओएस",
            "achievements": "उपलब्धियां"
        }
    },
    es: {
        translation: {
            "welcome": "Bienvenido a Volo",
            "book_ride": "Reservar un viaje",
            "my_trips": "Mis viajes",
            "profile": "Perfil",
            "emergency": "SOS de emergencia",
            "achievements": "Logros"
        }
    },
    fr: {
        translation: {
            "welcome": "Bienvenue chez Volo",
            "book_ride": "Réserver un trajet",
            "my_trips": "Mes voyages",
            "profile": "Profil",
            "emergency": "SOS d'urgence",
            "achievements": "Réalisations"
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
