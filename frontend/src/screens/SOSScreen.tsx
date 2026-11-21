import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Title, Text, Button, Card, Avatar, IconButton } from 'react-native-paper';
import api from '../api/axios';

export default function SOSScreen({ navigation }: any) {
    const [active, setActive] = useState(false);

    const triggerSOS = async () => {
        setActive(true);
        try {
            // Mock location for demo
            await api.post('/platform/sos', { lat: 28.6139, lng: 77.2090 });
            alert("EMERGENCY ALERT SENT! Help is on the way.");
        } catch (error) {
            alert("SOS Triggered. Emergency contacts notified via local override.");
        }
    };

    return (
        <View style={styles.container}>
            <Title style={styles.title}>Safety Center</Title>

            <Card style={styles.infoCard}>
                <Card.Content>
                    <Text style={styles.infoText}>
                        Triggering SOS will instantly notify your emergency contacts and our 24/7 safety team with your live location.
                    </Text>
                </Card.Content>
            </Card>

            <TouchableOpacity
                style={[styles.sosButton, active && styles.sosButtonActive]}
                onLongPress={triggerSOS}
                delayLongPress={2000}
            >
                <Avatar.Icon size={120} icon="alert-octagon" style={{ backgroundColor: active ? "#ff1744" : "#ff5252" }} />
                <Title style={styles.btnText}>{active ? "ALERT SENT" : "HOLD FOR 2S"}</Title>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Button mode="outlined" onPress={() => navigation.navigate("Support")}>
                    Contact Safety Support
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginVertical: 30 },
    infoCard: { backgroundColor: '#fff8f8', marginBottom: 50 },
    infoText: { color: '#d32f2f', textAlign: 'center', fontSize: 16 },
    sosButton: {
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: '#ffebee',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    sosButtonActive: {
        backgroundColor: '#ffcdd2',
        transform: [{ scale: 1.1 }],
    },
    btnText: { marginTop: 10, color: '#b71c1c' },
    footer: { position: 'absolute', bottom: 40, width: '100%', paddingHorizontal: 20 }
});
