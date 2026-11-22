import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput as RNTextInput } from 'react-native';
import { Button, Card, Title, Paragraph, List, RadioButton, Avatar, Text, TextInput } from "react-native-paper";
import * as WebBrowser from 'expo-web-browser';
import api from "../api/axios";
import { CurrencyFormatter } from "../utils/CurrencyFormatter";

export default function PaymentScreen({ route, navigation }: any) {
    const { amount, rideId } = route.params || { amount: 0, rideId: '' };
    const [method, setMethod] = useState('stripe');
    const [customApp, setCustomApp] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        setLoading(true);
        try {
            const finalProvider = method === 'other' ? customApp : method;
            const response = await api.post('/rides/pay', {
                rideId,
                amount,
                provider: finalProvider
            });

            if (response.data.checkoutUrl) {
                // Razorpay/PayPal: a hosted page, opened in the system
                // browser — no card details ever pass through this app.
                // Closing the browser is NOT proof of payment; only that
                // gateway's webhook (server-side) actually confirms it, so
                // this is deliberately phrased as "if", not "you paid".
                await WebBrowser.openBrowserAsync(response.data.checkoutUrl);
                alert("If you completed the payment, it'll be confirmed shortly.");
            } else if (response.data.message) {
                // Wallet: settled synchronously by the backend already.
                // Cash: just records intent — the driver still has to
                // confirm receipt before the ride actually counts as paid.
                alert(response.data.message);
            } else {
                alert(`Payment initiated via ${finalProvider.toUpperCase()}.`);
            }

            navigation.navigate("History");
        } catch (error: any) {
            alert(error?.response?.data?.message || "Payment failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.billCard}>
                <Card.Content>
                    <Paragraph style={{ color: '#eee' }}>Amount to settle</Paragraph>
                    <Title style={styles.amount}>{CurrencyFormatter.format(amount)}</Title>
                </Card.Content>
            </Card>

            <Title style={styles.sectionTitle}>Global Payment Hub</Title>

            <RadioButton.Group onValueChange={v => setMethod(v)} value={method}>
                <Card style={styles.optionCard}>
                    <List.Item
                        title="Volo Wallet (Elite Credits)"
                        description="Instant deduction from your credits"
                        left={p => <Avatar.Icon {...p} icon="wallet-membership" style={{ backgroundColor: "#EDE7F6" }} color="#673AB7" />}
                        right={() => <RadioButton value="wallet" />}
                    />
                </Card>

                <Card style={styles.optionCard}>
                    <List.Item
                        title="International Card / Stripe"
                        left={p => <Avatar.Icon {...p} icon="credit-card" style={{ backgroundColor: "#E8F5E9" }} color="#2E7D32" />}
                        right={() => <RadioButton value="stripe" />}
                    />
                </Card>

                <Card style={styles.optionCard}>
                    <List.Item
                        title="Local Support (UPI / Razorpay / GCash)"
                        left={p => <Avatar.Icon {...p} icon="cellphone-arrow-down" style={{ backgroundColor: "#E3F2FD" }} color="#1565C0" />}
                        right={() => <RadioButton value="razorpay" />}
                    />
                </Card>

                <Card style={styles.optionCard}>
                    <List.Item
                        title="Cash Payment"
                        left={p => <Avatar.Icon {...p} icon="cash-multiple" style={{ backgroundColor: "#FFF3E0" }} color="#E65100" />}
                        right={() => <RadioButton value="cash" />}
                    />
                </Card>

                <Card style={styles.optionCard}>
                    <List.Item
                        title="Other Local App"
                        left={p => <Avatar.Icon {...p} icon="apps" style={{ backgroundColor: "#F3E5F5" }} color="#7B1FA2" />}
                        right={() => <RadioButton value="other" />}
                    />
                    {method === 'other' && (
                        <TextInput
                            placeholder="Enter App Name (e.g. Venmo, Pix, GrabPay)"
                            value={customApp}
                            onChangeText={setCustomApp}
                            mode="flat"
                            style={{ margin: 10, backgroundColor: '#fff' }}
                        />
                    )}
                </Card>
            </RadioButton.Group>

            <Button
                mode="contained"
                onPress={handlePayment}
                loading={loading}
                style={styles.payBtn}
                disabled={method === 'other' && !customApp}
            >
                Proceed with {method === 'other' ? (customApp || 'App') : method.toUpperCase()}
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc', padding: 20 },
    billCard: { backgroundColor: '#1a1a1a', marginBottom: 25, borderRadius: 15 },
    amount: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
    sectionTitle: { fontSize: 18, marginBottom: 15, fontWeight: '900', color: '#333' },
    optionCard: { marginBottom: 10, borderRadius: 12, elevation: 0, borderWidth: 1, borderColor: '#eee' },
    payBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 8, backgroundColor: '#6200ee' }
});
