import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { Title, Text, Button, Card, Avatar, IconButton, TextInput, List } from 'react-native-paper';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import api from '../api/axios';

// 112 reaches emergency services in India and the EU, and most GSM phones
// redirect it to the local number elsewhere. Make this per-operator once
// operators outside those regions are onboarded.
const EMERGENCY_NUMBER = '112';

type Contact = { id: string; name: string; phoneNumber: string };

export default function SOSScreen({ navigation, route }: any) {
    const rideId = route?.params?.rideId;
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    const loadContacts = useCallback(async () => {
        try {
            const res = await api.get('/platform/emergency-contacts');
            setContacts(res.data);
        } catch {
            // Contacts failing to load must not block calling emergency services.
        }
    }, []);

    useEffect(() => { loadContacts(); }, [loadContacts]);

    const addContact = async () => {
        if (!name.trim() || !phone.trim()) return;
        try {
            await api.post('/platform/emergency-contacts', { name: name.trim(), phoneNumber: phone.trim() });
            setName('');
            setPhone('');
            loadContacts();
        } catch {
            Alert.alert('Error', "Couldn't save that contact. Try again.");
        }
    };

    const removeContact = async (id: string) => {
        try {
            await api.delete(`/platform/emergency-contacts/${id}`);
            loadContacts();
        } catch {
            Alert.alert('Error', "Couldn't remove that contact.");
        }
    };

    const callEmergency = () => Linking.openURL(`tel:${EMERGENCY_NUMBER}`);

    const triggerSOS = async () => {
        setSending(true);
        setStatus('Getting your location…');

        let coords: { latitude: number; longitude: number } | null = null;
        try {
            const { status: perm } = await Location.requestForegroundPermissionsAsync();
            if (perm === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                coords = loc.coords;
            }
        } catch {
            // Fall through: the alert still goes out, just without a map link.
        }

        // Best-effort server record. Deliberately not awaited before the SMS
        // step — a slow or failed request must not delay the alert itself.
        api.post('/platform/sos', { lat: coords?.latitude, lng: coords?.longitude, rideId }).catch(() => { });

        const numbers = contacts.map((c) => c.phoneNumber);
        if (numbers.length === 0) {
            setSending(false);
            setStatus('No emergency contacts saved. Call emergency services below.');
            return;
        }

        const where = coords
            ? `My location: https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
            : 'I could not share my location.';
        const message = `EMERGENCY: I need help. ${where}${rideId ? ` (Ride ${rideId})` : ''}`;

        try {
            if (!(await SMS.isAvailableAsync())) {
                setStatus("This device can't send SMS. Call emergency services below.");
                return;
            }
            const { result } = await SMS.sendSMSAsync(numbers, message);
            // The OS composer tells us whether the user actually hit send;
            // only claim the alert went out when it did.
            setStatus(
                result === 'sent' ? `Alert sent to ${numbers.length} contact(s).`
                    : result === 'cancelled' ? 'Alert was not sent. Hold the button again, or call emergency services.'
                        : 'Your SMS app opened with the alert. Make sure it was sent.'
            );
        } catch {
            setStatus("Couldn't open your SMS app. Call emergency services below.");
        } finally {
            setSending(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Title style={styles.title}>Emergency SOS</Title>

            <Card style={styles.infoCard}>
                <Card.Content>
                    <Text style={styles.infoText}>
                        Hold the button for 2 seconds to text your emergency contacts your live location.
                        If you are in danger, call emergency services directly.
                    </Text>
                </Card.Content>
            </Card>

            <TouchableOpacity
                style={[styles.sosButton, sending && styles.sosButtonActive]}
                onLongPress={triggerSOS}
                delayLongPress={2000}
                disabled={sending}
            >
                <Avatar.Icon size={120} icon="alert-octagon" style={{ backgroundColor: sending ? "#ff1744" : "#ff5252" }} />
                <Title style={styles.btnText}>{sending ? "SENDING…" : "HOLD FOR 2S"}</Title>
            </TouchableOpacity>

            {status && <Text style={styles.status}>{status}</Text>}

            <Button
                mode="contained"
                icon="phone"
                buttonColor="#b71c1c"
                style={styles.callBtn}
                contentStyle={{ height: 52 }}
                onPress={callEmergency}
            >
                Call emergency services ({EMERGENCY_NUMBER})
            </Button>

            <Card style={styles.contactsCard}>
                <Card.Title title="Emergency contacts" subtitle={contacts.length ? undefined : "Add at least one so SOS can alert someone"} />
                <Card.Content>
                    {contacts.map((c) => (
                        <List.Item
                            key={c.id}
                            title={c.name}
                            description={c.phoneNumber}
                            right={() => <IconButton icon="delete" onPress={() => removeContact(c.id)} />}
                        />
                    ))}
                    <TextInput label="Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
                    <TextInput label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" mode="outlined" style={styles.input} />
                    <Button mode="outlined" onPress={addContact} disabled={!name.trim() || !phone.trim()}>Add contact</Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#fff', alignItems: 'center', padding: 20, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: 'bold', marginVertical: 20 },
    infoCard: { backgroundColor: '#fff8f8', marginBottom: 30, width: '100%' },
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
    sosButtonActive: { backgroundColor: '#ffcdd2', transform: [{ scale: 1.05 }] },
    btnText: { marginTop: 10, color: '#b71c1c' },
    status: { marginTop: 20, fontSize: 16, textAlign: 'center', color: '#333' },
    callBtn: { marginTop: 24, width: '100%', borderRadius: 12 },
    contactsCard: { marginTop: 30, width: '100%' },
    input: { marginBottom: 10, backgroundColor: '#fff' },
});
