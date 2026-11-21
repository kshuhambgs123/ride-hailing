import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Title, Switch, List, Button, Card, Paragraph, SegmentedButtons } from "react-native-paper";
import api from "../api/axios";
import i18n from "../i18n/i18n";

export default function PreferencesScreen({ navigation }: any) {
    const [prefs, setPrefs] = useState({
        prefMusic: false,
        prefSmoking: false,
        prefPets: false,
        prefLadiesOnly: false,
        prefChattiness: 2
    });

    useEffect(() => {
        api.get("/auth/me").then(res => setPrefs(res.data)).catch(() => { });
    }, []);

    const savePrefs = async () => {
        try {
            await api.post("/auth/update-profile", prefs);
            alert("Preferences saved!");
            navigation.goBack();
        } catch (error) {
            alert("Failed to save preferences.");
        }
    };

    const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

    return (
        <ScrollView style={styles.container}>
            <Title style={styles.title}>Travel Preferences</Title>
            <Paragraph style={styles.subtitle}>Customize your ride experience to match your comfort level.</Paragraph>

            <List.Section>
                <List.Item
                    title="Music Allowed"
                    description="Enjoy tunes during the ride"
                    right={() => <Switch value={prefs.prefMusic} onValueChange={() => toggle('prefMusic')} />}
                    left={props => <List.Icon {...props} icon="music" />}
                />
                <List.Item
                    title="Smoking Allowed"
                    right={() => <Switch value={prefs.prefSmoking} onValueChange={() => toggle('prefSmoking')} />}
                    left={props => <List.Icon {...props} icon="smoking" />}
                />
                <List.Item
                    title="Pets Allowed"
                    right={() => <Switch value={prefs.prefPets} onValueChange={() => toggle('prefPets')} />}
                    left={props => <List.Icon {...props} icon="dog" />}
                />
                <List.Item
                    title="Ladies Only"
                    description="Visible only to female travelers"
                    right={() => <Switch value={prefs.prefLadiesOnly} onValueChange={() => toggle('prefLadiesOnly')} />}
                    left={props => <List.Icon {...props} icon="human-female" />}
                />
            </List.Section>

            <View style={styles.section}>
                <Title style={styles.sectionTitle}>Chattiness Level</Title>
                <SegmentedButtons
                    value={prefs.prefChattiness.toString()}
                    onValueChange={v => setPrefs(p => ({ ...p, prefChattiness: parseInt(v) }))}
                    buttons={[
                        { value: '1', label: 'Volo (Quiet)' },
                        { value: '2', label: 'VoloVolo (Normal)' },
                        { value: '3', label: 'VoloVoloVolo (Chatty)' },
                    ]}
                />
            </View>

            <View style={styles.section}>
                <Title style={styles.sectionTitle}>App Language</Title>
                <SegmentedButtons
                    value={i18n.language}
                    onValueChange={lang => i18n.changeLanguage(lang)}
                    buttons={[
                        { value: 'en', label: 'English' },
                        { value: 'hi', label: 'हिंदी' },
                        { value: 'es', label: 'Español' },
                        { value: 'fr', label: 'Français' },
                    ]}
                />
            </View>

            <Button mode="contained" onPress={savePrefs} style={styles.saveBtn}>
                Save Preferences
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", padding: 20 },
    title: { fontSize: 24, fontWeight: "bold" },
    subtitle: { color: "#666", marginBottom: 20 },
    section: { marginVertical: 20 },
    sectionTitle: { fontSize: 18, marginBottom: 15 },
    saveBtn: { marginTop: 30, paddingVertical: 8 }
});
