module.exports = {
    preset: "jest-expo",
    setupFilesAfterEnv: ["./jestSetup.js"],
    transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-maps)"
    ],
    moduleNameMapper: {
        '^react-native-reanimated$': '<rootDir>/node_modules/react-native-reanimated/mock',
        '^react-native-maps$': '<rootDir>/node_modules/react-native-maps/lib/components/MapView.js'
    }
};
