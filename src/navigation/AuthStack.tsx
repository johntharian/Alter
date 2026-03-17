import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { PhoneEntryScreen } from '../screens/onboarding/PhoneEntryScreen';
import { OTPVerifyScreen } from '../screens/onboarding/OTPVerifyScreen';
import { ProfileSetupScreen } from '../screens/onboarding/ProfileSetupScreen';
import { BotChoiceScreen } from '../screens/onboarding/BotChoiceScreen';
import { BotCapabilitiesScreen } from '../screens/onboarding/BotCapabilitiesScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="BotChoice" component={BotChoiceScreen} />
      <Stack.Screen name="BotCapabilities" component={BotCapabilitiesScreen} />
    </Stack.Navigator>
  );
}
