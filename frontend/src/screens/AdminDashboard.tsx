import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Title, Card, Paragraph, Button, TextInput, Text } from "react-native-paper";
import api from "../api/axios";
import { CurrencyFormatter } from "../utils/CurrencyFormatter";

type Application = {
    id: string;
    licenseNumber: string;
    licenseCountry: string;
    licenseExpiry: string;
    vehicleModel: string;
    vehiclePlateNumber: string;
    vehicleYear: number;
    frontIdUrl?: string;
    backIdUrl?: string;
    selfieUrl?: string;
    createdAt: string;
    user: { id: string; phoneNumber: string; displayName?: string };
};

export default function AdminDashboard() {
    const [stats, setStats] = useState({ totalUsers: 0, totalRides: 0, platformEarnings: 0 });
    const [applications, setApplications] = useState<Application[]>([]);
    const [forbidden, setForbidden] = useState(false);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [reason, setReason] = useState("");

    const loadApplications = useCallback(async () => {
        try {
            const res = await api.get("/admin/driver-applications?status=pending");
            setApplications(res.data);
        } catch (error: any) {
            if (error?.response?.status === 403) setForbidden(true);
        }
    }, []);

    useEffect(() => {
        api.get("/platform/stats").then(res => setStats(res.data)).catch(() => { });
        loadApplications();
    }, [loadApplications]);

    const approve = async (id: string) => {
        try {
            const res = await api.post(`/admin/driver-applications/${id}/approve`);
            Alert.alert("Approved", res.data.message);
            loadApplications();
        } catch (error: any) {
            Alert.alert("Error", error?.response?.data?.message || "Couldn't approve this application.");
        }
    };

    const reject = async (id: string) => {
        try {
            await api.post(`/admin/driver-applications/${id}/reject`, { reason });
            setRejectingId(null);
            setReason("");
            loadApplications();
        } catch (error: any) {
            Alert.alert("Error", error?.response?.data?.message || "Couldn't reject this application.");
        }
    };

    if (forbidden) {
        return (
            <View style={[styles.container, { justifyContent: "center" }]}>
                <Title>Admin access required</Title>
                <Paragraph>This account isn't an admin for this operator.</Paragraph>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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

            <Title style={styles.subtitle}>Driver applications ({applications.length})</Title>
            {applications.length === 0 && <Paragraph>No applications waiting for review.</Paragraph>}
            {applications.map((a) => {
                const docs = [a.frontIdUrl, a.backIdUrl, a.selfieUrl].filter(Boolean).length;
                return (
                    <Card key={a.id} style={styles.appCard}>
                        <Card.Title
                            title={a.user.displayName || a.user.phoneNumber}
                            subtitle={`Applied ${new Date(a.createdAt).toLocaleDateString()}`}
                        />
                        <Card.Content>
                            <Text>Licence: {a.licenseNumber} ({a.licenseCountry}), expires {new Date(a.licenseExpiry).toLocaleDateString()}</Text>
                            <Text>Vehicle: {a.vehicleYear} {a.vehicleModel}, plate {a.vehiclePlateNumber}</Text>
                            <Text style={docs === 0 ? styles.warn : undefined}>
                                ID documents uploaded: {docs} of 3{docs === 0 ? " — don't approve without ID" : ""}
                            </Text>
                            {rejectingId === a.id && (
                                <TextInput
                                    label="Reason for rejection"
                                    value={reason}
                                    onChangeText={setReason}
                                    mode="outlined"
                                    style={{ marginTop: 10, backgroundColor: "#fff" }}
                                />
                            )}
                        </Card.Content>
                        <Card.Actions>
                            {rejectingId === a.id ? (
                                <>
                                    <Button onPress={() => { setRejectingId(null); setReason(""); }}>Cancel</Button>
                                    <Button mode="contained" buttonColor="#d32f2f" disabled={!reason.trim()} onPress={() => reject(a.id)}>
                                        Confirm reject
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button onPress={() => setRejectingId(a.id)}>Reject</Button>
                                    <Button mode="contained" onPress={() => approve(a.id)}>Approve</Button>
                                </>
                            )}
                        </Card.Actions>
                    </Card>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f0f2f5", padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
    subtitle: { fontSize: 20, marginTop: 30, marginBottom: 10 },
    statsContainer: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
    card: { width: "30%", marginBottom: 10, backgroundColor: "#fff" },
    appCard: { marginBottom: 12, backgroundColor: "#fff" },
    warn: { color: "#c62828" },
});
