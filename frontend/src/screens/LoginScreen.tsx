import React, { useRef, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { TextInput, Button, Title, Text, Avatar, HelperText } from "react-native-paper";
import { auth, firebaseConfig } from "../utils/firebase";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import api from "../api/axios";
import { setAuthToken, setCurrentUser } from "../api/session";
import RecaptchaVerifier, { RecaptchaVerifierHandle } from "../components/RecaptchaVerifier";

const E164_PHONE = /^\+[1-9]\d{7,14}$/;

// Riders in India usually type a bare 10-digit mobile number (or 0- / 91-
// prefixed); turn those into +91 E.164 so Firebase accepts them.
function normalizeIndianNumber(input: string): string {
    const digits = input.replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) return digits;
    const bare = digits.replace(/^0+/, "");
    if (/^[6-9]\d{9}$/.test(bare)) return `+91${bare}`;
    if (/^91[6-9]\d{9}$/.test(bare)) return `+${bare}`;
    return digits;
}

export default function LoginScreen({ navigation }: any) {
    const recaptchaVerifier = useRef<RecaptchaVerifierHandle>(null);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [verificationId, setVerificationId] = useState("");
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const sendOtp = async () => {
        setError("");
        const normalized = normalizeIndianNumber(phoneNumber);
        if (!E164_PHONE.test(normalized)) {
            setError("Enter a valid mobile number, e.g. 98765 43210");
            return;
        }

        setIsLoading(true);
        try {
            const phoneProvider = new PhoneAuthProvider(auth);
            const id = await phoneProvider.verifyPhoneNumber(normalized, recaptchaVerifier.current as any);
            setVerificationId(id);
        } catch (err: any) {
            console.error("Send OTP failed:", err);
            setError(err?.message || "Couldn't send a verification code. Check the number and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async () => {
        setError("");
        setIsLoading(true);
        try {
            const credential = PhoneAuthProvider.credential(verificationId, code);
            const userCredential = await signInWithCredential(auth, credential);
            const idToken = await userCredential.user.getIdToken();

            const response = await api.post("/auth/verify-otp", { idToken });
            setAuthToken(response.data.token);
            setCurrentUser({
                id: response.data.user.id,
                role: response.data.user.role,
                displayName: response.data.user.displayName,
            });
            // The account's actual stored role is authoritative (an existing
            // account keeps its original role regardless of what this login
            // attempt requested).
            const destination = response.data.user?.role === "driver" ? "DriverHome" : "Home";
            navigation.navigate(destination, {
                isNewUser: response.data.isNewUser,
                currentUserId: response.data.user?.id,
            });
        } catch (err: any) {
            console.error("Verify OTP failed:", err);
            setError(err?.message || "That code didn't work. Check it and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <RecaptchaVerifier ref={recaptchaVerifier} firebaseConfig={firebaseConfig} />

            <View style={styles.brandingHeader}>
                <Avatar.Icon icon="infinity" size={80} style={{ backgroundColor: '#6200ee' }} />
                <Title style={styles.heroTitle}>VOLO</Title>
                <Text style={styles.heroSubtitle}>Billion-Scale Mobility. Infinite Reach.</Text>
            </View>

            <View style={styles.formContainer}>
                {!verificationId ? (
                    <>
                        <Text style={styles.label}>Enter your mobile number to begin your journey.</Text>
                        <Text style={styles.hint}>Want to drive? Sign up, then apply from the menu under "Become a Driver".</Text>
                        <TextInput
                            label="Phone Number"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                            mode="outlined"
                            style={styles.input}
                            outlineColor="#6200ee"
                            activeOutlineColor="#6200ee"
                            placeholder="+91 98765 43210"
                        />
                        {!!error && <HelperText type="error">{error}</HelperText>}
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
                        {!!error && <HelperText type="error">{error}</HelperText>}
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
                        <Button mode="text" onPress={() => { setVerificationId(""); setCode(""); setError(""); }} textColor="#6200ee">
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
    label: { fontSize: 16, color: "#444", marginBottom: 8, textAlign: "center" },
    hint: { fontSize: 13, color: "#777", marginBottom: 20, textAlign: "center" },
    input: { marginBottom: 20, backgroundColor: "#fff" },
    button: { borderRadius: 12, elevation: 8 },
    footerText: { fontSize: 12, color: "#aaa", textAlign: "center", marginBottom: 20 },
});
