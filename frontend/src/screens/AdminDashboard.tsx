import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Title, Card, Paragraph, DataTable } from "react-native-paper";
import api from "../api/axios";
import { CurrencyFormatter } from "../utils/CurrencyFormatter";

export default function AdminDashboard() {
    const [stats, setStats] = useState({ totalUsers: 0, totalRides: 0, platformEarnings: 0 });

    useEffect(() => {
        api.get("/platform/stats").then(res => setStats(res.data));
    }, []);

    return (
        <ScrollView style={styles.container}>
            <Title style={styles.title}>Admin Dashboard</Title>

            <View style={styles.statsContainer}>
                <Card style={styles.card}>
                    <Card.Content>
                        <Title>{stats.totalUsers}</Title>
                        <Paragraph>Total Users</Paragraph>
                    </Card.Content>
                </Card>
                <Card style={styles.card}>
                    <Card.Content>
                        <Title>{stats.totalRides}</Title>
                        <Paragraph>Total Rides</Paragraph>
                    </Card.Content>
                </Card>
                <Card style={styles.card}>
                    <Card.Content>
                        <Title>{CurrencyFormatter.format(stats.platformEarnings)}</Title>
                        <Paragraph>Platform Earnings</Paragraph>
                    </Card.Content>
                </Card>
            </View>

            <Title style={styles.subtitle}>Recent Activity</Title>
            <DataTable>
                <DataTable.Header>
                    <DataTable.Title>Ride ID</DataTable.Title>
                    <DataTable.Title numeric>Fare</DataTable.Title>
                    <DataTable.Title>Status</DataTable.Title>
                </DataTable.Header>

                <DataTable.Row>
                    <DataTable.Cell>#12345</DataTable.Cell>
                    <DataTable.Cell numeric>{CurrencyFormatter.format(450)}</DataTable.Cell>
                    <DataTable.Cell>Completed</DataTable.Cell>
                </DataTable.Row>
            </DataTable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f0f2f5", padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
    subtitle: { fontSize: 20, marginTop: 30, marginBottom: 10 },
    statsContainer: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
    card: { width: "30%", marginBottom: 10, backgroundColor: "#fff" },
});
