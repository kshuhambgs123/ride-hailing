import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Title, Avatar, List, Button, Card, Paragraph } from "react-native-paper";
import api from "../api/axios";
import { CurrencyFormatter } from "../utils/CurrencyFormatter";

export default function ProfileScreen({ navigation }: any) {
    const [user, setUser] = useState<any>({ displayName: "", phoneNumber: "...", walletBalance: 0, isKycVerified: false });

    useEffect(() => {
        // No fake fallback profile on failure: showing someone else's name
        // or a "Verified" badge the user doesn't have is worse than a blank.
        api.get("/auth/me").then(res => setUser(res.data)).catch(() => {
            setUser((prev: any) => ({ ...prev, phoneNumber: "Couldn't load your profile" }));
        });
    }, []);

    // New accounts have no displayName (signup only collects a phone number).
    const name = user.displayName || "Rider";

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Avatar.Text size={80} label={name.substring(0, 2).toUpperCase()} />
                <Title style={styles.name}>{name}</Title>
                <Paragraph>{user.phoneNumber}</Paragraph>
            </View>

            <Card style={styles.walletCard}>
                <Card.Content>
                    <Paragraph>Wallet Balance</Paragraph>
                    <Title style={styles.balance}>{CurrencyFormatter.format(user.walletBalance)}</Title>
                    <Button mode="outlined" style={styles.addButton}>Add Money</Button>
                </Card.Content>
            </Card>

            <List.Section style={styles.list}>
                <List.Item
                    title="KYC Verification"
                    description={user.isKycVerified ? "Verified" : "Pending"}
                    left={props => <List.Icon {...props} icon="shield-check" color={user.isKycVerified ? "#4caf50" : "#ff9800"} />}
                />
                <List.Item
                    title="Payment Methods"
                    left={props => <List.Icon {...props} icon="credit-card" />}
                    onPress={() => { }}
                />
                <List.Item
                    title="Settings"
                    left={props => <List.Icon {...props} icon="cog" />}
                    onPress={() => { }}
                />
            </List.Section>

            <Button mode="contained" onPress={() => navigation.navigate("Login")} style={styles.logout}>
                Logout
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: { alignItems: "center", paddingVertical: 40, backgroundColor: "#f8f9fa" },
    name: { marginTop: 10, fontWeight: "bold" },
    walletCard: { margin: 20, padding: 10 },
    balance: { fontSize: 32, fontWeight: "bold", color: "#6200ee" },
    addButton: { marginTop: 10 },
    list: { paddingHorizontal: 10 },
    logout: { margin: 20, backgroundColor: "#ff5252" }
});
