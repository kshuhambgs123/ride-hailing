import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Title, TextInput, Button, List, Card, Paragraph, FAB } from "react-native-paper";
import api from "../api/axios";

export default function HelpSupportScreen() {
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post("/platform/support/tickets", { subject, message });
            alert("Support ticket submitted! We will get back to you shortly.");
            setSubject("");
            setMessage("");
        } catch (error) {
            alert("Failed to submit ticket.");
        }
        setLoading(false);
    };

    return (
        <ScrollView style={styles.container}>
            <Title style={styles.title}>Help & Support</Title>

            <Card style={styles.card}>
                <Card.Content>
                    <Title style={styles.cardTitle}>Submit a Ticket</Title>
                    <TextInput
                        label="Subject"
                        value={subject}
                        onChangeText={setSubject}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Describe your issue"
                        value={message}
                        onChangeText={setMessage}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        style={styles.input}
                    />
                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.button}
                    >
                        Send Help Request
                    </Button>
                </Card.Content>
            </Card>

            <List.Section>
                <List.Subheader>Frequently Asked Questions</List.Subheader>
                <List.Accordion title="How to check my ride history?">
                    <List.Item title="Go to the History tab from the bottom menu." />
                </List.Accordion>
                <List.Accordion title="How to refer a friend?">
                    <List.Item title="Visit the Referral section on the Home screen to share your code." />
                </List.Accordion>
            </List.Section>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
    card: { marginBottom: 20, elevation: 2 },
    cardTitle: { fontSize: 18, marginBottom: 15 },
    input: { marginBottom: 10 },
    button: { marginTop: 10, paddingVertical: 5 },
});
