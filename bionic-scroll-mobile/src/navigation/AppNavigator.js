// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useColorScheme, StatusBar } from 'react-native';

import LibraryScreen from '../screens/LibraryScreen';
import ReadingScreen from '../screens/ReadingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SplashScreenComponent from '../components/SplashScreen';
import FloatingTabBar from '../components/FloatingTabBar';
import { SettingsManager } from '../utils/settingsManager';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MainTabs = () => {
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
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} isDarkMode={isDarkMode} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Library" 
        component={LibraryScreen}
      />
      <Tab.Screen 
        name="Settings" 
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
};

const LibraryStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="LibraryHome" 
      component={MainTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Reading" 
      component={ReadingScreen}
      options={{ 
        headerShown: false,
        presentation: 'fullScreenModal'
      }}
    />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <SplashScreenComponent />;
  }

  return (
    <NavigationContainer>
      <StatusBar 
        style="auto"
        backgroundColor="transparent"
        translucent
      />
      <LibraryStack />
    </NavigationContainer>
  );
};

export default AppNavigator;