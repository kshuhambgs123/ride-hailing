import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import PaymentScreen from '../screens/PaymentScreen';
import AdminDashboard from '../screens/AdminDashboard';
import ReferralScreen from '../screens/ReferralScreen';
import LiveTrackingScreen from '../screens/LiveTrackingScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import OffersScreen from '../screens/OffersScreen';
import ChatScreen from '../screens/ChatScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import SOSScreen from '../screens/SOSScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import DriverVerificationScreen from '../screens/DriverVerificationScreen';
import DriverHomeScreen from '../screens/DriverHomeScreen';
import InvoiceScreen from '../screens/InvoiceScreen';
import WalletScreen from '../screens/WalletScreen';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton } from 'react-native-paper';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let iconName = 'home';
                    if (route.name === 'History') iconName = 'history';
                    else if (route.name === 'Profile') iconName = 'account';
                    else if (route.name === 'Offers') iconName = 'tag-multiple';
                    else if (route.name === 'Support') iconName = 'help-circle';
                    return <IconButton icon={iconName} size={size} iconColor={color} />;
                },
                tabBarActiveTintColor: '#6200ee',
                tabBarInactiveTintColor: 'gray',
                headerShown: true,
            })}
        >
            <Tab.Screen name="Rides" component={HomeScreen} options={{ title: "Book Ride" }} />
            <Tab.Screen name="Offers" component={OffersScreen} options={{ title: "Campaigns" }} />
            <Tab.Screen name="History" component={HistoryScreen} options={{ title: "My Trips" }} />
            <Tab.Screen name="Support" component={HelpSupportScreen} options={{ title: "Support" }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "My Profile" }} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
                <Stack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: "Driver" }} />
                <Stack.Screen name="Payment" component={PaymentScreen} />
                <Stack.Screen name="Admin" component={AdminDashboard} />
                <Stack.Screen name="Referral" component={ReferralScreen} />
                <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="Preferences" component={PreferencesScreen} />
                <Stack.Screen name="SOS" component={SOSScreen} />
                <Stack.Screen name="Achievements" component={AchievementsScreen} />
                <Stack.Screen name="DriverVerification" component={DriverVerificationScreen} />
                <Stack.Screen name="Invoice" component={InvoiceScreen} />
                <Stack.Screen name="Wallet" component={WalletScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
