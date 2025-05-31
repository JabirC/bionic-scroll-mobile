// src/screens/ReadingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  const [showUI, setShowUI] = useState(true);

  const textProcessor = useRef(new TextProcessor()).current;
  const storageManager = useRef(new StorageManager()).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollTime = useRef(Date.now());

  // Hide navigation bar
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: 'none' }
      });
    }
    
    return () => {
      if (parent) {
        parent.setOptions({
          tabBarStyle: {
            backgroundColor: settings.isDarkMode ? '#1e293b' : '#ffffff',
            borderTopColor: settings.isDarkMode ? '#334155' : '#e5e7eb',
            borderTopWidth: 1,
            height: 90,
            paddingBottom: 30,
            paddingTop: 10,
          }
        });
      }
    };
  }, [navigation, settings.isDarkMode]);

  useEffect(() => {
    initializeSections();
  }, []);

  useEffect(() => {
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
    textProcessor.setFontSize(settings.fontSize || 22);
    const rawSections = textProcessor.splitTextIntoScreenSections(text);
    const processedSections = rawSections.map(section => 
      textProcessor.processSection(section, settings.bionicMode || false)
    );
    
    setSections(processedSections);
    
    if (book.readingPosition && book.readingPosition.sectionIndex) {
      setCurrentSectionIndex(book.readingPosition.sectionIndex);
    }
  };

  const toggleUI = () => {
    setShowUI(!showUI);
    Animated.timing(uiOpacity, {
      toValue: showUI ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
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
        resetTranslation();
        return;
      }
      lastScrollTime.current = now;

      if (isTransitioning) {
        resetTranslation();
        return;
      }

      const threshold = 100;
      const shouldNavigate = Math.abs(translationY) > threshold || Math.abs(velocityY) > 500;

      if (shouldNavigate) {
        if (translationY < 0 && currentSectionIndex < sections.length - 1) {
          navigateToSection(currentSectionIndex + 1, 'next');
          return;
        } else if (translationY > 0 && currentSectionIndex > 0) {
          navigateToSection(currentSectionIndex - 1, 'prev');
          return;
        }
      }

      resetTranslation();
    }
  };

  const resetTranslation = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const navigateToSection = (newIndex, direction) => {
    setIsTransitioning(true);
    
    const slideDistance = direction === 'next' ? -screenHeight : screenHeight;
    
    Animated.timing(translateY, {
      toValue: slideDistance,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSectionIndex(newIndex);
      translateY.setValue(direction === 'next' ? screenHeight : -screenHeight);
      
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
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
    <View style={[styles.container, settings.isDarkMode && styles.containerDark]}>
      {/* Progress Bar */}
      <Animated.View 
        style={[
          styles.progressBar, 
          settings.isDarkMode && styles.progressBarDark,
          { opacity: uiOpacity }
        ]}
      >
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </Animated.View>

      {/* Back Button */}
      <SafeAreaView edges={['top']} style={styles.backButtonContainer}>
        <Animated.View style={{ opacity: uiOpacity }}>
          <TouchableOpacity 
            style={[styles.backButton, settings.isDarkMode && styles.backButtonDark]}
            onPress={handleBackPress}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={settings.isDarkMode ? '#f8fafc' : '#1f2937'} 
            />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      {/* Main Content */}
      <TouchableWithoutFeedback onPress={toggleUI}>
        <View style={styles.contentWrapper}>
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
        </View>
      </TouchableWithoutFeedback>

      {/* Section Counter */}
      <SafeAreaView edges={['bottom']} style={styles.sectionCounterContainer}>
        <Text style={[
          styles.sectionText, 
          settings.isDarkMode && styles.sectionTextDark
        ]}>
          {showUI 
            ? `${currentSectionIndex + 1} of ${sections.length}`
            : `${currentSectionIndex + 1}`
          }
        </Text>
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
    marginTop: 16,
    marginLeft: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  backButtonDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  sectionCounterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    paddingBottom: 40,
  },
  sectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  sectionTextDark: {
    color: '#94a3b8',
  },
});

export default ReadingScreen;