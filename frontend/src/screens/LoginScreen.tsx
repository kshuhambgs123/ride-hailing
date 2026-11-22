import React, { useRef, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { TextInput, Button, Title, Text, Avatar, SegmentedButtons, HelperText } from "react-native-paper";
import { auth, firebaseConfig } from "../utils/firebase";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import api from "../api/axios";
import { setAuthToken } from "../api/session";
import RecaptchaVerifier, { RecaptchaVerifierHandle } from "../components/RecaptchaVerifier";

const E164_PHONE = /^\+[1-9]\d{7,14}$/;

export default function LoginScreen({ navigation }: any) {
    const recaptchaVerifier = useRef<RecaptchaVerifierHandle>(null);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [role, setRole] = useState<"user" | "driver">("user");
    const [verificationId, setVerificationId] = useState("");
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const sendOtp = async () => {
        setError("");
        if (!E164_PHONE.test(phoneNumber)) {
            setError("Enter your number in international format, e.g. +14155550123");
            return;
        }

        setIsLoading(true);
        try {
            const phoneProvider = new PhoneAuthProvider(auth);
            const id = await phoneProvider.verifyPhoneNumber(phoneNumber, recaptchaVerifier.current as any);
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

            const response = await api.post("/auth/verify-otp", { idToken, role });
            setAuthToken(response.data.token);
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
                        <SegmentedButtons
                            value={role}
                            onValueChange={(v) => setRole(v as "user" | "driver")}
                            style={styles.input}
                            buttons={[
                                { value: "user", label: "Rider" },
                                { value: "driver", label: "Driver" },
                            ]}
                        />
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
    label: { fontSize: 16, color: "#444", marginBottom: 20, textAlign: "center" },
    input: { marginBottom: 20, backgroundColor: "#fff" },
    button: { borderRadius: 12, elevation: 8 },
    footerText: { fontSize: 12, color: "#aaa", textAlign: "center", marginBottom: 20 },
});
