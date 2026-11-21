import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Title, Avatar, List, Button, Card, Paragraph } from "react-native-paper";
import api from "../api/axios";

export default function ProfileScreen({ navigation }: any) {
    const [user, setUser] = useState<any>({ displayName: "User", phoneNumber: "...", walletBalance: 0, isKycVerified: false });

    useEffect(() => {
        api.get("/auth/me").then(res => setUser(res.data)).catch(() => {
            setUser({ displayName: "Shubham Kumar", phoneNumber: "+91 9876543210", walletBalance: 550, isKycVerified: true });
        });
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Avatar.Text size={80} label={user.displayName.substring(0, 2).toUpperCase()} />
                <Title style={styles.name}>{user.displayName}</Title>
                <Paragraph>{user.phoneNumber}</Paragraph>
            </View>

            <Card style={styles.walletCard}>
                <Card.Content>
                    <Paragraph>Wallet Balance</Paragraph>
                    <Title style={styles.balance}>₹{user.walletBalance}</Title>
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
