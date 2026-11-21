import React, { useState } from "react";
import { View, StyleSheet, ImageBackground, Dimensions } from "react-native";
import { TextInput, Button, Title, Text, Avatar } from "react-native-paper";
import { auth } from "../utils/firebase";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import api from "../api/axios";

export default function LoginScreen({ navigation }: any) {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [verificationId, setVerificationId] = useState("");
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const sendOtp = async () => {
        setIsLoading(true);
        console.log("Sending OTP to", phoneNumber);
        // Simulate network delay for elite feel
        setTimeout(() => {
            setVerificationId("mock-id");
            setIsLoading(false);
        }, 1500);
    };

    const verifyOtp = async () => {
        setIsLoading(true);
        try {
            const response = await api.post("/auth/verify-otp", {
                idToken: "mock-id-token",
                role: "user",
            });
            console.log("Login success:", response.data);
            navigation.navigate("Home", { isNewUser: response.data.isNewUser });
        } catch (error) {
            console.error("Login error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.brandingHeader}>
                <Avatar.Icon icon="infinity" size={80} style={{ backgroundColor: '#6200ee' }} />
                <Title style={styles.heroTitle}>VOLO</Title>
                <Text style={styles.heroSubtitle}>Billion-Scale Mobility. Infinite Reach.</Text>
            </View>

            <View style={styles.formContainer}>
                {!verificationId ? (
                    <>
                        <Text style={styles.label}>Enter your mobile number to begin your journey.</Text>
                        <TextInput
                            label="Phone Number"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                            mode="outlined"
                            style={styles.input}
                            outlineColor="#6200ee"
                            activeOutlineColor="#6200ee"
                            placeholder="+1 (555) 000-0000"
                        />
                        <Button
                            mode="contained"
                            onPress={sendOtp}
                            style={styles.button}
                            loading={isLoading}
                            disabled={isLoading || !phoneNumber}
                            contentStyle={{ height: 50 }}
                        >
                            Get Started
                        </Button>
                    </>
                ) : (
                    <>
                        <Text style={styles.label}>Verify your identity to unlock elite access.</Text>
                        <TextInput
                            label="6-Digit Code"
                            value={code}
                            onChangeText={setCode}
                            keyboardType="number-pad"
                            mode="outlined"
                            style={styles.input}
                            outlineColor="#6200ee"
                            activeOutlineColor="#6200ee"
                        />
                        <Button
                            mode="contained"
                            onPress={verifyOtp}
                            style={styles.button}
                            loading={isLoading}
                            disabled={isLoading || code.length < 4}
                            contentStyle={{ height: 50 }}
                        >
                            Verify & Enter
                        </Button>
                        <Button mode="text" onPress={() => setVerificationId("")} textColor="#6200ee">
                            Resend Code
                        </Button>
                    </>
                )}
            </View>
            <Text style={styles.footerText}>By continuing, you agree to Volo's Elite Terms of Service.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 30, justifyContent: "space-between", backgroundColor: "#fff" },
    brandingHeader: { alignItems: "center", marginTop: Dimensions.get("window").height * 0.1 },
    heroTitle: { fontSize: 48, fontWeight: "900", letterSpacing: 8, color: "#6200ee", marginTop: 10 },
    heroSubtitle: { fontSize: 14, color: "#666", fontWeight: "300", textAlign: "center" },
    formContainer: { width: "100%" },
    label: { fontSize: 16, color: "#444", marginBottom: 20, textAlign: "center" },
    input: { marginBottom: 20, backgroundColor: "#fff" },
    button: { borderRadius: 12, elevation: 8 },
    footerText: { fontSize: 12, color: "#aaa", textAlign: "center", marginBottom: 20 },
});
