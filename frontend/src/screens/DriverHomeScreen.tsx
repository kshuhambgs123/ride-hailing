import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, FlatList, Alert, RefreshControl } from "react-native";
import { Button, Card, Title, Paragraph, ActivityIndicator } from "react-native-paper";
import * as Location from "expo-location";
import { io, Socket } from "socket.io-client";
import api from "../api/axios";
import { BASE_URL as SOCKET_URL, TENANT_SLUG } from "../api/config";
import { getAuthToken } from "../api/session";

type RideRequest = {
    id: string;
    pickupLat: number;
    pickupLng: number;
    destinationLat: number;
    destinationLng: number;
    fare: number;
    passenger?: { id: string; displayName?: string; phoneNumber?: string };
};

// Minimal, functional driver experience: see pending on-demand requests,
// accept one, then broadcast live GPS for its duration. Not styled or
// polished — this exists so the rider-side live tracking flow has a real
// driver on the other end instead of nothing at all.
type CashState = { amount: number; confirmed: boolean } | null;

export default function DriverHomeScreen({ navigation }: any) {
    const [requests, setRequests] = useState<RideRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeRideId, setActiveRideId] = useState<string | null>(null);
    const [cash, setCash] = useState<CashState>(null);
    const [passenger, setPassenger] = useState<RideRequest["passenger"] | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const watchRef = useRef<Location.LocationSubscription | null>(null);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/rides/pending");
            setRequests(response.data);
        } catch (error) {
            console.error("Failed to load ride requests:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeRideId) return; // stop polling once on an active trip
        loadRequests();
        const interval = setInterval(loadRequests, 10000);
        return () => clearInterval(interval);
    }, [loadRequests, activeRideId]);

    useEffect(() => {
        return () => {
            socketRef.current?.disconnect();
            watchRef.current?.remove();
        };
    }, []);

    const acceptRide = async (rideId: string) => {
        try {
            const res = await api.post(`/rides/accept/${rideId}`);
            setPassenger(res.data?.passenger ?? null);
        } catch (error: any) {
            Alert.alert("Error", error?.response?.data?.message || "Couldn't accept this ride — it may already be taken.");
            loadRequests();
            return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission needed", "Location access is required to share your position with the rider.");
            return;
        }

        setActiveRideId(rideId);
        setCash(null);

        const socket = io(SOCKET_URL, { auth: { token: getAuthToken(), tenantSlug: TENANT_SLUG } });
        socketRef.current = socket;
        socket.emit("join_ride_chat", rideId);
        socket.on(`rideStatus:${rideId}`, (data: { status: string; amount?: number }) => {
            if (data.status === "cash_selected") {
                setCash({ amount: data.amount ?? 0, confirmed: false });
            } else if (data.status === "cash_confirmed") {
                setCash((prev) => (prev ? { ...prev, confirmed: true } : { amount: data.amount ?? 0, confirmed: true }));
            }
        });

        watchRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 },
            (loc) => {
                socket.emit("updateLocation", { lat: loc.coords.latitude, lng: loc.coords.longitude });
            }
        );
    };

    const confirmCash = async () => {
        if (!activeRideId) return;
        try {
            await api.post(`/rides/confirm-cash/${activeRideId}`);
            setCash((prev) => (prev ? { ...prev, confirmed: true } : prev));
        } catch (error: any) {
            Alert.alert("Error", error?.response?.data?.message || "Couldn't confirm cash payment.");
        }
    };

    const stopTrip = () => {
        watchRef.current?.remove();
        watchRef.current = null;
        socketRef.current?.disconnect();
        socketRef.current = null;
        setActiveRideId(null);
        setCash(null);
        setPassenger(null);
    };

    const completeTrip = async () => {
        if (!activeRideId) return;
        try {
            await api.post(`/rides/complete/${activeRideId}`);
        } catch (error: any) {
            // Keep the trip open (and GPS running) so the driver can retry —
            // dropping it here would leave the ride stuck as "accepted".
            Alert.alert("Error", error?.response?.data?.message || "Couldn't complete the trip. Try again.");
            return;
        }
        stopTrip();
    };

    const endTrip = () => {
        if (cash && !cash.confirmed) {
            Alert.alert(
                "Cash not confirmed",
                `The rider chose cash ($${cash.amount.toFixed(2)}). Confirm you received it before ending?`,
                [
                    { text: "Go back", style: "cancel" },
                    { text: "End anyway", style: "destructive", onPress: completeTrip },
                ]
            );
            return;
        }
        completeTrip();
    };

    if (activeRideId) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Title>Trip in progress</Title>
                <Paragraph style={{ marginBottom: 20 }}>Broadcasting your location to the rider.</Paragraph>
                <View style={{ flexDirection: "row", marginBottom: 12 }}>
                    {passenger && (
                        <Button
                            mode="outlined"
                            icon="message-text"
                            style={{ marginRight: 8 }}
                            onPress={() => navigation.navigate("Chat", {
                                rideId: activeRideId,
                                partnerId: passenger.id,
                                partnerName: passenger.displayName || "Rider",
                            })}
                        >
                            Chat with rider
                        </Button>
                    )}
                    <Button
                        mode="contained"
                        icon="alert-octagon"
                        buttonColor="#ff5252"
                        onPress={() => navigation.navigate("SOS", { rideId: activeRideId })}
                    >
                        SOS
                    </Button>
                </View>
                {cash && !cash.confirmed && (
                    <Button
                        mode="contained"
                        buttonColor="#2E7D32"
                        style={{ marginBottom: 12 }}
                        onPress={confirmCash}
                    >
                        Confirm Cash Received (${cash.amount.toFixed(2)})
                    </Button>
                )}
                {cash?.confirmed && <Paragraph style={{ color: "#2E7D32", marginBottom: 12 }}>Cash payment confirmed</Paragraph>}
                <Button mode="contained" buttonColor="#d32f2f" onPress={endTrip}>End Trip</Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRequests} />}
                ListEmptyComponent={!loading ? <Paragraph style={styles.empty}>No ride requests nearby right now.</Paragraph> : null}
                contentContainerStyle={{ padding: 12 }}
                renderItem={({ item }) => (
                    <Card style={styles.card}>
                        <Card.Content>
                            <Title>{item.passenger?.displayName || "Rider"}</Title>
                            <Paragraph>Fare: ${Number(item.fare).toFixed(2)}</Paragraph>
                        </Card.Content>
                        <Card.Actions>
                            <Button mode="contained" onPress={() => acceptRide(item.id)}>Accept</Button>
                        </Card.Actions>
                    </Card>
                )}
            />
            {loading && requests.length === 0 && <ActivityIndicator style={{ marginTop: 20 }} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    centered: { justifyContent: "center", alignItems: "center", padding: 20 },
    card: { marginBottom: 10 },
    empty: { textAlign: "center", marginTop: 40, color: "#777" },
});
