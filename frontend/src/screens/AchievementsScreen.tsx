import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Title, Card, Text, Avatar, List, Banner, ProgressBar, Paragraph } from 'react-native-paper';
import api from '../api/axios';
import { CurrencyFormatter } from '../utils/CurrencyFormatter';

export default function AchievementsScreen() {
    const [stats, setStats] = useState({ co2Saved: 0, moneySaved: 0, totalKm: 0 });
    const [badges, setBadges] = useState<any[]>([]);

    useEffect(() => {
        // api.get('/gamification/stats').then(res => setStats(res.data));
        // api.get('/gamification/badges').then(res => setBadges(res.data));
    }, []);

    return (
        <ScrollView style={styles.container}>
            <Title style={styles.title}>My Impact</Title>

            <View style={styles.statsRow}>
                <Card style={styles.statCard}>
                    <Card.Content style={styles.center}>
                        <Avatar.Icon size={40} icon="leaf" style={{ backgroundColor: "#4caf50" }} />
                        <Title>{stats.co2Saved.toFixed(1)}kg</Title>
                        <Text>CO2 Saved</Text>
                    </Card.Content>
                </Card>

                <Card style={styles.statCard}>
                    <Card.Content style={styles.center}>
                        <Avatar.Icon size={40} icon="cash-check" style={{ backgroundColor: "#ff9800" }} />
                        <Title>{CurrencyFormatter.format(stats.moneySaved)}</Title>
                        <Text>Money Saved</Text>
                    </Card.Content>
                </Card>
            </View>

            <Title style={styles.sectionTitle}>Century Traveler Progress</Title>
            <View style={styles.progressContainer}>
                <ProgressBar progress={stats.totalKm / 100} color="#6200ee" style={styles.progressBar} />
                <Paragraph>{stats.totalKm} / 100 km to next badge</Paragraph>
            </View>

            <Title style={styles.sectionTitle}>My Badges</Title>
            <View style={styles.badgeGrid}>
                {badges.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <Card.Content>
                            <Text style={styles.emptyText}>Start riding to earn your first badge!</Text>
                        </Card.Content>
                    </Card>
                ) : (
                    badges.map((badge, idx) => (
                        <View key={idx} style={styles.badgeItem}>
                            <Avatar.Image size={80} source={{ uri: badge.iconUrl }} />
                            <Text style={styles.badgeName}>{badge.name}</Text>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    statCard: { width: '48%', elevation: 2 },
    center: { alignItems: 'center' },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 15 },
    progressContainer: { marginBottom: 30 },
    progressBar: { height: 10, borderRadius: 5, marginBottom: 10 },
    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    badgeItem: { width: '30%', alignItems: 'center', marginBottom: 20 },
    badgeName: { fontSize: 12, marginTop: 5, textAlign: 'center' },
    emptyCard: { width: '100%', padding: 20, backgroundColor: '#eee' },
    emptyText: { textAlign: 'center', color: '#666' }
});
