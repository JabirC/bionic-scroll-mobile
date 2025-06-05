// src/components/BookShelf.js
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  TextInput,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Progress from 'react-native-progress';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const BOOK_WIDTH = 100;
const BOOK_HEIGHT = BOOK_WIDTH * 1.4;
const MAX_OPTION_TITLE_LENGTH = 15;
const MAX_COLLECTION_NAME_LENGTH = 25;

const BookItem = memo(({ 
  book, 
  uploadProgress, 
  isDarkMode, 
  onPress, 
  onLongPress,
  formatDate,
  getProgressPercentage,
  generateBookCover 
}) => {
  const progress = getProgressPercentage(book);
  const coverColors = generateBookCover(book);
  const cleanTitle = book.name.replace(/\.(pdf|epub)$/i, '');
  const isUploading = book.isUploading || uploadProgress !== undefined;
  const uploadPercentage = uploadProgress || 0;
  const isNewlyUploaded = book.isNewlyUploaded && !isUploading;

  return (
    <View style={styles.bookContainer}>
      <TouchableOpacity
        style={[
          styles.book,
          isDarkMode && styles.bookDark,
          isUploading && styles.bookUploading
        ]}
        onPress={() => !isUploading && onPress(book)}
        onLongPress={(event) => !isUploading && onLongPress(book, event)}
        activeOpacity={isUploading ? 1 : 0.8}
        disabled={isUploading}
      >
        {isUploading && !book.coverImage ? (
          <View style={styles.bookCover}>
            <LinearGradient
              colors={['#e5e7eb', '#d1d5db']}
              style={styles.bookCover}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.uploadingIndicator}>
                <Progress.Circle
                  size={40}
                  progress={uploadPercentage / 100}
                  showsText={true}
                  formatText={() => `${Math.round(uploadPercentage)}%`}
                  color="#3b82f6"
                  unfilledColor="rgba(59, 130, 246, 0.2)"
                  borderWidth={0}
                  thickness={3}
                  textStyle={styles.uploadProgressText}
                />
              </View>
            </LinearGradient>
          </View>
        ) : book.coverImage ? (
          <View style={styles.bookCover}>
            <Image 
              source={{ uri: book.coverImage }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            {isUploading && (
              <View style={styles.uploadOverlay}>
                <View style={styles.uploadFilter} />
                <Progress.Circle
                  size={40}
                  progress={uploadPercentage / 100}
                  showsText={true}
                  formatText={() => `${Math.round(uploadPercentage)}%`}
                  color="#ffffff"
                  unfilledColor="rgba(255,255,255,0.3)"
                  borderWidth={0}
                  thickness={3}
                  textStyle={styles.uploadProgressText}
                />
              </View>
            )}
          </View>
        ) : (
          <LinearGradient
            colors={coverColors}
            style={styles.bookCover}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.bookContent}>
              <Text style={styles.bookTitle} numberOfLines={3} ellipsizeMode="tail">
                {cleanTitle}
              </Text>
            </View>
            
            {isUploading && (
              <View style={styles.uploadOverlay}>
                <View style={styles.uploadFilter} />
                <Progress.Circle
                  size={40}
                  progress={uploadPercentage / 100}
                  showsText={true}
                  formatText={() => `${Math.round(uploadPercentage)}%`}
                  color="#ffffff"
                  unfilledColor="rgba(255,255,255,0.3)"
                  borderWidth={0}
                  thickness={3}
                  textStyle={styles.uploadProgressText}
                />
              </View>
            )}
          </LinearGradient>
        )}
      </TouchableOpacity>
      
      <View style={styles.bookInfo}>
        <Text 
          style={[styles.bookLabel, isDarkMode && styles.bookLabelDark]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {isUploading ? 'Processing...' : cleanTitle}
        </Text>
        
        {!isUploading && (
          <View style={styles.bookMeta}>
            <Text style={[styles.bookDate, isDarkMode && styles.bookDateDark]}>
              {formatDate(book.lastRead || book.dateAdded)}
            </Text>
            
            {isNewlyUploaded ? (
              <View style={styles.newBookDot} />
            ) : progress > 0 ? (
              <Text style={styles.bookProgress}>
                {Math.round(progress)}%
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
});

BookItem.displayName = 'BookItem';

const BookShelf = ({ 
  shelves, 
  uploadingBooks, 
  onBookPress, 
  onDeleteBook, 
  onCreateCategory,
  onBookCategoryChange,
  isDarkMode, 
}) => {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [bookToMove, setBookToMove] = useState(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showBookOptions, setShowBookOptions] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [optionsPosition, setOptionsPosition] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const optionsRef = useRef(null);
  const inputRef = useRef(null);
  const isMountedRef = useRef(true);
  const moveModalOpacity = useRef(new Animated.Value(0)).current;
  const moveModalSlide = useRef(new Animated.Value(screenHeight)).current;
  const listViewOpacity = useRef(new Animated.Value(1)).current;
  const inputViewOpacity = useRef(new Animated.Value(0)).current;
  const inputViewTranslate = useRef(new Animated.Value(30)).current;
  const listViewTranslate = useRef(new Animated.Value(0)).current;
  const keyboardModalTranslate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Smooth keyboard animations with 50px translation
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        
        // Smooth, slow animation when keyboard appears - move up 50px
        Animated.timing(keyboardModalTranslate, {
          toValue: -200, // Fixed 50 pixel translation upward
          duration: 400, // Slower animation
          easing: Easing.out(Easing.cubic), // Smooth easing
          useNativeDriver: true,
        }).start();
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        
        // Smooth animation when keyboard disappears
        Animated.timing(keyboardModalTranslate, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [keyboardModalTranslate]);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.abs(now - date) / 36e5;
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const getProgressPercentage = useCallback((book) => {
    if (!book.readingPosition || !book.readingPosition.percentage) return 0;
    return book.readingPosition.percentage;
  }, []);

  const generateBookCover = useCallback((book) => {
    const colors = [
      ['#1f2937', '#4b5563'],
      ['#374151', '#6b7280'],
      ['#111827', '#374151'],
      ['#0f172a', '#1e293b'],
      ['#18181b', '#3f3f46'],
      ['#27272a', '#52525b'],
      ['#171717', '#404040'],
      ['#0c0a09', '#292524'],
      ['#1c1917', '#44403c'],
      ['#451a03', '#78350f'],
    ];
    
    const hash = book.name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }, []);

  const truncateTitle = useCallback((title, maxLength) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  }, []);

  const showBookOptionsOverlay = useCallback((book, event) => {
    if (isProcessing) return;
    
    const { pageX, pageY } = event.nativeEvent;
    setSelectedBook(book);
    setOptionsPosition({ x: pageX - 100, y: pageY + 20 });
    setShowBookOptions(true);
  }, [isProcessing]);

  const hideBookOptions = useCallback(() => {
    setShowBookOptions(false);
    setSelectedBook(null);
  }, []);

  const showMoveModalOverlay = useCallback(() => {
    setShowMoveModal(true);
    
    Animated.parallel([
      Animated.timing(moveModalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(moveModalSlide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [moveModalOpacity, moveModalSlide]);

  const hideMoveModal = useCallback(() => {
    Keyboard.dismiss();
    
    Animated.parallel([
      Animated.timing(moveModalOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(moveModalSlide, {
        toValue: screenHeight,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(keyboardModalTranslate, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (!isMountedRef.current) return;
      setShowMoveModal(false);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
      setBookToMove(null);
      setIsProcessing(false);
      
      // Reset animation values
      listViewOpacity.setValue(1);
      inputViewOpacity.setValue(0);
      inputViewTranslate.setValue(30);
      listViewTranslate.setValue(0);
    });
  }, [moveModalOpacity, moveModalSlide, keyboardModalTranslate, listViewOpacity, inputViewOpacity, inputViewTranslate, listViewTranslate]);

  const handleMoveToCollection = useCallback(() => {
    if (isProcessing) return;
    
    hideBookOptions();
    setTimeout(() => {
      if (!isMountedRef.current) return;
      setBookToMove(selectedBook);
      showMoveModalOverlay();
    }, 100);
  }, [isProcessing, hideBookOptions, selectedBook, showMoveModalOverlay]);

  const handleDeleteBook = useCallback(() => {
    if (isProcessing) return;
    
    hideBookOptions();
    setTimeout(() => {
      if (!isMountedRef.current || !selectedBook) return;
      
      Alert.alert(
        'Delete Book',
        `Are you sure you want to delete "${selectedBook.name.replace(/\.(pdf|epub)$/i, '')}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive', 
            onPress: () => onDeleteBook(selectedBook.id) 
          }
        ]
      );
    }, 100);
  }, [isProcessing, hideBookOptions, selectedBook, onDeleteBook]);

  const handleMoveToExistingCollection = useCallback(async (targetCategoryId) => {
    if (isProcessing || !bookToMove) return;

    if (bookToMove.categoryId === targetCategoryId) {
      hideMoveModal();
      return;
    }

    setIsProcessing(true);

    try {
      const success = await onBookCategoryChange(bookToMove.id, targetCategoryId);
      
      if (success !== false && isMountedRef.current) {
        hideMoveModal();
      } else {
        throw new Error('Move operation failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to move book to collection');
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [isProcessing, bookToMove, onBookCategoryChange, hideMoveModal]);

  const handleCreateNewCollection = useCallback(async () => {
    if (isProcessing || !newCategoryName.trim() || !bookToMove) {
      return;
    }

    const collectionName = newCategoryName.trim();
    setIsProcessing(true);

    try {
      const newCategory = await onCreateCategory(collectionName);
      
      if (!newCategory || !newCategory.id) {
        throw new Error('Failed to create collection');
      }

      const success = await onBookCategoryChange(bookToMove.id, newCategory.id);
      
      if (success !== false && isMountedRef.current) {
        hideMoveModal();
      } else {
        throw new Error('Failed to move book to new collection');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create collection and move book');
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [isProcessing, newCategoryName, bookToMove, onCreateCategory, onBookCategoryChange, hideMoveModal]);

  const showNewCollectionInput = useCallback(() => {
    if (isProcessing) return;
    
    // Ultra smooth transition to input view with faster text appearance
    Animated.parallel([
      // Fade out list
      Animated.timing(listViewOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Slide list slightly left
      Animated.timing(listViewTranslate, {
        toValue: -20,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Fade in input - faster appearance
      Animated.sequence([
        Animated.delay(100), // Reduced from 150ms to 100ms
        Animated.timing(inputViewOpacity, {
          toValue: 1,
          duration: 250, // Reduced from 300ms to 250ms
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Slide input from right - faster
      Animated.sequence([
        Animated.delay(100), // Reduced from 150ms to 100ms  
        Animated.timing(inputViewTranslate, {
          toValue: 0,
          duration: 280, // Reduced from 350ms to 280ms
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setShowNewCategoryInput(true);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    });
  }, [isProcessing, listViewOpacity, inputViewOpacity, inputViewTranslate, listViewTranslate]);

  const hideNewCollectionInput = useCallback(() => {
    Keyboard.dismiss();
    
    // Ultra smooth transition back to list view
    Animated.parallel([
      // Fade out input
      Animated.timing(inputViewOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Slide input right
      Animated.timing(inputViewTranslate, {
        toValue: 20,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Fade in list
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(listViewOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Slide list back
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(listViewTranslate, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      // Reset input position for next time
      inputViewTranslate.setValue(30);
    });
  }, [listViewOpacity, inputViewOpacity, inputViewTranslate, listViewTranslate]);

  const handleBookPress = useCallback((book) => {
    if (!isProcessing) {
      onBookPress(book);
    }
  }, [isProcessing, onBookPress]);

  const handleBookLongPress = useCallback((book, event) => {
    if (!isProcessing) {
      showBookOptionsOverlay(book, event);
    }
  }, [isProcessing, showBookOptionsOverlay]);

  const renderBookOptionsOverlay = () => {
    if (!showBookOptions || !selectedBook) return null;

    const cleanTitle = selectedBook.name.replace(/\.(pdf|epub)$/i, '');
    const truncatedTitle = truncateTitle(cleanTitle, MAX_OPTION_TITLE_LENGTH);

    return (
      <TouchableWithoutFeedback onPress={hideBookOptions}>
        <View style={styles.optionsPopoverContainer}>
          <View
            ref={optionsRef}
            style={[
              styles.optionsPopover,
              isDarkMode && styles.optionsPopoverDark,
              {
                left: Math.max(20, Math.min(optionsPosition.x, screenWidth - 220)),
                top: Math.max(100, optionsPosition.y),
              }
            ]}
          >
            <View style={styles.optionsHeader}>
              <Text style={[styles.optionsTitle, isDarkMode && styles.optionsTitleDark]}>
                {truncatedTitle}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.optionItem, isDarkMode && styles.optionItemDark]}
              onPress={handleMoveToCollection}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <View style={styles.optionContent}>
                <Ionicons 
                  name="folder-outline" 
                  size={20} 
                  color={isDarkMode ? '#9ca3af' : '#6b7280'} 
                />
                <Text style={[
                  styles.optionText, 
                  isDarkMode && styles.optionTextDark,
                  isProcessing && styles.optionTextDisabled
                ]}>
                  Move to Collection
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, styles.optionItemDelete, isDarkMode && styles.optionItemDeleteDark]}
              onPress={handleDeleteBook}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <View style={styles.optionContent}>
                <Ionicons 
                  name="trash-outline" 
                  size={20} 
                  color="#ef4444" 
                />
                <Text style={[
                  styles.optionText, 
                  styles.optionTextDelete,
                  isProcessing && styles.optionTextDisabled
                ]}>
                  Delete
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const renderMoveToCollectionModal = () => {
    if (!showMoveModal || !bookToMove) return null;

    return (
      <Modal
        visible={showMoveModal}
        transparent={true}
        animationType="none"
        onRequestClose={hideMoveModal}
      >
        <Animated.View 
          style={[
            styles.fullscreenModal,
            { opacity: moveModalOpacity }
          ]}
        >
          <Pressable 
            style={styles.dismissArea} 
            onPress={hideMoveModal}
          />
          
          <Animated.View
            style={[
              styles.moveModalFullscreen,
              isDarkMode && styles.moveModalFullscreenDark,
              { 
                transform: [
                  { translateY: moveModalSlide },
                  { translateY: keyboardModalTranslate }
                ]
              }
            ]}
          >
            <View style={styles.modalHandleBar} />
            
            {/* List View */}
            <Animated.View
              style={[
                styles.modalContent,
                { 
                  opacity: listViewOpacity,
                  transform: [{ translateX: listViewTranslate }],
                  display: showNewCategoryInput ? 'none' : 'flex'
                }
              ]}
            >
              <View style={styles.moveModalHeader}>
                <Text style={[styles.moveModalTitle, isDarkMode && styles.moveModalTitleDark]}>
                  Move to Collection
                </Text>
                <Text style={[styles.moveModalBookName, isDarkMode && styles.moveModalBookNameDark]}>
                  {truncateTitle(bookToMove.name.replace(/\.(pdf|epub)$/i, ''), 35)}
                </Text>
              </View>
              
              <ScrollView 
                style={styles.categoryScrollListFullscreen} 
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={styles.scrollContent}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryModalItemFullscreen,
                    styles.createNewCategoryItem,
                    isDarkMode && styles.categoryModalItemFullscreenDark,
                    isDarkMode && styles.createNewCategoryItemDark,
                  ]}
                  onPress={showNewCollectionInput}
                  disabled={isProcessing}
                >
                  <View style={styles.categoryItemContent}>
                    <View style={styles.categoryItemLeft}>
                      <Ionicons 
                        name="add-outline" 
                        size={20} 
                        color={isDarkMode ? '#60a5fa' : '#3b82f6'} 
                      />
                      <View style={styles.categoryTextContainer}>
                        <Text style={[
                          styles.categoryItemTitle,
                          styles.createNewCategoryTitle,
                          isDarkMode && styles.createNewCategoryTitleDark,
                          isProcessing && styles.categoryItemTitleDisabled
                        ]}>
                          New Collection
                        </Text>
                        <Text style={[
                          styles.categoryItemSubtitle,
                          isDarkMode && styles.categoryItemSubtitleDark
                        ]}>
                          Create a new collection
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {shelves.map(shelf => (
                  <TouchableOpacity
                    key={shelf.id}
                    style={[
                      styles.categoryModalItemFullscreen,
                      isDarkMode && styles.categoryModalItemFullscreenDark,
                      bookToMove?.categoryId === shelf.id && styles.categoryModalItemSelected,
                      bookToMove?.categoryId === shelf.id && isDarkMode && styles.categoryModalItemSelectedDark
                    ]}
                    onPress={() => handleMoveToExistingCollection(shelf.id)}
                    disabled={isProcessing}
                  >
                    <View style={styles.categoryItemContent}>
                      <View style={styles.categoryItemLeft}>
                        <Ionicons 
                          name={bookToMove?.categoryId === shelf.id ? "folder" : "folder-outline"} 
                          size={20} 
                          color={
                            isProcessing ? '#9ca3af' : 
                            bookToMove?.categoryId === shelf.id ? 
                              (isDarkMode ? '#ffffff' : '#000000') : 
                              (isDarkMode ? '#9ca3af' : '#6b7280')
                          } 
                        />
                        <View style={styles.categoryTextContainer}>
                          <Text style={[
                            styles.categoryItemTitle,
                            isDarkMode && styles.categoryItemTitleDark,
                            bookToMove?.categoryId === shelf.id && styles.categoryItemTitleSelected,
                            isProcessing && styles.categoryItemTitleDisabled
                          ]}>
                            {shelf.title}
                          </Text>
                          <Text style={[
                            styles.categoryItemSubtitle,
                            isDarkMode && styles.categoryItemSubtitleDark
                          ]}>
                            {shelf.books.length} {shelf.books.length === 1 ? 'book' : 'books'}
                          </Text>
                        </View>
                      </View>
                      
                      {bookToMove?.categoryId === shelf.id && (
                        <Ionicons 
                          name="checkmark" 
                          size={20} 
                          color={isDarkMode ? '#ffffff' : '#000000'} 
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>

            {/* Input View */}
            <Animated.View
              style={[
                styles.modalContent,
                { 
                  opacity: inputViewOpacity,
                  transform: [{ translateX: inputViewTranslate }],
                  display: showNewCategoryInput ? 'flex' : 'none'
                }
              ]}
            >
              <ScrollView
                style={styles.newCollectionInputScrollView}
                contentContainerStyle={styles.newCollectionInputContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={hideNewCollectionInput}
                  disabled={isProcessing}
                >
                  <Ionicons 
                    name="chevron-back" 
                    size={24} 
                    color={isDarkMode ? '#ffffff' : '#000000'} 
                  />
                </TouchableOpacity>
                
                <Text style={[styles.newCollectionTitle, isDarkMode && styles.newCollectionTitleDark]}>
                  New Collection
                </Text>
                
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={inputRef}
                    style={[
                      styles.moveModalInputFullscreen, 
                      isDarkMode && styles.moveModalInputFullscreenDark,
                      isProcessing && styles.moveModalInputDisabled
                    ]}
                    placeholder="Collection name"
                    placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                    value={newCategoryName}
                    onChangeText={(text) => setNewCategoryName(text.slice(0, MAX_COLLECTION_NAME_LENGTH))}
                    onSubmitEditing={handleCreateNewCollection}
                    editable={!isProcessing}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    maxLength={MAX_COLLECTION_NAME_LENGTH}
                    autoCapitalize="words"
                  />
                  
                  <Text style={[styles.charCountText, isDarkMode && styles.charCountTextDark]}>
                    {newCategoryName.length}/{MAX_COLLECTION_NAME_LENGTH}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.createButton,
                    isDarkMode && styles.createButtonDark,
                    (!newCategoryName.trim() || isProcessing) && styles.createButtonDisabled
                  ]}
                  onPress={handleCreateNewCollection}
                  disabled={!newCategoryName.trim() || isProcessing}
                >
                  <Text style={[
                    styles.createButtonText,
                    isDarkMode && styles.createButtonTextDark,
                    (!newCategoryName.trim() || isProcessing) && styles.createButtonTextDisabled
                  ]}>
                    {isProcessing ? 'Creating...' : 'Create Collection'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  };

  const renderShelf = useCallback((shelf) => {
    if (shelf.books.length === 0) {
      return null;
    }

    return (
      <View key={shelf.id} style={styles.shelfContainer}>
        <View style={styles.shelfHeader}>
          <Text style={[styles.shelfTitle, isDarkMode && styles.shelfTitleDark]}>
            {shelf.title}
          </Text>
          <Text style={[styles.bookCount, isDarkMode && styles.bookCountDark]}>
            {shelf.books.length} {shelf.books.length === 1 ? 'book' : 'books'}
          </Text>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shelfContent}
          scrollEventThrottle={16}
        >
          {shelf.books.map((book) => (
            <BookItem
              key={book.id}
              book={book}
              uploadProgress={uploadingBooks.get(book.id)}
              isDarkMode={isDarkMode}
              onPress={handleBookPress}
              onLongPress={handleBookLongPress}
              formatDate={formatDate}
              getProgressPercentage={getProgressPercentage}
              generateBookCover={generateBookCover}
            />
          ))}
        </ScrollView>
      </View>
    );
  }, [isDarkMode, uploadingBooks, handleBookPress, handleBookLongPress, formatDate, getProgressPercentage, generateBookCover]);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {shelves.map((shelf) => renderShelf(shelf)).filter(Boolean)}
        
        {shelves.every(shelf => shelf.books.length === 0) && (
          <View style={styles.emptyState}>
            <Text style={[
              styles.emptyMessage, 
              isDarkMode && styles.emptyMessageDark
            ]}>
              Upload your first book to begin
            </Text>
          </View>
        )}
      </ScrollView>

      {renderBookOptionsOverlay()}
      {renderMoveToCollectionModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 140,
    paddingTop: 10,
  },
  shelfContainer: {
    marginBottom: 36,
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
    zIndex: -1,
    elevation: -1,
    position: 'relative',
  },
  shelfTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'System',
  },
  shelfTitleDark: {
    color: '#ffffff',
  },
  bookCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
    fontFamily: 'System',
  },
  bookCountDark: {
    color: '#9ca3af',
  },
  shelfContent: {
    paddingLeft: 24,
    paddingRight: 24,
    paddingBottom: 8,
    paddingTop: 20,
    zIndex: 1,
    elevation: 1,
    position: 'relative',
  },
  bookContainer: {
    alignItems: 'center',
    marginRight: 12,
    zIndex: 2,
    elevation: 2,
    position: 'relative',
  },
  book: {
    width: BOOK_WIDTH,
    height: BOOK_HEIGHT,
    borderRadius: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
    overflow: 'visible',
    zIndex: 10,
  },
  bookUploading: {
    opacity: 1,
  },
  bookDark: {
    shadowOpacity: 0.3,
  },
  bookCover: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  uploadingIndicator: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadFilter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  uploadProgressText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600',
  },
  bookContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 16,
    fontFamily: 'System',
  },
  bookInfo: {
    width: BOOK_WIDTH,
    marginTop: 8,
    alignItems: 'center',
  },
  bookLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 14,
    width: '100%',
    fontFamily: 'System',
  },
  bookLabelDark: {
    color: '#e5e7eb',
  },
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookDate: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '400',
    fontFamily: 'System',
  },
  bookDateDark: {
    color: '#9ca3af',
  },
  bookProgress: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600',
    fontFamily: 'System',
  },
  newBookDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 40,
    paddingTop: 120,
  },
  emptyMessage: {
    fontSize: 18,
    fontWeight: '300',
    color: '#6b7280',
    textAlign: 'center',
    fontFamily: 'System',
  },
  emptyMessageDark: {
    color: '#9ca3af',
  },

  // Book Options Popover
  optionsPopoverContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  optionsPopover: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 15,
    minWidth: 200,
    overflow: 'hidden',
    zIndex: 1001,
  },
  optionsPopoverDark: {
    backgroundColor: '#1a1a1a',
    shadowOpacity: 0.3,
  },
  optionsHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'System',
  },
  optionsTitleDark: {
    color: '#ffffff',
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionItemDark: {
    borderBottomColor: '#374151',
  },
  optionItemDelete: {
    borderBottomWidth: 0,
  },
  optionItemDeleteDark: {
    borderBottomWidth: 0,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
    fontFamily: 'System',
  },
  optionTextDark: {
    color: '#f9fafb',
  },
  optionTextDelete: {
    color: '#ef4444',
  },
  optionTextDisabled: {
    color: '#9ca3af',
  },

  // Fullscreen Modal
  fullscreenModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
  },
  dismissArea: {
    flex: 1,
  },
  moveModalFullscreen: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: screenHeight * 0.6,
    maxHeight: screenHeight * 0.85,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 25,
    zIndex: 2001,
  },
  moveModalFullscreenDark: {
    backgroundColor: '#0f0f0f',
  },
  modalHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },

  // Modal Content Container
  modalContent: {
    flex: 1,
  },

  // Modal Header
  moveModalHeader: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  moveModalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'System',
    marginBottom: 6,
  },
  moveModalTitleDark: {
    color: '#ffffff',
  },
  moveModalBookName: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
  },
  moveModalBookNameDark: {
    color: '#9ca3af',
  },

  // Collection Items
  categoryScrollListFullscreen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingTop: 8, // Reduced from 16 to 8
  },
  
  // Consistent Create New Collection Item
  createNewCategoryItem: {
    borderBottomWidth: 0.5, // Changed from 1 to 0.5 to match other items
    borderBottomColor: '#e5e7eb',
    // Removed marginBottom: 8 to eliminate extra space
  },
  createNewCategoryItemDark: {
    borderBottomColor: '#1a1a1a', // Changed from #2a2a2a to match other items
  },
  createNewCategoryTitle: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  createNewCategoryTitleDark: {
    color: '#60a5fa',
  },
  
  categoryModalItemFullscreen: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  categoryModalItemFullscreenDark: {
    borderBottomColor: '#1a1a1a',
  },
  categoryModalItemSelected: {
    backgroundColor: '#f9fafb',
  },
  categoryModalItemSelectedDark: {
    backgroundColor: '#1a1a1a',
  },

  // Category content layout
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  categoryItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    fontFamily: 'System',
    marginBottom: 2,
  },
  categoryItemTitleDark: {
    color: '#f3f4f6',
  },
  categoryItemTitleSelected: {
    fontWeight: '600',
  },
  categoryItemTitleDisabled: {
    color: '#9ca3af',
  },
  categoryItemSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'System',
  },
  categoryItemSubtitleDark: {
    color: '#9ca3af',
  },

  // New Collection Input with smooth animations
  newCollectionInputScrollView: {
    flex: 1,
  },
  newCollectionInputContainer: {
    padding: 24,
    paddingBottom: 60,
    minHeight: screenHeight * 0.5,
  },
  backButton: {
    marginBottom: 20,
  },
  newCollectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'System',
    marginBottom: 32,
  },
  newCollectionTitleDark: {
    color: '#ffffff',
  },
  inputWrapper: {
    marginBottom: 40,
  },
  moveModalInputFullscreen: {
    fontSize: 16,
    color: '#000000',
    fontFamily: 'System',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  moveModalInputFullscreenDark: {
    color: '#ffffff',
    borderBottomColor: '#374151',
  },
  moveModalInputDisabled: {
    opacity: 0.5,
  },
  charCountText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 8,
    fontFamily: 'System',
  },
  charCountTextDark: {
    color: '#6b7280',
  },

  // Create Button
  createButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDark: {
    backgroundColor: '#ffffff',
  },
  createButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  createButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'System',
  },
  createButtonTextDark: {
    color: '#000000',
  },
  createButtonTextDisabled: {
    color: '#9ca3af',
  },
});

export default memo(BookShelf);