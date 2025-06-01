// src/components/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const systemColorScheme = useColorScheme();
  const isDarkMode = systemColorScheme === 'dark';
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <LinearGradient
        colors={isDarkMode 
          ? ['#0f172a', '#1e293b', '#334155']
          : ['#ffffff', '#f8fafc', '#e2e8f0']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ]
            }
          ]}
        >
          <View style={[styles.logoIcon, isDarkMode && styles.logoIconDark]}>
            <Text style={[styles.logoSymbol, isDarkMode && styles.logoSymbolDark]}>
              R
            </Text>
          </View>
          
          <Text style={[styles.appName, isDarkMode && styles.appNameDark]}>
            Read Faster
          </Text>
          
          <Text style={[styles.tagline, isDarkMode && styles.taglineDark]}>
            Your books, reimagined
          </Text>
        </Animated.View>
        
        <View style={styles.bottomContainer}>
          <View style={[styles.loadingDots, isDarkMode && styles.loadingDotsDark]}>
            <Animated.View style={[
              styles.dot,
              isDarkMode && styles.dotDark,
              { opacity: fadeAnim }
            ]} />
            <Animated.View style={[
              styles.dot,
              isDarkMode && styles.dotDark,
              { 
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]} />
            <Animated.View style={[
              styles.dot,
              isDarkMode && styles.dotDark,
              { opacity: fadeAnim }
            ]} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: height * 0.1,
  },
  logoIcon: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  logoIconDark: {
    backgroundColor: '#1d4ed8',
    shadowColor: '#1d4ed8',
  },
  logoSymbol: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -2,
  },
  logoSymbolDark: {
    color: '#f8fafc',
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 50,
    letterSpacing: -1,
    marginBottom: 12,
  },
  appNameDark: {
    color: '#f8fafc',
  },
  tagline: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  taglineDark: {
    color: '#94a3b8',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingDotsDark: {},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
  },
  dotDark: {
    backgroundColor: '#64748b',
  },
});

export default SplashScreen;