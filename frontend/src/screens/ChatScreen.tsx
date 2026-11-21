import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, List, Avatar, Button, Text, Card, IconButton } from 'react-native-paper';
import io from 'socket.io-client';
import { BASE_URL as SOCKET_URL } from '../api/config';
import { getAuthToken } from '../api/session';

export default function ChatScreen({ route, navigation }: any) {
    const { rideId, partnerName, partnerId, currentUserId } = route.params || {};
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const socketRef = useRef<any>(null);
    const scrollViewRef = useRef<any>(null);

    useEffect(() => {
        socketRef.current = io(SOCKET_URL, { auth: { token: getAuthToken() } });

        socketRef.current.emit('join_ride_chat', rideId);

        socketRef.current.on('new_message', (msg: any) => {
            setMessages((prev) => [...prev, msg]);
            scrollViewRef.current?.scrollToEnd({ animated: true });
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, [rideId]);

    const sendMessage = () => {
        if (inputText.trim()) {
            // senderId is derived server-side from the authenticated socket,
            // not sent from here.
            const msgData = {
                rideId,
                receiverId: partnerId,
                content: inputText.trim(),
            };

            socketRef.current.emit('send_message', msgData);
            setInputText('');
        }
    };

    return (
        <View style={styles.container}>
            <Appbar.Header elevated>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title={partnerName} subtitle="Live Chat" />
            </Appbar.Header>

            <ScrollView
                ref={scrollViewRef}
                style={styles.chatArea}
                contentContainerStyle={{ padding: 15 }}
            >
                {messages.map((msg, index) => (
                    <View
                        key={index}
                        style={[
                            styles.messageBubble,
                            msg.senderId === currentUserId ? styles.myMessage : styles.partnerMessage
                        ]}
                    >
                        <Text style={styles.messageText}>{msg.content}</Text>
                    </View>
                ))}
            </ScrollView>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <Card style={styles.inputCard}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <IconButton
                            icon="send"
                            mode="contained"
                            containerColor="#6200ee"
                            iconColor="#fff"
                            size={24}
                            onPress={sendMessage}
                        />
                    </View>
                </Card>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    chatArea: { flex: 1 },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 10,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#6200ee',
    },
    partnerMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#e0e0e0',
    },
    messageText: {
        color: '#fff',
        fontSize: 16,
    },
    inputCard: {
        margin: 10,
        padding: 5,
        borderRadius: 30,
        elevation: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    input: {
        flex: 1,
        maxHeight: 100,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
    },
});
