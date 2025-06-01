// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useColorScheme, StatusBar } from 'react-native';

import LibraryScreen from '../screens/LibraryScreen';
import ReadingScreen from '../screens/ReadingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FloatingTabBar from '../components/FloatingTabBar';
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

  return (
    <NavigationContainer>
      <StatusBar 
        style={isDarkMode ? 'light' : 'dark'}
        backgroundColor={isDarkMode ? '#0f172a' : '#ffffff'}
      />
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} isDarkMode={isDarkMode} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen 
          name="Library" 
          component={LibraryStack}
        />
        <Tab.Screen 
          name="Settings" 
          component={ProfileScreen}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;