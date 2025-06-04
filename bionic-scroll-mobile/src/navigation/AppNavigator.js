// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';

import LibraryScreen from '../screens/LibraryScreen';
import ReadingScreen from '../screens/ReadingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SplashScreenComponent from '../components/SplashScreen';
import FloatingTabBar from '../components/FloatingTabBar';
import { SettingsProvider } from '../contexts/SettingsContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
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
    <SettingsProvider>
      <NavigationContainer>
        <StatusBar 
          backgroundColor="transparent"
          translucent
        />
        <LibraryStack />
      </NavigationContainer>
    </SettingsProvider>
  );
};

export default AppNavigator;