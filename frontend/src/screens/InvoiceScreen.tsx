import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Title, Card, Text, Divider, Button, List, Avatar, Paragraph } from 'react-native-paper';
import api from '../api/axios';
import { CurrencyFormatter } from '../utils/CurrencyFormatter';

export default function InvoiceScreen({ route, navigation }: any) {
    const { rideId } = route.params || { rideId: '' };
    const [invoice, setInvoice] = useState<any>(null);

    useEffect(() => {
        // api.get(`/rides/${rideId}/invoice`).then(res => setInvoice(res.data));
        // Mock data for demo
        setInvoice({
            invoiceNumber: "INV-8B2F9A1C",
            date: "2026-02-02",
            rideDetails: { from: "Central Park", to: "Empire State", distance: "5.2 km" },
            financials: { baseFare: 15.00, tax: 0.75, serviceFee: 1.50, total: 17.25, currency: "INR" }
        });
    }, [rideId]);

    if (!invoice) return null;

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.invoiceCard}>
                <Card.Content>
                    <View style={styles.header}>
                        <Title>INVOICE</Title>
                        <Text style={styles.invNumber}>{invoice.invoiceNumber}</Text>
                    </View>
                    <Text style={styles.date}>{invoice.date}</Text>

                    <Divider style={styles.divider} />

                    <Title style={styles.sectionTitle}>Trip Details</Title>
                    <List.Item
                        title={invoice.rideDetails.from}
                        description="Pickup"
                        left={props => <List.Icon {...props} icon="map-marker" color="#4caf50" />}
                    />
                    <List.Item
                        title={invoice.rideDetails.to}
                        description="Dropoff"
                        left={props => <List.Icon {...props} icon="map-marker-check" color="#f44336" />}
                    />

                    <Divider style={styles.divider} />

                    <Title style={styles.sectionTitle}>Fare Breakdown</Title>
                    <View style={styles.row}>
                        <Text>Base Fare</Text>
                        <Text>{CurrencyFormatter.format(invoice.financials.baseFare)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text>Tax (GST/VAT)</Text>
                        <Text>{CurrencyFormatter.format(invoice.financials.tax)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text>Service Fee</Text>
                        <Text>{CurrencyFormatter.format(invoice.financials.serviceFee)}</Text>
                    </View>

                    <Divider style={styles.divider} />

                    <View style={styles.totalRow}>
                        <Title>Total Paid</Title>
                        <Title style={styles.totalAmount}>{CurrencyFormatter.format(invoice.financials.total)}</Title>
                    </View>
                </Card.Content>
            </Card>

            <Button
                mode="contained"
                icon="download"
                onPress={() => alert("Downloading PDF...")}
                style={styles.downloadBtn}
            >
                Download Receipt
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
    invoiceCard: { elevation: 4, borderRadius: 12, paddingVertical: 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    invNumber: { color: '#6200ee', fontWeight: 'bold' },
    date: { color: '#777', fontSize: 12, marginTop: 5 },
    divider: { marginVertical: 15 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    totalAmount: { color: '#6200ee' },
    downloadBtn: { marginTop: 30, borderRadius: 8, paddingVertical: 8 }
});
