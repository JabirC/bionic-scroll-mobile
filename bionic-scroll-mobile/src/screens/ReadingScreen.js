// src/screens/ReadingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import TextRenderer from '../components/TextRenderer';
import { TextProcessor } from '../utils/textProcessor';
import { StorageManager } from '../utils/storageManager';

const { height: screenHeight } = Dimensions.get('window');

const ReadingScreen = ({ navigation, route }) => {
  const { book, text, settings } = route.params;
  
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const textProcessor = useRef(new TextProcessor()).current;
  const storageManager = useRef(new StorageManager()).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollTime = useRef(Date.now());

  useEffect(() => {
    initializeSections();
  }, []);

  useEffect(() => {
    // Update reading progress
    if (sections.length > 0) {
      const progress = ((currentSectionIndex + 1) / sections.length) * 100;
      storageManager.updateReadingProgress(book.id, {
        sectionIndex: currentSectionIndex,
        percentage: progress,
        lastRead: new Date().toISOString(),
      });
    }
  }, [currentSectionIndex, sections.length]);

  const initializeSections = () => {
    // Set font size based on settings
    textProcessor.setFontSize(settings.fontSize || 22);
    
    const rawSections = textProcessor.splitTextIntoScreenSections(text);
    const processedSections = rawSections.map(section => 
      textProcessor.processSection(section, settings.bionicMode || false)
    );
    
    setSections(processedSections);
    
    // Restore reading position if available
    if (book.readingPosition && book.readingPosition.sectionIndex) {
      setCurrentSectionIndex(book.readingPosition.sectionIndex);
    }
  };

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleGestureStateChange = ({ nativeEvent }) => {
    const { state, translationY, velocityY } = nativeEvent;
    
    if (state === State.END) {
      const now = Date.now();
      if (now - lastScrollTime.current < 200) {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        return;
      }
      lastScrollTime.current = now;

      if (isTransitioning) {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        return;
      }

      const threshold = 100;
      const shouldNavigate = Math.abs(translationY) > threshold || Math.abs(velocityY) > 500;

      if (shouldNavigate) {
        if (translationY < 0 && currentSectionIndex < sections.length - 1) {
          // Swipe up - next section
          navigateToSection(currentSectionIndex + 1, 'next');
          return;
        } else if (translationY > 0 && currentSectionIndex > 0) {
          // Swipe down - previous section
          navigateToSection(currentSectionIndex - 1, 'prev');
          return;
        }
      }

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const navigateToSection = (newIndex, direction) => {
    setIsTransitioning(true);
    
    const slideDistance = direction === 'next' ? -screenHeight : screenHeight;
    
    Animated.timing(translateY, {
      toValue: slideDistance,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSectionIndex(newIndex);
      translateY.setValue(direction === 'next' ? screenHeight : -screenHeight);
      
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const currentSection = sections[currentSectionIndex];
  const progress = sections.length > 0 ? ((currentSectionIndex + 1) / sections.length) * 100 : 0;

  return (
    <View 
      style={[
        styles.container,
        settings.isDarkMode && styles.containerDark
      ]}
    >
      <StatusBar 
        style={settings.isDarkMode ? 'light' : 'dark'}
        backgroundColor={settings.isDarkMode ? '#0f172a' : '#ffffff'}
        hidden={true}
      />

      {/* Progress Bar */}
      <View style={[styles.progressBar, settings.isDarkMode && styles.progressBarDark]}>
        <View 
          style={[styles.progressFill, { width: `${progress}%` }]} 
        />
      </View>

      {/* Back Button */}
      <SafeAreaView edges={['top']} style={styles.backButtonContainer}>
        <TouchableOpacity 
          style={[styles.backButton, settings.isDarkMode && styles.backButtonDark]}
          onPress={handleBackPress}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={settings.isDarkMode ? '#f3f4f6' : '#111827'} 
          />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Main Content */}
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleGestureStateChange}
      >
        <Animated.View 
          style={[
            styles.content,
            { transform: [{ translateY }] }
          ]}
        >
          {currentSection && (
            <TextRenderer
              section={currentSection}
              settings={settings}
              isDarkMode={settings.isDarkMode}
            />
          )}
        </Animated.View>
      </PanGestureHandler>

      {/* Section Counter */}
      <SafeAreaView edges={['bottom']} style={styles.sectionCounterContainer}>
        <View style={[styles.sectionCounter, settings.isDarkMode && styles.sectionCounterDark]}>
          <Text style={[styles.sectionText, settings.isDarkMode && styles.sectionTextDark]}>
            {currentSectionIndex + 1} / {sections.length}
          </Text>
        </View>
      </SafeAreaView>
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
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  progressBarDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
  },
  backButton: {
    marginTop: 20,
    marginLeft: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
  },
  content: {
    flex: 1,
    paddingTop: 120,
    paddingBottom: 120,
    paddingHorizontal: 24,
  },
  sectionCounterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  sectionCounter: {
    marginBottom: 20,
  },
  sectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTextDark: {
    color: '#e5e7eb',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
  },
});

export default ReadingScreen;