import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Title, IconButton, Avatar, Paragraph } from "react-native-paper";
import { io } from "socket.io-client";
import { BASE_URL as SOCKET_URL } from "../api/config";

export default function LiveTrackingScreen({ navigation }: any) {
    const [drivers, setDrivers] = useState<any>({});

    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on("driverLocationUpdate", (data) => {
            setDrivers((prev: any) => ({
                ...prev,
                [data.driverId]: { latitude: data.lat, longitude: data.lng }
            }));
        });

        return () => { socket.disconnect(); };
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
                <Title>Fleet Tracking</Title>
            </View>
            {Platform.OS === 'web' ? (
                <View style={[styles.map, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                    <Avatar.Icon icon="car-connected" size={100} style={{ backgroundColor: '#6200ee' }} />
                    <Title style={{ color: '#fff', marginTop: 20 }}>Volo Fleet Live (Web)</Title>
                    <Paragraph style={{ color: '#aaa' }}>Live fleet telemetry is optimized for mobile. Web View active.</Paragraph>
                </View>
            ) : (
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: 28.6139,
                        longitude: 77.2090,
                        latitudeDelta: 0.1,
                        longitudeDelta: 0.1,
                    }}
                >
                    {Object.keys(drivers).map(id => (
                        <Marker
                            key={id}
                            coordinate={drivers[id]}
                            title="Available Driver"
                            description={`Driver ID: ${id}`}
                        >
                            <IconButton icon="car" iconColor="#6200ee" />
                        </Marker>
                    ))}
                </MapView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingVertical: 10, backgroundColor: "#fff" },
    map: { width: Dimensions.get("window").width, height: Dimensions.get("window").height },
});
