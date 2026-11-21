import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Title, List, Card, Paragraph, Divider } from "react-native-paper";
import api from "../api/axios";
import { CurrencyFormatter } from "../utils/CurrencyFormatter";

interface Ride {
    id: string;
    fare: number;
    createdAt: string;
    status: string;
}

export default function HistoryScreen() {
    const [rides, setRides] = useState<Ride[]>([]);

    useEffect(() => {
        api.get("/rides/passenger").then(res => setRides(res.data)).catch(() => {
            // Mock data if API fails
            const mockRides: Ride[] = [
                { id: "1", fare: 450, createdAt: new Date().toISOString(), status: "COMPLETED" },
                { id: "2", fare: 320, createdAt: new Date(Date.now() - 86400000).toISOString(), status: "COMPLETED" },
            ];
            setRides(mockRides);
        });
    }, []);

    return (
        <ScrollView style={styles.container}>
            <Title style={styles.title}>Ride History</Title>

            <View style={styles.statsRow}>
                <Card style={styles.statCard}>
                    <Card.Content>
                        <Title>{rides.length}</Title>
                        <Paragraph>Total Rides</Paragraph>
                    </Card.Content>
                </Card>
                <Card style={styles.statCard}>
                    <Card.Content>
                        <Title>{CurrencyFormatter.format(rides.reduce((acc, r) => acc + Number(r.fare), 0))}</Title>
                        <Paragraph>Total Spent</Paragraph>
                    </Card.Content>
                </Card>
            </View>

            <Divider style={styles.divider} />

            {rides.map((ride: Ride) => (
                <List.Item
                    key={ride.id}
                    title={`Ride to Destination`}
                    description={`${new Date(ride.createdAt).toLocaleDateString()} • ${CurrencyFormatter.format(ride.fare)}`}
                    left={props => <List.Icon {...props} icon="car-clock" />}
                    right={() => <Title style={styles.status}>{ride.status}</Title>}
                    style={styles.listItem}
                />
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
    statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    statCard: { width: "48%", backgroundColor: "#f8f9fa", elevation: 0, borderWidth: 1, borderColor: "#eee" },
    divider: { marginVertical: 10 },
    listItem: { borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
    status: { fontSize: 12, color: "#4caf50", marginTop: 15 }
});
