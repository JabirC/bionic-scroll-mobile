// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import LibraryScreen from '../screens/LibraryScreen';
import ReadingScreen from '../screens/ReadingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { SettingsManager } from '../utils/settingsManager';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const LibraryStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="LibraryHome" 
      component={LibraryScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Reading" 
      component={ReadingScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = React.useState(systemColorScheme === 'dark');
  const settingsManager = new SettingsManager();

  React.useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const settings = await settingsManager.getSettings();
    setIsDarkMode(settings.isDarkMode);
  };

  const tabBarStyle = {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderTopColor: isDarkMode ? '#334155' : '#e5e7eb',
    borderTopWidth: 1,
    height: 90,
    paddingBottom: 30,
    paddingTop: 10,
  };

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            
            if (route.name === 'Library') {
              iconName = focused ? 'book' : 'book-outline';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'settings' : 'settings-outline';
            }
            
            return <Ionicons name={iconName} size={24} color={color} />;
          },
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: isDarkMode ? '#94a3b8' : '#6b7280',
          headerShown: false,
          tabBarStyle,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarItemStyle: {
            paddingVertical: 8,
          }
        })}
      >
        <Tab.Screen 
          name="Library" 
          component={LibraryStack}
          options={{ tabBarLabel: 'Library' }}
        />
        <Tab.Screen 
          name="Settings" 
          component={ProfileScreen}
          options={{ tabBarLabel: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;