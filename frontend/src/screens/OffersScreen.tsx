import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import { Title, Card, Paragraph, Button, Badge } from "react-native-paper";
import { CurrencyFormatter } from "../utils/CurrencyFormatter";

export default function OffersScreen() {
    const offers = [
        { id: "1", title: "New Year Sale!", description: "Get 20% OFF on your next 5 rides.", code: "NEW2026", color: "#6200ee" },
        { id: "2", title: "Refer & Earn", description: `Invite friends and get ${CurrencyFormatter.format(50)} credit instantly.`, code: "REFER50", color: "#03dac6" },
        { id: "3", title: "Weekend Getaway", description: `Flat ${CurrencyFormatter.format(100)} OFF on Intercity rides.`, code: "WKND100", color: "#cf6679" },
    ];

    return (
        <ScrollView style={styles.container}>
            <Title style={styles.title}>Active Campaigns</Title>

            {offers.map(offer => (
                <Card key={offer.id} style={[styles.card, { borderColor: offer.color, borderLeftWidth: 5 }]}>
                    <Card.Content>
                        <View style={styles.header}>
                            <Title style={styles.offerTitle}>{offer.title}</Title>
                            <Badge style={{ backgroundColor: offer.color }}>ACTIVE</Badge>
                        </View>
                        <Paragraph style={styles.description}>{offer.description}</Paragraph>
                        <View style={styles.footer}>
                            <Title style={styles.code}>{offer.code}</Title>
                            <Button mode="text" onPress={() => alert("Code Copied!")}>Copy Code</Button>
                        </View>
                    </Card.Content>
                </Card>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8f9fa", padding: 15 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
    card: { marginBottom: 15, backgroundColor: "#fff", elevation: 4 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    offerTitle: { fontSize: 18, fontWeight: "bold" },
    description: { marginVertical: 10, color: "#666" },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 10 },
    code: { fontSize: 20, fontWeight: "bold", color: "#333", letterSpacing: 2 },
});
