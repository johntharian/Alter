import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { MainTabsParamList, ChatsStackParamList } from '../types';

// Main screens
import { ChatsScreen } from '../screens/main/ChatsScreen';
import { ChatViewScreen } from '../screens/main/ChatViewScreen';
import { ContactsScreen } from '../screens/main/ContactsScreen';
import { MyBotScreen } from '../screens/main/MyBotScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { BotInstructionsScreen } from '../screens/main/BotInstructionsScreen';
import { EditProfileScreen } from '../screens/main/EditProfileScreen';
// Reuse onboarding capabilities screen in main context
import { BotCapabilitiesScreen } from '../screens/onboarding/BotCapabilitiesScreen';

// ---------- Chats Stack (Chats → ChatView → Contacts) ----------

type FullChatsStackParamList = ChatsStackParamList & {
  BotInstructions: undefined;
  BotCapabilitiesMain: undefined;
};

const ChatsStack = createNativeStackNavigator<FullChatsStackParamList>();

function ChatsNavigator() {
  return (
    <ChatsStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <ChatsStack.Screen name="ChatsScreen" component={ChatsScreen} />
      <ChatsStack.Screen name="ChatView" component={ChatViewScreen} />
      <ChatsStack.Screen name="Contacts" component={ContactsScreen} />
    </ChatsStack.Navigator>
  );
}

// ---------- MyBot Stack (MyBot + related) ----------

type MyBotStackParamList = {
  MyBotHome: undefined;
  BotInstructions: undefined;
  Chats: undefined;
};

const MyBotStack = createNativeStackNavigator<MyBotStackParamList>();

function MyBotNavigator() {
  return (
    <MyBotStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <MyBotStack.Screen name="MyBotHome" component={MyBotScreen} />
      <MyBotStack.Screen name="BotInstructions" component={BotInstructionsScreen} />
    </MyBotStack.Navigator>
  );
}

// ---------- Settings Stack ----------

type SettingsStackParamList = {
  SettingsHome: undefined;
  BotInstructions: undefined;
  BotCapabilitiesMain: undefined;
  EditProfile: undefined;
};

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
      <SettingsStack.Screen name="BotInstructions" component={BotInstructionsScreen} />
      <SettingsStack.Screen name="BotCapabilitiesMain" component={BotCapabilitiesScreen} />
      <SettingsStack.Screen name="EditProfile" component={EditProfileScreen} />
    </SettingsStack.Navigator>
  );
}

// ---------- Bottom Tabs ----------

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bgCard,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 58,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'chatbubbles';

          if (route.name === 'Chats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'MyBot') {
            iconName = focused ? 'hardware-chip' : 'hardware-chip-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Chats"
        component={ChatsNavigator}
        options={{ tabBarLabel: 'Chats' }}
      />
      <Tab.Screen
        name="MyBot"
        component={MyBotNavigator}
        options={{ tabBarLabel: 'My Bot' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}
