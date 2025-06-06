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
  Alert,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import TextRenderer from '../components/TextRenderer';
import { StorageManager } from '../utils/storageManager';
import { SettingsManager } from '../utils/settingsManager';
import { bookProcessor } from '../utils/bookProcessor';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const ReadingScreen = ({ navigation, route }) => {
  const { book, bookData } = route.params;
  
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [isPageMode, setIsPageMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    isDarkMode: false,
    fontSize: 22,
    bionicMode: false,
  });

  const storageManager = useRef(new StorageManager()).current;
  const settingsManager = useRef(new SettingsManager()).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollTime = useRef(Date.now());
  const gestureStartPos = useRef({ x: 0, y: 0 });
  const isScrolling = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      loadAndProcessBook();
      
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          tabBarStyle: { display: 'none' }
        });
      }

      return () => {
        const parent = navigation.getParent();
        if (parent) {
          parent.setOptions({
            tabBarStyle: undefined
          });
        }
      };
    }, [navigation])
  );

  const loadAndProcessBook = async () => {
    try {
      setIsLoading(true);
      
      // Load settings
      const userSettings = await settingsManager.getSettings();
      setSettings(userSettings);

      // Process book with current settings
      const processed = await bookProcessor.processBook(book, bookData, userSettings);
      
      if (processed.error) {
        Alert.alert('Error', processed.error);
        navigation.goBack();
        return;
      }

      setSections(processed.sections);
      setIsPageMode(processed.isPageMode);
      
      // Restore reading position
      if (book.readingPosition && book.readingPosition.sectionIndex) {
        setCurrentSectionIndex(Math.min(book.readingPosition.sectionIndex, processed.sections.length - 1));
      }

    } catch (error) {
      console.error('Error loading book:', error);
      Alert.alert('Error', 'Failed to load book content');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sections.length > 0 && !isPageMode) {
      const progress = ((currentSectionIndex + 1) / sections.length) * 100;
      storageManager.updateReadingProgress(book.id, {
        sectionIndex: currentSectionIndex,
        percentage: progress,
        lastRead: new Date().toISOString(),
      });
    }
  }, [currentSectionIndex, sections.length]);

  const toggleUI = () => {
    const shouldShowUI = !showUI;
    setShowUI(shouldShowUI);
    
    Animated.timing(uiOpacity, {
      toValue: shouldShowUI ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideUI = () => {
    if (showUI) {
      setShowUI(false);
      
      Animated.timing(uiOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleGestureStateChange = ({ nativeEvent }) => {
    const { state, translationY, velocityY, x, y } = nativeEvent;
    
    if (state === State.BEGAN) {
      gestureStartPos.current = { x, y };
      isScrolling.current = false;
      const now = Date.now();
      lastScrollTime.current = now;
    }
    
    if (state === State.ACTIVE) {
      const deltaX = Math.abs(x - gestureStartPos.current.x);
      const deltaY = Math.abs(y - gestureStartPos.current.y);
      
      // Consider it scrolling if there's significant vertical movement
      if (deltaY > 10 || Math.abs(translationY) > 15) {
        isScrolling.current = true;
      }
    }
    
    if (state === State.END) {
      const now = Date.now();
      const timeDiff = now - lastScrollTime.current;
      const deltaX = Math.abs(x - gestureStartPos.current.x);
      const deltaY = Math.abs(y - gestureStartPos.current.y);
      
      // If it was a quick tap (not a scroll), ignore for navigation
      if (timeDiff < 150 && deltaY < 10 && Math.abs(translationY) < 20) {
        resetTranslation();
        return;
      }

      if (isTransitioning || !isScrolling.current) {
        resetTranslation();
        return;
      }

      const threshold = 80;
      const velocityThreshold = 400;
      const shouldNavigate = Math.abs(translationY) > threshold || Math.abs(velocityY) > velocityThreshold;

      if (shouldNavigate) {
        hideUI();
        
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
      tension: 150,
      friction: 8,
    }).start();
  };

  const navigateToSection = (newIndex, direction) => {
    setIsTransitioning(true);
    
    const slideDistance = direction === 'next' ? -screenHeight : screenHeight;
    
    Animated.timing(translateY, {
      toValue: slideDistance,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSectionIndex(newIndex);
      translateY.setValue(direction === 'next' ? screenHeight : -screenHeight);
      
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const jumpToSection = (index) => {
    setCurrentSectionIndex(index);
    setShowUI(false);
    
    Animated.timing(uiOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleContainerPress = () => {
    // Only toggle UI if we're not currently scrolling
    if (!isScrolling.current && !isLoading) {
      toggleUI();
    }
  };

  const renderSectionCarousel = () => {
    if (!showUI || isLoading) return null;

    const renderSectionItem = ({ item, index }) => {
      const isCurrentSection = index === currentSectionIndex;
      const sectionContent = isPageMode 
        ? `Page ${index + 1}`
        : item.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...';

      return (
        <TouchableOpacity
          style={[
            styles.pageItem,
            settings.isDarkMode && styles.pageItemDark,
            isCurrentSection && styles.pageItemActive,
            isCurrentSection && settings.isDarkMode && styles.pageItemActiveDark
          ]}
          onPress={() => jumpToSection(index)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.pageNumber,
            settings.isDarkMode && styles.pageNumberDark,
            isCurrentSection && styles.pageNumberActive,
            isCurrentSection && settings.isDarkMode && styles.pageNumberActiveDark
          ]}>
            {index + 1}
          </Text>
          <Text 
            style={[
              styles.pagePreview,
              settings.isDarkMode && styles.pagePreviewDark,
              isCurrentSection && styles.pagePreviewActive,
              isCurrentSection && settings.isDarkMode && styles.pagePreviewActiveDark
            ]}
            numberOfLines={4}
          >
            {sectionContent}
          </Text>
        </TouchableOpacity>
      );
    };

    return (
      <Animated.View 
        style={[
          styles.sectionCarouselContainer,
          { opacity: uiOpacity }
        ]}
      >
        <FlatList
          data={sections}
          renderItem={renderSectionItem}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          initialScrollIndex={Math.max(0, Math.min(currentSectionIndex, sections.length - 1))}
          getItemLayout={(data, index) => ({
            length: 130,
            offset: 130 * index,
            index,
          })}
        />
      </Animated.View>
    );
  };

  const renderPDFContent = (section) => {
    return (
      <View style={styles.pageContainer}>
        <Text style={[
          styles.pageMessage, 
          settings.isDarkMode && styles.pageMessageDark
        ]}>
          PDF Viewer
        </Text>
        <Text style={[
          styles.pageNote,
          settings.isDarkMode && styles.pageNoteDark
        ]}>
          Reading PDF in original format. Swipe up and down to navigate between pages.
        </Text>
        <Text style={[
          styles.pageCounter,
          settings.isDarkMode && styles.pageCounterDark
        ]}>
          Page {currentSectionIndex + 1} of {sections.length}
        </Text>
      </View>
    );
  };

  const renderLoadingScreen = () => (
    <View style={[styles.loadingContainer, settings.isDarkMode && styles.loadingContainerDark]}>
      <ActivityIndicator 
        size="large" 
        color={settings.isDarkMode ? '#ffffff' : '#000000'} 
      />
      <Text style={[styles.loadingText, settings.isDarkMode && styles.loadingTextDark]}>
        Preparing your book...
      </Text>
    </View>
  );

  if (isLoading) {
    return renderLoadingScreen();
  }

  const currentSection = sections[currentSectionIndex];
  const progress = sections.length > 0 ? ((currentSectionIndex + 1) / sections.length) * 100 : 0;

  return (
    <View style={[styles.container, settings.isDarkMode && styles.containerDark]}>
      <StatusBar hidden />
      
      <View style={[styles.progressBar, settings.isDarkMode && styles.progressBarDark]}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <SafeAreaView edges={['top']} style={styles.closeButtonContainer}>
        <Animated.View style={[styles.closeButtonWrapper, { opacity: uiOpacity }]}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleBackPress}
            activeOpacity={0.8}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons 
              name="close" 
              size={24} 
              color={settings.isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'} 
            />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      <TouchableWithoutFeedback onPress={handleContainerPress}>
        <View style={styles.contentWrapper}>
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleGestureStateChange}
            enabled={!showUI}
          >
            <Animated.View 
              style={[
                styles.content,
                { transform: [{ translateY }] }
              ]}
            >
              {currentSection && isPageMode && book.type === 'application/pdf' ? (
                renderPDFContent(currentSection)
              ) : currentSection && !isPageMode ? (
                <TextRenderer
                  section={currentSection}
                  settings={settings}
                  isDarkMode={settings.isDarkMode}
                />
              ) : currentSection ? (
                <View style={styles.pageContainer}>
                  <Text style={[
                    styles.pageMessage, 
                    settings.isDarkMode && styles.pageMessageDark
                  ]}>
                    Document Viewer
                  </Text>
                  <Text style={[
                    styles.pageNote,
                    settings.isDarkMode && styles.pageNoteDark
                  ]}>
                    This document is displayed in its original format.
                  </Text>
                  <Text style={[
                    styles.pageCounter,
                    settings.isDarkMode && styles.pageCounterDark
                  ]}>
                    Page {currentSectionIndex + 1} of {sections.length}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          </PanGestureHandler>
        </View>
      </TouchableWithoutFeedback>

      {renderSectionCarousel()}

      <SafeAreaView edges={['bottom']} style={styles.sectionCounterContainer}>
        <Animated.View style={[
          styles.sectionCounter,
          { opacity: uiOpacity }
        ]}>
          <Text style={[
            styles.sectionText, 
            settings.isDarkMode && styles.sectionTextDark
          ]}>
            {currentSectionIndex + 1} of {sections.length}
          </Text>
        </Animated.View>
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
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 40,
  },
  loadingContainerDark: {
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'System',
  },
  loadingTextDark: {
    color: '#9ca3af',
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
    backgroundColor: '#000000',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1000,
  },
  closeButtonWrapper: {
    paddingTop: 12,
    paddingRight: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 120,
    paddingHorizontal: 14,
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pageMessage: {
    fontSize: 24,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'System',
  },
  pageMessageDark: {
    color: '#ffffff',
  },
  pageNote: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: 'System',
  },
  pageNoteDark: {
    color: '#9ca3af',
  },
  pageCounter: {
    fontSize: 18,
    fontWeight: '400',
    color: '#000000',
    fontFamily: 'System',
  },
  pageCounterDark: {
    color: '#ffffff',
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
    paddingBottom: 5,
  },
  sectionText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
    fontFamily: 'System',
  },
  sectionTextDark: {
    color: '#9ca3af',
  },
  sectionCarouselContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 999,
    paddingVertical: 16,
  },
  carouselContent: {
    paddingHorizontal: 12,
  },
  pageItem: {
    width: 110,
    height: 160,
    marginRight: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    justifyContent: 'space-between',
  },
  pageItemDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333333',
  },
  pageItemActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  pageItemActiveDark: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  pageNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    fontFamily: 'System',
  },
  pageNumberDark: {
    color: '#ffffff',
  },
  pageNumberActive: {
    color: '#ffffff',
  },
  pageNumberActiveDark: {
    color: '#000000',
  },
  pagePreview: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 14,
    fontFamily: 'System',
  },
  pagePreviewDark: {
    color: '#9ca3af',
  },
  pagePreviewActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  pagePreviewActiveDark: {
    color: 'rgba(0, 0, 0, 0.7)',
  },
});

export default ReadingScreen;