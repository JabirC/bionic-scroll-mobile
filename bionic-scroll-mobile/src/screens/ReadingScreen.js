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
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';

import TextRenderer from '../components/TextRenderer';
import { TextProcessor } from '../utils/textProcessor';
import { StorageManager } from '../utils/storageManager';
import { SettingsManager } from '../utils/settingsManager';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const ReadingScreen = ({ navigation, route }) => {
  const { book, bookData } = route.params;
  
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [isPageMode, setIsPageMode] = useState(false);
  const [showSectionCarousel, setShowSectionCarousel] = useState(false);
  const [settings, setSettings] = useState({
    isDarkMode: false,
    fontSize: 22,
    bionicMode: false,
  });

  const textProcessor = useRef(new TextProcessor()).current;
  const storageManager = useRef(new StorageManager()).current;
  const settingsManager = useRef(new SettingsManager()).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const carouselOpacity = useRef(new Animated.Value(0)).current;
  const lastScrollTime = useRef(Date.now());

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
      
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

  const loadSettings = async () => {
    const userSettings = await settingsManager.getSettings();
    setSettings(userSettings);
    
    const isPDF = book.type === 'application/pdf';
    setIsPageMode(isPDF || bookData.extractionFailed);
    
    if (isPDF && bookData.originalPages) {
      setSections(bookData.originalPages);
    } else if (sections.length > 0 && !isPDF) {
      textProcessor.setFontSize(userSettings.fontSize || 22);
      const rawSections = textProcessor.splitTextIntoScreenSections(bookData.text);
      const processedSections = rawSections.map(section => 
        textProcessor.processSection(section, userSettings.bionicMode || false)
      );
      setSections(processedSections);
    }
  };

  useEffect(() => {
    initializeSections();
  }, []);

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

  const initializeSections = async () => {
    const userSettings = await settingsManager.getSettings();
    setSettings(userSettings);

    const isPDF = book.type === 'application/pdf';
    setIsPageMode(isPDF || bookData.extractionFailed);

    if (isPDF) {
      if (bookData.originalPages && bookData.originalPages.length > 0) {
        setSections(bookData.originalPages);
      } else {
        Alert.alert('Error', 'Unable to display this PDF');
        navigation.goBack();
      }
      return;
    }

    if (!bookData.text) {
      Alert.alert('Error', 'No content available');
      navigation.goBack();
      return;
    }

    textProcessor.setFontSize(userSettings.fontSize || 22);
    const rawSections = textProcessor.splitTextIntoScreenSections(bookData.text);
    const processedSections = rawSections.map(section => 
      textProcessor.processSection(section, userSettings.bionicMode || false)
    );
    
    setSections(processedSections);
    
    if (book.readingPosition && book.readingPosition.sectionIndex) {
      setCurrentSectionIndex(book.readingPosition.sectionIndex);
    }
  };

  const toggleUI = () => {
    if (showSectionCarousel) {
      hideSectionCarousel();
      return;
    }

    setShowUI(!showUI);
    Animated.timing(uiOpacity, {
      toValue: showUI ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (!showUI) {
      showSectionCarouselWithDelay();
    }
  };

  const showSectionCarouselWithDelay = () => {
    setTimeout(() => {
      setShowSectionCarousel(true);
      Animated.timing(carouselOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 200);
  };

  const hideSectionCarousel = () => {
    Animated.timing(carouselOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowSectionCarousel(false);
    });
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
      tension: 150,
      friction: 8,
    }).start();
  };

  const navigateToSection = (newIndex, direction) => {
    setIsTransitioning(true);
    hideSectionCarousel();
    
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
    hideSectionCarousel();
    setShowUI(true);
    Animated.timing(uiOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const renderSectionCarousel = () => {
    if (!showSectionCarousel) return null;

    const renderSectionItem = ({ item, index }) => {
      const isCurrentSection = index === currentSectionIndex;
      const sectionContent = isPageMode 
        ? `Page ${index + 1}`
        : item.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';

      return (
        <TouchableOpacity
          style={[
            styles.sectionItem,
            settings.isDarkMode && styles.sectionItemDark,
            isCurrentSection && styles.sectionItemActive,
            isCurrentSection && settings.isDarkMode && styles.sectionItemActiveDark
          ]}
          onPress={() => jumpToSection(index)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.sectionNumber,
            settings.isDarkMode && styles.sectionNumberDark,
            isCurrentSection && styles.sectionNumberActive
          ]}>
            {index + 1}
          </Text>
          <Text 
            style={[
              styles.sectionPreview,
              settings.isDarkMode && styles.sectionPreviewDark,
              isCurrentSection && styles.sectionPreviewActive
            ]}
            numberOfLines={3}
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
          { opacity: carouselOpacity }
        ]}
      >
        <LinearGradient
          colors={settings.isDarkMode 
            ? ['transparent', 'rgba(15, 23, 42, 0.95)', 'rgba(15, 23, 42, 0.95)', 'transparent']
            : ['transparent', 'rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.95)', 'transparent']
          }
          style={styles.carouselGradient}
        >
          <View style={styles.carouselHeader}>
            <Text style={[styles.carouselTitle, settings.isDarkMode && styles.carouselTitleDark]}>
              {isPageMode ? 'Pages' : 'Sections'}
            </Text>
            <TouchableOpacity onPress={hideSectionCarousel} style={styles.carouselClose}>
              <Ionicons 
                name="close" 
                size={20} 
                color={settings.isDarkMode ? '#94a3b8' : '#6b7280'} 
              />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={sections}
            renderItem={renderSectionItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            initialScrollIndex={Math.max(0, currentSectionIndex - 1)}
            getItemLayout={(data, index) => ({
              length: 200,
              offset: 200 * index,
              index,
            })}
          />
        </LinearGradient>
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
              color={settings.isDarkMode ? '#f8fafc' : '#1f2937'} 
            />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      <TouchableWithoutFeedback onPress={toggleUI}>
        <View style={styles.contentWrapper}>
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleGestureStateChange}
            enabled={!showSectionCarousel}
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
    paddingHorizontal: 28,
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pageMessage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  pageMessageDark: {
    color: '#e5e7eb',
  },
  pageNote: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  pageNoteDark: {
    color: '#9ca3af',
  },
  pageCounter: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
  },
  pageCounterDark: {
    color: '#60a5fa',
  },
  sectionCounter: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  sectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  sectionTextDark: {
    color: '#94a3b8',
  },
  sectionCarouselContainer: {
    position: 'absolute',
    bottom: screenHeight * 0.25,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 999,
  },
  carouselGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  carouselTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  carouselTitleDark: {
    color: '#f1f5f9',
  },
  carouselClose: {
    padding: 4,
  },
  carouselContent: {
    paddingHorizontal: 8,
  },
  sectionItem: {
    width: 180,
    marginRight: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  sectionItemDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionItemActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  sectionItemActiveDark: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  sectionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 8,
  },
  sectionNumberDark: {
    color: '#60a5fa',
  },
  sectionNumberActive: {
    color: '#ffffff',
  },
  sectionPreview: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  sectionPreviewDark: {
    color: '#94a3b8',
  },
  sectionPreviewActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

export default ReadingScreen;