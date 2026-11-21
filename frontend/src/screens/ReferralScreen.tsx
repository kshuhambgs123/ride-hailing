import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Title, Text, Button, Card, Avatar } from "react-native-paper";
import api from "../api/axios";
import { CurrencyFormatter } from "../utils/CurrencyFormatter";

export default function ReferralScreen() {
    const [referralCode, setReferralCode] = useState("LOADING...");

    useEffect(() => {
        api.post("/platform/referral").then(res => setReferralCode(res.data.referralCode));
    }, []);

    return (
        <View style={styles.container}>
            <Title style={styles.title}>Refer & Earn</Title>
            <Avatar.Icon size={120} icon="gift-outline" style={styles.icon} />
            <Text style={styles.description}>
                Share your code and get {CurrencyFormatter.format(50)} for every friend who joins!
            </Text>

            <Card style={styles.codeCard}>
                <Card.Content>
                    <Text style={styles.codeLabel}>YOUR UNIQUE CODE</Text>
                    <Title style={styles.code}>{referralCode}</Title>
                </Card.Content>
            </Card>

            <Button mode="contained" onPress={() => { }} style={styles.button}>
                Invite Friends
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 30, alignItems: "center", backgroundColor: "#f5f5f5" },
    title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#6200ee" },
    icon: { backgroundColor: "#fff", marginBottom: 30 },
    description: { textAlign: "center", fontSize: 16, marginBottom: 40, color: "#666" },
    codeCard: { width: "100%", paddingVertical: 20, alignItems: "center", borderRadius: 15 },
    codeLabel: { fontSize: 12, color: "#999", textAlign: "center" },
    code: { fontSize: 32, fontWeight: "bold", textAlign: "center", letterSpacing: 5 },
    button: { marginTop: 40, width: "100%", paddingVertical: 8 },
});
