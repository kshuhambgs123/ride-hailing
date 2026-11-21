import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Animated } from 'react-native';
import { TextInput, Button, Title, Card, Text, HelperText, Avatar, IconButton, ProgressBar } from 'react-native-paper';
import api from '../api/axios';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../api/config';

export default function DriverVerificationScreen({ navigation }: any) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        licenseNumber: '',
        licenseCountry: '',
        licenseExpiry: '',
        vehicleModel: '',
        vehiclePlateNumber: '',
        vehicleYear: '',
        insurancePolicyNumber: '',
        insuranceExpiry: '',
        isCriminalRecordChecked: false,
        frontIdUrl: '',
        backIdUrl: '',
        selfieUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    const pickImage = async (field: string) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri, field);
        }
    };

    const uploadImage = async (uri: string, field: string) => {
        setUploadingField(field);
        try {
            const formDataUpload = new FormData();
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            const type = match ? `image/${match[1]}` : `image`;

            formDataUpload.append('idProof', { uri, name: filename, type } as any);

            const response = await api.post('/upload/id-proof', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setFormData({ ...formData, [field]: response.data.imageUrl });
        } catch (error) {
            console.error(error);
            alert("Upload failed.");
        } finally {
            setUploadingField(null);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/auth/driver-verification', formData);
            alert("Volo Elite Application Submitted! We are auditing your profile now.");
            navigation.goBack();
        } catch (error) {
            alert("Submission failed. Ensure all EBV requirements are met.");
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <View>
                        <Title style={styles.wizardTitle}>Step 1: Identity Vault</Title>
                        <Paragraph style={styles.wizardDesc}>Securely upload your government-issued credentials.</Paragraph>

                        <View style={styles.uploadGrid}>
                            <View style={styles.uploadBox}>
                                <Title style={styles.boxTitle}>Front ID</Title>
                                {formData.frontIdUrl ? <Avatar.Image source={{ uri: `${API_URL}${formData.frontIdUrl}` }} size={80} /> : <Avatar.Icon icon="card-account-mail" size={80} style={{ backgroundColor: '#2a2a2a' }} />}
                                <Button mode="contained" onPress={() => pickImage('frontIdUrl')} loading={uploadingField === 'frontIdUrl'} style={styles.uploadBtn}>Upload</Button>
                            </View>
                            <View style={styles.uploadBox}>
                                <Title style={styles.boxTitle}>Back ID</Title>
                                {formData.backIdUrl ? <Avatar.Image source={{ uri: `${API_URL}${formData.backIdUrl}` }} size={80} /> : <Avatar.Icon icon="card-account-mail-outline" size={80} style={{ backgroundColor: '#2a2a2a' }} />}
                                <Button mode="contained" onPress={() => pickImage('backIdUrl')} loading={uploadingField === 'backIdUrl'} style={styles.uploadBtn}>Upload</Button>
                            </View>
                        </View>
                        <View style={[styles.uploadBox, { width: '100%', marginTop: 15 }]}>
                            <Title style={styles.boxTitle}>Liveness Selfie</Title>
                            {formData.selfieUrl ? <Avatar.Image source={{ uri: `${API_URL}${formData.selfieUrl}` }} size={80} /> : <Avatar.Icon icon="face-recognition" size={80} style={{ backgroundColor: '#2a2a2a' }} />}
                            <Button mode="contained" onPress={() => pickImage('selfieUrl')} loading={uploadingField === 'selfieUrl'} style={styles.uploadBtn}>Capture</Button>
                        </View>
                    </View>
                );
            case 2:
                return (
                    <View>
                        <Title style={styles.wizardTitle}>Step 2: License Mastery</Title>
                        <Paragraph style={styles.wizardDesc}>Let's verify your international driving eligibility.</Paragraph>
                        <TextInput label="License Number" value={formData.licenseNumber} onChangeText={v => setFormData({ ...formData, licenseNumber: v })} mode="outlined" style={styles.input} />
                        <TextInput label="Country (ISO Code)" value={formData.licenseCountry} onChangeText={v => setFormData({ ...formData, licenseCountry: v })} mode="outlined" style={styles.input} />
                        <TextInput label="Expiry (YYYY-MM-DD)" value={formData.licenseExpiry} onChangeText={v => setFormData({ ...formData, licenseExpiry: v })} mode="outlined" style={styles.input} />
                    </View>
                );
            case 3:
                return (
                    <View>
                        <Title style={styles.wizardTitle}>Step 3: Fleet Registry</Title>
                        <Paragraph style={styles.wizardDesc}>Registry details for your elite vehicle.</Paragraph>
                        <TextInput label="Model" value={formData.vehicleModel} onChangeText={v => setFormData({ ...formData, vehicleModel: v })} mode="outlined" style={styles.input} />
                        <TextInput label="Plate Number" value={formData.vehiclePlateNumber} onChangeText={v => setFormData({ ...formData, vehiclePlateNumber: v })} mode="outlined" style={styles.input} />
                        <TextInput label="Year" value={formData.vehicleYear} onChangeText={v => setFormData({ ...formData, vehicleYear: v })} mode="outlined" keyboardType="numeric" style={styles.input} />
                    </View>
                );
            case 4:
                return (
                    <View>
                        <Title style={styles.wizardTitle}>Step 4: EBV Protocol</Title>
                        <Paragraph style={styles.wizardDesc}>Final safety and insurance validation.</Paragraph>
                        <TextInput label="Insurance Policy #" value={formData.insurancePolicyNumber} onChangeText={v => setFormData({ ...formData, insurancePolicyNumber: v })} mode="outlined" style={styles.input} />
                        <TextInput label="Policy Expiry" value={formData.insuranceExpiry} onChangeText={v => setFormData({ ...formData, insuranceExpiry: v })} mode="outlined" style={styles.input} />

                        <View style={styles.ebvCheck}>
                            <Title style={{ fontSize: 16, color: '#fff', flex: 1 }}>Criminal Background Clear</Title>
                            <IconButton
                                icon={formData.isCriminalRecordChecked ? "check-decagram" : "checkbox-blank-circle-outline"}
                                iconColor={formData.isCriminalRecordChecked ? "#4CAF50" : "#aaa"}
                                size={30}
                                onPress={() => setFormData({ ...formData, isCriminalRecordChecked: !formData.isCriminalRecordChecked })}
                            />
                        </View>
                        <HelperText type="info" style={{ color: '#aaa' }}>Volo Sentinel will perform an independent audit.</HelperText>
                    </View>
                );
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <IconButton icon="arrow-left" iconColor="#fff" onPress={() => navigation.goBack()} />
                <Title style={{ color: '#fff' }}>Elite Driver Wizard</Title>
                <View style={{ width: 40 }} />
            </View>

            <ProgressBar progress={step / 4} color="#FFD700" style={styles.progress} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Card style={styles.card}>
                    <Card.Content>
                        {renderContentWithAnimation(renderStepContent())}
                    </Card.Content>
                </Card>
            </ScrollView>

            <View style={styles.footer}>
                {step > 1 && (
                    <Button mode="outlined" onPress={() => setStep(step - 1)} style={styles.navBtn}>Back</Button>
                )}
                {step < 4 ? (
                    <Button mode="contained" onPress={() => setStep(step + 1)} style={[styles.navBtn, { flex: 1, marginLeft: step > 1 ? 10 : 0 }]}>Continue</Button>
                ) : (
                    <Button mode="contained" onPress={handleSubmit} loading={loading} buttonColor="#FFD700" textColor="#000" style={[styles.navBtn, { flex: 1, marginLeft: 10 }]}>Activate Elite Profile</Button>
                )}
            </View>
        </View>
    );
}

const renderContentWithAnimation = (content: any) => {
    return <Animated.View style={{ opacity: 1 }}>{content}</Animated.View>;
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 40, paddingHorizontal: 10, backgroundColor: '#1a1a1a' },
    progress: { height: 6 },
    scrollContent: { padding: 20 },
    card: { backgroundColor: '#1a1a1a', borderRadius: 20, elevation: 10, paddingVertical: 10 },
    wizardTitle: { fontSize: 22, color: '#FFD700', fontWeight: 'bold' },
    wizardDesc: { color: '#aaa', marginBottom: 20 },
    input: { marginBottom: 15, backgroundColor: '#2a2a2a' },
    uploadGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    uploadBox: { width: '48%', backgroundColor: '#2a2a2a', borderRadius: 15, padding: 15, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#444' },
    boxTitle: { fontSize: 14, color: '#fff', marginBottom: 10 },
    uploadBtn: { marginTop: 10, width: '100%', borderRadius: 8 },
    ebvCheck: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', padding: 10, borderRadius: 10, marginTop: 10 },
    footer: { flexDirection: 'row', padding: 20, backgroundColor: '#1a1a1a' },
    navBtn: { borderRadius: 10 }
});
