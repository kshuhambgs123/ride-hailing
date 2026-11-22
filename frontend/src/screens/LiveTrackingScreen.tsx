import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Title, IconButton, Avatar, Paragraph } from "react-native-paper";
import { io } from "socket.io-client";
import { BASE_URL as SOCKET_URL, TENANT_SLUG } from "../api/config";
import { getAuthToken } from "../api/session";

// Tracks one specific driver for one specific ride — not a fleet-wide view.
// `driverId`/`driverName` are the ones the rider's app received from the
// "accepted" rideStatus event (see HomeScreen), so this only ever shows the
// driver actually assigned to this ride.
export default function LiveTrackingScreen({ navigation, route }: any) {
    const { driverId, driverName, rideId } = route.params || {};
    const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        if (!driverId) return;

        const socket = io(SOCKET_URL, { auth: { token: getAuthToken(), tenantSlug: TENANT_SLUG } });

        socket.on(`tracking:${driverId}`, (data: { lat: number; lng: number }) => {
            setPosition({ latitude: data.lat, longitude: data.lng });
        });

        return () => { socket.disconnect(); };
    }, [driverId]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
                <Title style={{ flex: 1 }}>{driverName ? `Tracking ${driverName}` : "Live Tracking"}</Title>
                <IconButton
                    icon="alert-octagon"
                    mode="contained"
                    containerColor="#ff5252"
                    iconColor="#fff"
                    onPress={() => navigation.navigate("SOS", { rideId })}
                />
            </View>
            {!driverId ? (
                <View style={[styles.map, styles.centered]}>
                    <Paragraph>No active ride to track yet.</Paragraph>
                </View>
            ) : Platform.OS === 'web' ? (
                <View style={[styles.map, styles.centered, { backgroundColor: '#1a1a1a' }]}>
                    <Avatar.Icon icon="car-connected" size={100} style={{ backgroundColor: '#6200ee' }} />
                    <Title style={{ color: '#fff', marginTop: 20 }}>Live tracking (Web)</Title>
                    <Paragraph style={{ color: '#aaa' }}>Optimized for mobile. Web view active.</Paragraph>
                </View>
            ) : !position ? (
                <View style={[styles.map, styles.centered]}>
                    <Paragraph>Waiting for {driverName || "your driver"}'s location…</Paragraph>
                </View>
            ) : (
                <MapView
                    style={styles.map}
                    region={{
                        latitude: position.latitude,
                        longitude: position.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    <Marker coordinate={position} title={driverName || "Your driver"}>
                        <IconButton icon="car" iconColor="#6200ee" />
                    </Marker>
                </MapView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingVertical: 10, backgroundColor: "#fff" },
    map: { width: Dimensions.get("window").width, height: Dimensions.get("window").height },
    centered: { justifyContent: 'center', alignItems: 'center' },
});
