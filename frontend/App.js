import React, { useEffect } from 'react';
import './src/i18n/i18n';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import api from './src/api/axios';

export default function App() {
  useEffect(() => {
    api.get('/health')
      .then(res => console.log("Backend Connected:", res.data))
      .catch(err => console.error("Backend Connection Failed:", err));
  }, []);

  return (
    <PaperProvider>
      <AppNavigator />
    </PaperProvider>
  );
}
