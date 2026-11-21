import React from 'react';
import renderer from 'react-test-renderer';
import LoginScreen from '../src/screens/LoginScreen';
import { Provider as PaperProvider } from 'react-native-paper';

describe('<LoginScreen />', () => {
    it('renders correctly', () => {
        const tree = renderer.create(
            <PaperProvider>
                <LoginScreen />
            </PaperProvider>
        ).toJSON();
        expect(tree).toBeDefined();
    });
});
