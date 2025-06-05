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
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

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
    const newShowUI = !showUI;
    setShowUI(newShowUI);
    setShowSectionCarousel(newShowUI);
    
    Animated.parallel([
      Animated.timing(uiOpacity, {
        toValue: newShowUI ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(carouselOpacity, {
        toValue: newShowUI ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const hideSectionCarousel = () => {
    Animated.parallel([
      Animated.timing(uiOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(carouselOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowSectionCarousel(false);
      setShowUI(true);
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
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    hideSectionCarousel();
    
    // Instant transition with no flashing
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 50,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSectionIndex(newIndex);
      
      // Reset gesture
      translateY.setValue(0);
      
      // Fade back in immediately
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const jumpToSection = (index) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 50,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSectionIndex(index);
      hideSectionCarousel();
      
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
      });
    });
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
        : item.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...';

      return (
        <TouchableOpacity
          style={[
            styles.pageItem,
            settings.isDarkMode && styles.pageItemDark,
            isCurrentSection && styles.pageItemActive,
          ]}
          onPress={() => jumpToSection(index)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={isCurrentSection 
              ? ['#3b82f6', '#1d4ed8'] 
              : settings.isDarkMode 
                ? ['#2a2a2a', '#1a1a1a']
                : ['#f8fafc', '#f1f5f9']
            }
            style={[
              styles.pageItemGradient,
              isCurrentSection && styles.pageItemGradientActive
            ]}
          >
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
            <View style={styles.pageNumberContainer}>
              <Text style={[
                styles.pageNumber,
                settings.isDarkMode && styles.pageNumberDark,
                isCurrentSection && styles.pageNumberActive,
                isCurrentSection && settings.isDarkMode && styles.pageNumberActiveDark
              ]}>
                {index + 1}
              </Text>
            </View>
          </LinearGradient>
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
        <View style={[
          styles.carouselHeader,
          settings.isDarkMode && styles.carouselHeaderDark
        ]}>
          <Text style={[
            styles.carouselTitle,
            settings.isDarkMode && styles.carouselTitleDark
          ]}>
            Navigate Sections
          </Text>
        </View>
        <FlatList
          data={sections}
          renderItem={renderSectionItem}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          initialScrollIndex={Math.max(0, Math.min(currentSectionIndex, sections.length - 1))}
          getItemLayout={(data, index) => ({
            length: 140,
            offset: 150 * index,
            index,
          })}
        />
      </Animated.View>
    );
  };

  const renderPDFContent = (section) => {
    return (
      <View style={styles.pageContainer}>
        <View style={[
          styles.pdfIconContainer,
          settings.isDarkMode && styles.pdfIconContainerDark
        ]}>
          <Ionicons
            name="document-text"
            size={64}
            color={settings.isDarkMode ? '#4f46e5' : '#6366f1'}
          />
        </View>
        
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
        
        <View style={[
          styles.pageCounterContainer,
          settings.isDarkMode && styles.pageCounterContainerDark
        ]}>
          <Text style={[
            styles.pageCounter,
            settings.isDarkMode && styles.pageCounterDark
          ]}>
            Page {currentSectionIndex + 1} of {sections.length}
          </Text>
        </View>
      </View>
    );
  };

  const currentSection = sections[currentSectionIndex];
  const progress = sections.length > 0 ? ((currentSectionIndex + 1) / sections.length) * 100 : 0;

  return (
    <View style={[styles.container, settings.isDarkMode && styles.containerDark]}>
      <StatusBar hidden />
      
      {/* Enhanced Progress Bar */}
      <LinearGradient
        colors={['#3b82f6', '#1d4ed8']}
        style={[styles.progressBar, { width: `${progress}%` }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      <View style={[styles.progressBarBackground, settings.isDarkMode && styles.progressBarBackgroundDark]} />

      <SafeAreaView edges={['top']} style={styles.closeButtonContainer}>
        <Animated.View style={[styles.closeButtonWrapper, { opacity: uiOpacity }]}>
          <TouchableOpacity 
            style={[
              styles.closeButton,
              settings.isDarkMode && styles.closeButtonDark
            ]}
            onPress={handleBackPress}
            activeOpacity={0.8}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons 
              name="close" 
              size={24} 
              color={settings.isDarkMode ? '#f1f5f9' : '#1f2937'} 
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
                { 
                  transform: [{ translateY }],
                  opacity: contentOpacity
                }
              ]}
            >
              {currentSection && isPageMode && book.type === 'application/pdf' ? (
                renderPDFContent(currentSection)
              ) : currentSection && !isPageMode ? (
                <TextRenderer
                  section={currentSection}
                  settings={settings}
                  isDarkMode={settings.isDarkMode}
                  key={`section-${currentSectionIndex}`}
                />
              ) : currentSection ? (
                <View style={styles.pageContainer}>
                  <View style={[
                    styles.pdfIconContainer,
                    settings.isDarkMode && styles.pdfIconContainerDark
                  ]}>
                    <Ionicons
                      name="document"
                      size={64}
                      color={settings.isDarkMode ? '#4f46e5' : '#6366f1'}
                    />
                  </View>
                  
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
                  
                  <View style={[
                    styles.pageCounterContainer,
                    settings.isDarkMode && styles.pageCounterContainerDark
                  ]}>
                    <Text style={[
                      styles.pageCounter,
                      settings.isDarkMode && styles.pageCounterDark
                    ]}>
                      Page {currentSectionIndex + 1} of {sections.length}
                    </Text>
                  </View>
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
          settings.isDarkMode && styles.sectionCounterDark,
          { opacity: uiOpacity }
        ]}>
          <Text style={[
            styles.sectionText, 
            settings.isDarkMode && styles.sectionTextDark
          ]}>
            {showUI ? `${currentSectionIndex + 1} of ${sections.length}` : `${currentSectionIndex + 1}`}
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
    backgroundColor: '#0f0f0f',
  },
  
  // Enhanced Progress Bar
  progressBarBackground: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  progressBarBackgroundDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    height: 3,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
  },
  
  // Enhanced Close Button
  closeButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1000,
  },
  closeButtonWrapper: {
    paddingTop: 12,
    paddingRight: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  
  // Enhanced PDF/Document Container
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pdfIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  pdfIconContainerDark: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
  },
  pageMessage: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'System',
  },
  pageMessageDark: {
    color: '#f9fafb',
  },
  pageNote: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: 'System',
  },
  pageNoteDark: {
    color: '#9ca3af',
  },
  pageCounterContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  pageCounterContainerDark: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
  },
  pageCounter: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3b82f6',
    fontFamily: 'System',
  },
  pageCounterDark: {
    color: '#a78bfa',
  },
  
  // Enhanced Section Counter
  sectionCounterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  sectionCounter: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    marginBottom: 15,
  },
  sectionCounterDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  sectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    fontFamily: 'System',
  },
  sectionTextDark: {
    color: '#d1d5db',
  },
  
  // Enhanced Section Carousel
  sectionCarouselContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    height: 220,
    zIndex: 999,
  },
  carouselHeader: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  carouselHeaderDark: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderBottomColor: '#374151',
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    fontFamily: 'System',
  },
  carouselTitleDark: {
    color: '#f9fafb',
  },
  carouselContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  
  // Enhanced Page Items
  pageItem: {
    width: 130,
    height: 160,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  pageItemDark: {
    shadowOpacity: 0.3,
  },
  pageItemActive: {
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  pageItemGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  pageItemGradientActive: {
    shadowColor: '#3b82f6',
  },
  pagePreview: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 14,
    fontFamily: 'System',
    textAlign: 'left',
    flex: 1,
  },
  pagePreviewDark: {
    color: '#9ca3af',
  },
  pagePreviewActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
  pagePreviewActiveDark: {
    color: '#ffffff',
  },
  pageNumberContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'System',
  },
  pageNumberDark: {
    color: '#d1d5db',
  },
  pageNumberActive: {
    color: '#ffffff',
    fontSize: 16,
  },
  pageNumberActiveDark: {
    color: '#ffffff',
  },
});

export default ReadingScreen;