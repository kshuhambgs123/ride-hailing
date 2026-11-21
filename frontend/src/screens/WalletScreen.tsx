import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Text } from "react-native";
import { Button, Card, Title, Paragraph, List, Avatar, TextInput } from "react-native-paper";
import api from "../api/axios";
import { CurrencyFormatter } from "../utils/CurrencyFormatter";

export default function WalletScreen() {
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            const bRes = await api.get("/wallet/balance");
            setBalance(bRes.data.balance);

            const tRes = await api.get("/wallet/transactions");
            setTransactions(tRes.data);
        } catch (error) {
            console.error("Error fetching wallet data:", error);
        }
    };

    const handleAddMoney = async () => {
        if (!amount) return;
        setLoading(true);
        try {
            await api.post("/wallet/add", { amount: Number(amount), referenceId: `TOPUP_${Date.now()}` });
            setAmount("");
            alert("Money added to Volo Wallet successfully!");
            fetchWalletData();
        } catch (error) {
            alert("Top-up failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.balanceCard}>
                <Card.Content>
                    <Paragraph style={{ color: "#eee" }}>Volo Elite Balance</Paragraph>
                    <Title style={styles.balanceText}>{CurrencyFormatter.format(balance)}</Title>
                </Card.Content>
            </Card>

            <Card style={styles.actionCard}>
                <Card.Content>
                    <Title>Top Up Wallet</Title>
                    <TextInput
                        label="Amount"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        mode="outlined"
                        style={styles.input}
                    />
                    <Button
                        mode="contained"
                        onPress={handleAddMoney}
                        loading={loading}
                        style={styles.addButton}
                    >
                        Add Fast Credits
                    </Button>
                </Card.Content>
            </Card>

            <Title style={styles.sectionTitle}>Recent Ledger</Title>
            {transactions.map((item: any) => (
                <List.Item
                    key={item.id}
                    title={item.type.toUpperCase()}
                    description={new Date(item.createdAt).toLocaleDateString()}
                    left={p => <Avatar.Icon {...p} icon={item.type === 'credit' ? "arrow-up-circle" : "arrow-down-circle"} color={item.type === 'credit' ? "#4CAF50" : "#F44336"} style={{ backgroundColor: 'transparent' }} />}
                    right={() => <Text style={[styles.txAmount, { color: item.type === 'credit' ? "#4CAF50" : "#F44336" }]}>
                        {item.type === 'credit' ? '+' : '-'}{CurrencyFormatter.format(item.grossAmount)}
                    </Text>}
                />
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8f9fa", padding: 20 },
    balanceCard: { backgroundColor: "#1a1a1a", borderRadius: 15, padding: 10, marginBottom: 20 },
    balanceText: { fontSize: 36, color: "#fff", fontWeight: "bold" },
    actionCard: { borderRadius: 12, elevation: 2, marginBottom: 25 },
    input: { marginVertical: 15 },
    addButton: { borderRadius: 10, paddingVertical: 5, backgroundColor: "#6200ee" },
    sectionTitle: { fontSize: 18, fontWeight: "bold", marginVertical: 10 },
    txAmount: { fontSize: 16, fontWeight: "bold", alignSelf: "center" }
});
