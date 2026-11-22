import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, ScrollView, Alert, Platform, Animated } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Button, Card, Title, Paragraph, Avatar, IconButton, Searchbar, List, Portal, Modal, Text } from "react-native-paper";
import * as Location from "expo-location";
import { io } from "socket.io-client";
import { CurrencyFormatter } from "../utils/CurrencyFormatter";
import * as Speech from 'expo-speech';
import api from "../api/axios";
import { BASE_URL as SOCKET_URL, TENANT_SLUG } from "../api/config";
import { getAuthToken } from "../api/session";

type ActiveRide = {
    id: string;
    status: "pending" | "accepted";
    driverId?: string;
    driverName?: string;
};

export default function HomeScreen({ navigation }: any) {
    const [location, setLocation] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [recs, setRecs] = useState<any[]>([]);
    const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [seats, setSeats] = useState(1);
    const [isInclusionMode, setIsInclusionMode] = useState(false);
    const [zeroClickIntent, setZeroClickIntent] = useState<any>(null);
    const [countdown, setCountdown] = useState(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
    const [destination, setDestination] = useState<any>(null);
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledDate, setScheduledDate] = useState(new Date());

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Denied", "Location access is needed for the app to function.");
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        })();
    }, []);

    // Listens for the driver accepting this specific ride — scoped to the
    // ride's own room (see backend/src/services/ChatService.ts), so this
    // never leaks other riders' ride status.
    useEffect(() => {
        if (!activeRide?.id) return;

        const socket = io(SOCKET_URL, { auth: { token: getAuthToken(), tenantSlug: TENANT_SLUG } });
        socket.emit("join_ride_chat", activeRide.id);
        socket.on(`rideStatus:${activeRide.id}`, (data: { status: string; driverId?: string; driverName?: string }) => {
            setActiveRide((prev) => (prev ? { ...prev, ...data } as ActiveRide : prev));
            if (data.status === "accepted") {
                speak(`${data.driverName || "Your driver"} accepted your ride.`);
            }
        });

        return () => { socket.disconnect(); };
    }, [activeRide?.id]);

    useEffect(() => {
        const fetchIntent = async () => {
            const hour = new Date().getHours();
            if (hour >= 8 && hour <= 10) {
                setZeroClickIntent({ destination: "Office", countdown: 10 });
                setCountdown(10);
                speak("I noticed you go to work now. Sending a ride request in 10 seconds. Press cancel to stop.");
            }
            if (location) {
                try {
                    const mockSuggestions = [
                        { address: "123 Main St", lat: location.coords.latitude + 0.01, lng: location.coords.longitude + 0.01 },
                        { address: "456 Oak Ave", lat: location.coords.latitude - 0.01, lng: location.coords.longitude - 0.01 },
                    ];
                    setSuggestions(mockSuggestions);

                    // Simple mock for recommendations
                    setRecs([
                        { title: "Artisan Cafe", category: "Foodie", description: "Top rated coffee nearby", lat: location.coords.latitude + 0.005, lng: location.coords.longitude + 0.005 }
                    ]);

                    // Elite FTU Trigger
                    const isNewUser = navigation.getState()?.routes.find((r: any) => r.name === "Home")?.params?.isNewUser;
                    if (isNewUser) {
                        setIsOnboarding(true);
                        // Clear the param so it doesn't re-trigger on remount
                        navigation.setParams({ isNewUser: false });
                    }
                } catch (e) { console.error(e); }
            }
        };
        fetchIntent();
    }, [location]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && zeroClickIntent) {
            handleRequestRide();
            setZeroClickIntent(null);
        }
    }, [countdown, zeroClickIntent]);

    const speak = (text: string) => {
        if (isInclusionMode) Speech.speak(text);
    };

    const handleRequestRide = async () => {
        if (!location) {
            Alert.alert("Error", "Still getting your location — try again in a moment.");
            return;
        }

        speak("Searching for the best driver for you.");
        let newRideId: string;
        try {
            const response = await api.post("/rides/request", {
                pickupLat: location.coords.latitude,
                pickupLng: location.coords.longitude,
                destinationLat: destination?.lat || 40.758896,
                destinationLng: destination?.lng || -73.985130,
                fare: estimatedFare || 25 * seats,
            });
            newRideId = response.data.id;
            setActiveRide({ id: newRideId, status: "pending" });
        } catch (error) {
            console.error("Request ride failed:", error);
            Alert.alert("Error", "Couldn't request a ride right now. Please try again.");
            return;
        }

        // Without rideId here, every call to /rides/pay was silently
        // hitting the backend with an empty ride id and could never settle.
        navigation.navigate("Payment", { amount: 25 * seats, rideId: newRideId });
    };

    const handleInclusionToggle = () => {
        const newState = !isInclusionMode;
        setIsInclusionMode(newState);
        if (newState) {
            Speech.speak("Accessibility mode on. I will help you with your ride.");
        }
    };

    const handleVoiceBooking = async () => {
        speak("I am listening. Tell me where you want to go.");

        // Mocking the "Any Voice" detection
        const mockCommand = "Airport"; // User just says the destination

        try {
            // Mock VoiceNlpService
            const VoiceNlpService = {
                parseBookingCommand: async (command: string) => {
                    return { destination: command };
                }
            };
            const intent = await VoiceNlpService.parseBookingCommand(mockCommand);
            if (intent.destination) {
                speak(`Searching for rides to ${intent.destination}.`);

                // AUTO-SEARCH TRIGGER
                // In a real app, this would fetch results from /api/rides/search
                navigation.navigate("Home", {
                    screen: "Rides",
                    params: {
                        autoSearchDest: intent.destination,
                        triggerSearch: true
                    }
                });

                // For the demo, we show the search results immediately
                Alert.alert(`Volo AI: Found 3 drivers going to ${intent.destination}.`);
            }
        } catch (error) {
            console.error("Voice parse error:", error);
            speak("I didn't catch that. Please try again.");
        }
    };

    const handleScheduleRide = async (payDeposit: boolean) => {
        speak(`Scheduling your ride for ${scheduledDate.toLocaleString()}.`);

        try {
            const response = await api.post("/rides/schedule", {
                pickupLat: location?.coords.latitude,
                pickupLng: location?.coords.longitude,
                destinationLat: destination?.lat || 40.758896,
                destinationLng: destination?.lng || -73.985130,
                pickupAddress: "Current Location",
                destinationAddress: destination?.label || "Times Square, NY",
                departureTime: scheduledDate,
                fare: estimatedFare || 35.00,
                payDeposit
            });
            Alert.alert("Volo Chronos", response.data.message);
        } catch (error) {
            console.error("Schedule error:", error);
            Alert.alert("Error", "Scheduling failed. Please try again.");
        }
    };

    const selectPlace = async (place: any) => {
        setSearchQuery(place.label || place.title);
        setDestination(place);
        speak(`Going to ${place.label || place.title}. Calculating your elite fare.`);

        // Dynamic Fare Estimation (Elite UX)
        try {
            // Mocking a distance of 10km for now as we don't have a live routing engine here
            const response = await api.post("/rides/fare-estimate", {
                distanceKm: 12.5,
                rideType: "local",
                seats
            });
            setEstimatedFare(response.data.fare);
        } catch (error) {
            console.error("Fare estimate error:", error);
        }
    };

    return (
        <View style={styles.container}>
            {zeroClickIntent && countdown > 0 && (
                <Card style={styles.infinityCard}>
                    <Card.Content style={{ alignItems: 'center' }}>
                        <Avatar.Icon icon="infinity" size={50} style={{ backgroundColor: '#6200ee' }} />
                        <Title style={{ color: '#fff' }}>Volo Infinity Auto-Book</Title>
                        <Paragraph style={{ color: '#eee', textAlign: 'center' }}>
                            Booking your ride to **{zeroClickIntent.destination}** in {countdown}s...
                        </Paragraph>
                        <Button
                            mode="contained"
                            buttonColor="#ff1744"
                            onPress={() => { setZeroClickIntent(null); setCountdown(0); }}
                        >
                            Cancel
                        </Button>
                    </Card.Content>
                </Card>
            )}

            {Platform.OS === 'web' ? (
                <View style={[styles.map, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                    <Avatar.Icon icon="map" size={100} style={{ backgroundColor: '#6200ee' }} />
                    <Title style={{ color: '#fff', marginTop: 20 }}>Volo Global Map (Web Edition)</Title>
                    <Paragraph style={{ color: '#aaa' }}>Interactive maps are optimized for mobile. Web View active.</Paragraph>
                </View>
            ) : (
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: location ? location.coords.latitude : 37.78825,
                        longitude: location ? location.coords.longitude : -122.4324,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                    }}
                >
                    {location && <Marker coordinate={location.coords} title="You" />}
                </MapView>
            )}

            {location && destination && Platform.OS !== 'web' && (
                <Polyline
                    coordinates={[
                        { latitude: location.coords.latitude, longitude: location.coords.longitude },
                        { latitude: destination.lat, longitude: destination.lng }
                    ]}
                    strokeColor="#6200ee"
                    strokeWidth={4}
                />
            )}

            <View style={styles.searchContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconButton
                        icon="menu"
                        mode="contained"
                        containerColor="#fff"
                        onPress={() => setIsDrawerOpen(true)}
                        style={{ marginRight: 8, elevation: 5 }}
                    />
                    <Searchbar
                        placeholder="Where to?"
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={[styles.searchBar, { flex: 1 }]}
                    />
                </View>
                {suggestions.length > 0 && (
                    <ScrollView horizontal style={styles.suggestionBar}>
                        {suggestions.map((s, i) => (
                            <Button key={i} mode="elevated" style={styles.suggestionChip} onPress={() => selectPlace(s)}>
                                {s.address.split(',')[0]}
                            </Button>
                        ))}
                    </ScrollView>
                )}
            </View>

            <View style={styles.discoveryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {recs.map((r, i) => (
                        <Card key={i} style={styles.discoveryCard} onPress={() => selectPlace(r)}>
                            <Card.Title title={r.title} subtitle={r.category} />
                        </Card>
                    ))}
                </ScrollView>
            </View>

            <Card style={styles.card}>
                <Card.Content>
                    {!isInclusionMode ? (
                        <>
                            <Title>Ready to Volo?</Title>
                            <Paragraph>Reliable rides at infinity scale.</Paragraph>
                        </>
                    ) : (
                        <View style={styles.inclusionHeader}>
                            <Avatar.Icon icon="home" size={80} style={{ backgroundColor: '#4CAF50' }} />
                            <Title style={styles.inclusionTitle}>TAP TO GO HOME</Title>
                        </View>
                    )}
                    <View style={styles.seatContainer}>
                        <Paragraph>Number of Seats: {seats}</Paragraph>
                        <Button onPress={() => setSeats(Math.max(1, seats - 1))}>-</Button>
                        <Button onPress={() => setSeats(Math.min(4, seats + 1))}>+</Button>
                    </View>
                </Card.Content>
                <Card.Actions style={{ flexDirection: 'column' }}>
                    {!isInclusionMode ? (
                        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Button icon="shield-check" mode="outlined" onPress={() => navigation.navigate("Admin")}>Admin</Button>
                            <Button icon="gift" mode="outlined" onPress={() => navigation.navigate("Referral")}>Referral</Button>
                            <Button mode="outlined" icon="history" onPress={() => navigation.navigate("History")}>History</Button>
                            <Button mode="contained" icon="wallet" onPress={() => navigation.navigate("Wallet")}>Wallet</Button>
                        </View>
                    ) : null}
                    <View style={{ width: '100%', flexDirection: 'row' }}>
                        <Button
                            mode="contained"
                            onPress={handleRequestRide}
                            style={[styles.requestButton, isInclusionMode && styles.inclusionBtn]}
                            icon={isInclusionMode ? "home" : "car"}
                            contentStyle={{ height: isInclusionMode ? 80 : 45 }}
                            labelStyle={isInclusionMode && { fontSize: 24, paddingVertical: 10 }}
                        >
                            {isInclusionMode ? "GO NOW" : `Confirm Ride (${CurrencyFormatter.format(estimatedFare || 25 * seats)})`}
                        </Button>
                        {!isInclusionMode && (
                            <Button
                                mode="outlined"
                                style={{ marginLeft: 8 }}
                                onPress={() => setIsScheduling(true)}
                            >
                                Schedule
                            </Button>
                        )}
                        {!isInclusionMode && (
                            <IconButton
                                icon="microphone"
                                mode="contained"
                                containerColor="#6200ee"
                                iconColor="white"
                                size={30}
                                onPress={handleVoiceBooking}
                            />
                        )}
                    </View>
                    <View style={styles.row}>
                        <Button
                            icon="map-marker-radius"
                            mode="outlined"
                            disabled={!activeRide?.driverId}
                            onPress={() => navigation.navigate("LiveTracking", {
                                driverId: activeRide?.driverId,
                                driverName: activeRide?.driverName,
                            })}
                        >
                            {activeRide?.driverId ? "Track Driver" : activeRide ? "Waiting for driver…" : "Tracking"}
                        </Button>
                        <IconButton
                            icon={isInclusionMode ? "eye-off" : "eye"}
                            mode="contained"
                            containerColor={isInclusionMode ? "#FFD700" : "#eee"}
                            onPress={handleInclusionToggle}
                        />
                    </View>
                </Card.Actions>
            </Card>

            <Portal>
                <Modal visible={isDrawerOpen} onDismiss={() => setIsDrawerOpen(false)} contentContainerStyle={styles.onboardingModal}>
                    <Title style={{ color: '#fff', marginBottom: 20 }}>Elite Command Center</Title>
                    <List.Item title="My Wallet" left={p => <List.Icon {...p} icon="wallet" color="#6200ee" />} titleStyle={{ color: '#fff' }} onPress={() => { setIsDrawerOpen(false); navigation.navigate("Wallet"); }} />
                    <List.Item title="Ride History" left={p => <List.Icon {...p} icon="history" color="#6200ee" />} titleStyle={{ color: '#fff' }} onPress={() => { setIsDrawerOpen(false); navigation.navigate("History"); }} />
                    <List.Item title="Safety Center" left={p => <List.Icon {...p} icon="shield-check" color="#6200ee" />} titleStyle={{ color: '#fff' }} onPress={() => { setIsDrawerOpen(false); navigation.navigate("Admin"); }} />
                    <List.Item title="Become a Driver" left={p => <List.Icon {...p} icon="steering" color="#6200ee" />} titleStyle={{ color: '#fff' }} onPress={() => { setIsDrawerOpen(false); navigation.navigate("DriverVerification"); }} />
                    <List.Item title="Inclusion Mode" right={p => <Button mode="text" onPress={handleInclusionToggle}>{isInclusionMode ? "ON" : "OFF"}</Button>} left={p => <List.Icon {...p} icon="human-handsdown" color="#6200ee" />} titleStyle={{ color: '#fff' }} />
                    <Button mode="contained" onPress={() => setIsDrawerOpen(false)} style={{ marginTop: 20 }}>Close</Button>
                </Modal>
            </Portal>
            <Portal>
                <Modal visible={isScheduling} onDismiss={() => setIsScheduling(false)} contentContainerStyle={styles.onboardingModal}>
                    <Avatar.Icon icon="clock-outline" size={60} style={{ backgroundColor: '#6200ee', alignSelf: 'center' }} />
                    <Title style={{ textAlign: 'center', color: '#fff' }}>Chronos Precision Selection</Title>
                    <Paragraph style={{ color: '#eee', textAlign: 'center' }}>Choose your elite departure time:</Paragraph>

                    <View style={{ marginVertical: 20 }}>
                        <Button mode="outlined" style={{ marginBottom: 10 }} onPress={() => {
                            const d = new Date(); d.setHours(d.getHours() + 1); setScheduledDate(d);
                        }}>In 1 Hour</Button>
                        <Button mode="outlined" style={{ marginBottom: 10 }} onPress={() => {
                            const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); setScheduledDate(d);
                        }}>Tomorrow at 9:00 AM</Button>
                        <Button mode="outlined" style={{ marginBottom: 10 }} onPress={() => {
                            const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0); setScheduledDate(d);
                        }}>Tomorrow Evening (6 PM)</Button>
                    </View>

                    <Title style={{ color: '#FFD700', textAlign: 'center', fontSize: 16 }}>Selected: {scheduledDate.toLocaleString()}</Title>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                        <Button mode="text" onPress={() => setIsScheduling(false)}>Cancel</Button>
                        <Button mode="contained" onPress={() => {
                            setIsScheduling(false);
                            // Chain to the existing priority check or direct schedule
                            Alert.alert(
                                "Elite Priority",
                                "Secure this slot with Priority Booking ($1.00 refundable) or use Standard (Free)?",
                                [
                                    { text: "Standard", onPress: () => handleScheduleRide(false) },
                                    { text: "Priority", onPress: () => handleScheduleRide(true) }
                                ]
                            );
                        }}>Confirm Slot</Button>
                    </View>
                </Modal>
            </Portal>

            {isOnboarding && (
                <View style={styles.immersiveOnboarding}>
                    <View style={styles.onboardingContent}>
                        <Animated.View style={{ alignItems: 'center' }}>
                            {onboardingStep === 0 && <Avatar.Icon icon="gift-outline" size={120} style={{ backgroundColor: '#FFD700' }} />}
                            {onboardingStep === 1 && <Avatar.Icon icon="microphone" size={120} style={{ backgroundColor: '#6200ee' }} />}
                            {onboardingStep === 2 && <Avatar.Icon icon="clock-fast" size={120} style={{ backgroundColor: '#03dac6' }} />}
                            {onboardingStep === 3 && <Avatar.Icon icon="shield-crown" size={120} style={{ backgroundColor: '#bb86fc' }} />}
                        </Animated.View>

                        <Title style={styles.immersiveTitle}>
                            {onboardingStep === 0 && "Your Elite Welcome"}
                            {onboardingStep === 1 && "Volo Voice Intelligence"}
                            {onboardingStep === 2 && "Volo Chronos: Advanced"}
                            {onboardingStep === 3 && "Volo Sentinel Trust"}
                        </Title>

                        <Paragraph style={styles.immersiveParagraph}>
                            {onboardingStep === 0 && "We've gifted you $10! Every journey starts with capital. Use your credits for your first elite ride."}
                            {onboardingStep === 1 && "Hands-free mastery. Just speak your destination in any language, and let Volo's AI handle the rest."}
                            {onboardingStep === 2 && "Precision scheduling. Book for now or for the future with millisecond accuracy and optional priority."}
                            {onboardingStep === 3 && "You are protected. Every ride is audited by Volo Sentinel, with built-in SOS and fraud detection."}
                        </Paragraph>

                        <View style={styles.immersiveFooter}>
                            <Text style={{ color: '#aaa', fontSize: 18 }}>Step {onboardingStep + 1} of 4</Text>
                            <Button
                                mode="contained"
                                buttonColor="#FFD700"
                                textColor="#000"
                                contentStyle={{ height: 60 }}
                                labelStyle={{ fontSize: 20, fontWeight: 'bold' }}
                                style={{ borderRadius: 30, width: '60%' }}
                                onPress={() => {
                                    if (onboardingStep < 3) {
                                        setOnboardingStep(onboardingStep + 1);
                                    } else {
                                        setIsOnboarding(false);
                                        speak("Welcome to the future of mobility. Where would you like to go first?");
                                    }
                                }}
                            >
                                {onboardingStep < 3 ? "Next Discovery" : "Unlock Volo"}
                            </Button>
                        </View>
                    </View>
                </View>
            )}
            {(!isOnboarding && !destination) && (
                <View style={styles.discoveryBridge}>
                    <Card style={styles.bridgeCard}>
                        <Card.Content>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Avatar.Icon icon="star-circle" size={40} style={{ backgroundColor: '#FFD700' }} />
                                <View style={{ marginLeft: 15 }}>
                                    <Title style={{ fontSize: 18, color: '#fff' }}>Use Your $10 Credit</Title>
                                    <Paragraph style={{ color: '#aaa' }}>Ready for your first elite journey?</Paragraph>
                                </View>
                            </View>
                            <Button
                                mode="contained"
                                buttonColor="#FFD700"
                                textColor="#000"
                                style={{ marginTop: 15 }}
                                onPress={() => {
                                    setSearchQuery("Empire State Building");
                                    selectPlace({ lat: 40.7484, lng: -73.9857, label: "Empire State Building, NY" });
                                    speak("Exquisite choice. I'm calculating the elite fare for the Empire State Building using your welcome credit.");
                                }}
                            >
                                Visit Empire State Building
                            </Button>
                        </Card.Content>
                    </Card>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: Dimensions.get("window").width, height: Dimensions.get("window").height },
    card: { position: "absolute", bottom: 20, left: 10, right: 10, elevation: 4, padding: 5 },
    seatContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 },
    requestButton: { marginVertical: 5, width: '100%' },
    row: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginVertical: 2, alignItems: 'center' },
    voiceButton: { backgroundColor: "#6200ee", flex: 1, marginLeft: 10, marginRight: 10 },
    inclusionBtn: { backgroundColor: '#4CAF50', width: '100%', elevation: 10 },
    inclusionHeader: { alignItems: 'center', padding: 20 },
    inclusionTitle: { fontSize: 22, textAlign: 'center', marginTop: 10, fontWeight: 'bold' },
    searchContainer: { position: 'absolute', top: 50, left: 10, right: 10, zIndex: 10 },
    searchBar: { borderRadius: 10, elevation: 5 },
    resultsCard: { marginTop: 5, borderRadius: 10 },
    suggestionBar: { position: 'absolute', top: 100, left: 10, right: 10, zIndex: 10, flexDirection: 'row' },
    suggestionChip: { marginRight: 8, backgroundColor: '#fff', borderRadius: 20 },
    infinityCard: { position: 'absolute', top: 120, left: 20, right: 20, zIndex: 100, backgroundColor: '#1a1a1a', borderRadius: 20, elevation: 15, padding: 10 },
    onboardingModal: { backgroundColor: '#1a1a1a', padding: 30, margin: 20, borderRadius: 20, elevation: 20 },
    immersiveOnboarding: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 1000, padding: 20, justifyContent: 'center' },
    onboardingContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    immersiveTitle: { color: '#FFD700', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginTop: 40 },
    immersiveParagraph: { color: '#fff', fontSize: 20, textAlign: 'center', marginTop: 30, lineHeight: 28, paddingHorizontal: 20 },
    immersiveFooter: { position: 'absolute', bottom: 60, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    discoveryContainer: { position: 'absolute', bottom: 200, left: 10, right: 0, zIndex: 10 },
    discoveryCard: { width: 150, marginRight: 10, borderRadius: 10, elevation: 3 },
    discoveryBridge: { position: 'absolute', top: 130, left: 15, right: 15, zIndex: 5 },
    bridgeCard: { backgroundColor: '#1a1a1a', borderRadius: 15, elevation: 10, borderWidth: 1, borderColor: '#333' }
});
