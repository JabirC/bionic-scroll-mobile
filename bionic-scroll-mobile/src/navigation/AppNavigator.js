// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Animated, View } from 'react-native';

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
  const [splashFinished, setSplashFinished] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(1.1)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleSplashFinished = () => {
    // Smooth entrance animation for the main app
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSplashFinished(true);
    });
  };

  if (!isReady) {
    return null;
  }

  return (
    <SettingsProvider>
      <View style={{ flex: 1 }}>
        <Animated.View 
          style={{ 
            flex: 1, 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }}
        >
          <NavigationContainer>
            <StatusBar 
              backgroundColor="transparent"
              translucent
            />
            <LibraryStack />
          </NavigationContainer>
        </Animated.View>
        
        {!splashFinished && (
          <SplashScreenComponent onFinished={handleSplashFinished} />
        )}
      </View>
    </SettingsProvider>
  );
};

export default AppNavigator;