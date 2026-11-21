import React from 'react';
import renderer, { act } from 'react-test-renderer';
import LoginScreen from '../src/screens/LoginScreen';
import { Provider as PaperProvider } from 'react-native-paper';

// Avoids pulling in the real `firebase` package, which ships ESM-only and
// isn't transformed by Jest — this is a render smoke test, not a Firebase
// integration test.
jest.mock('../src/utils/firebase', () => ({
    auth: {},
    firebaseConfig: { authDomain: 'example.firebaseapp.com' },
}));
jest.mock('react-native-webview', () => {
    const { forwardRef } = require('react');
    const { View } = require('react-native');
    return { WebView: forwardRef((props, ref) => <View ref={ref} />) };
});
jest.mock('firebase/auth', () => {
    const PhoneAuthProvider = jest.fn().mockImplementation(() => ({ verifyPhoneNumber: jest.fn() }));
    PhoneAuthProvider.credential = jest.fn();
    return { PhoneAuthProvider, signInWithCredential: jest.fn() };
});

describe('<LoginScreen />', () => {
    it('renders correctly', async () => {
        let component;
        // PaperProvider and the hidden recaptcha WebView mount async effects
        // (e.g. Appearance listeners) on the next tick — without wrapping
        // in act() and letting that tick flush, those commits land after
        // the test (and the Jest environment) has already torn down.
        await act(async () => {
            component = renderer.create(
                <PaperProvider>
                    <LoginScreen />
                </PaperProvider>
            );
        });
        expect(component.toJSON()).toBeDefined();
    });
});
