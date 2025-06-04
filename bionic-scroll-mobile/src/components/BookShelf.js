// src/components/BookShelf.js
import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Progress from 'react-native-progress';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const BOOK_WIDTH = 100;
const BOOK_HEIGHT = BOOK_WIDTH * 1.4;
const MAX_OPTION_TITLE_LENGTH = 20;

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
  
  const optionsScale = useRef(new Animated.Value(0)).current;
  const optionsOpacity = useRef(new Animated.Value(0)).current;
  const moveModalScale = useRef(new Animated.Value(0)).current;
  const moveModalOpacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.abs(now - date) / 36e5;
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getProgressPercentage = (book) => {
    if (!book.readingPosition || !book.readingPosition.percentage) return 0;
    return book.readingPosition.percentage;
  };

  const generateBookCover = (book) => {
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
  };

  const truncateTitle = (title, maxLength) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  // Show book options overlay
  const showBookOptionsOverlay = (book, event) => {
    if (isProcessing) return;
    
    const { pageX, pageY } = event.nativeEvent;
    setSelectedBook(book);
    setOptionsPosition({ x: pageX - 100, y: pageY + 20 });
    setShowBookOptions(true);
    
    Animated.parallel([
      Animated.timing(optionsScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(optionsOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Hide book options overlay
  const hideBookOptions = () => {
    Animated.parallel([
      Animated.timing(optionsScale, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(optionsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowBookOptions(false);
      setSelectedBook(null);
    });
  };

  // Show move modal overlay at same position as options
  const showMoveModalOverlay = () => {
    setShowMoveModal(true);
    
    Animated.parallel([
      Animated.timing(moveModalScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(moveModalOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Hide move modal overlay
  const hideMoveModal = () => {
    Keyboard.dismiss(); // Dismiss keyboard when closing
    Animated.parallel([
      Animated.timing(moveModalScale, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(moveModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowMoveModal(false);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
      setBookToMove(null);
      setIsProcessing(false);
    });
  };

  // Handle move to collection button press
  const handleMoveToCollection = () => {
    if (isProcessing) return;
    
    hideBookOptions();
    setTimeout(() => {
      setBookToMove(selectedBook);
      showMoveModalOverlay();
    }, 300);
  };

  // Handle delete book
  const handleDeleteBook = () => {
    if (isProcessing) return;
    
    hideBookOptions();
    setTimeout(() => {
      if (selectedBook) {
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
      }
    }, 300);
  };

  // Handle moving book to existing collection
  const handleMoveToExistingCollection = async (targetCategoryId) => {
    if (isProcessing || !bookToMove) return;

    // Don't do anything if it's already in this category
    if (bookToMove.categoryId === targetCategoryId) {
      hideMoveModal();
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Moving book to existing collection:', bookToMove.id, 'to category:', targetCategoryId);
      
      const success = await onBookCategoryChange(bookToMove.id, targetCategoryId);
      
      if (success !== false) {
        console.log('Successfully moved book to existing collection');
        hideMoveModal();
      } else {
        throw new Error('Move operation failed');
      }
    } catch (error) {
      console.error('Error moving book to existing collection:', error);
      Alert.alert('Error', 'Failed to move book to collection');
      setIsProcessing(false);
    }
  };

  // Handle creating new collection and moving book
  const handleCreateNewCollection = async () => {
    if (isProcessing || !newCategoryName.trim() || !bookToMove) {
      return;
    }

    const collectionName = newCategoryName.trim();
    setIsProcessing(true);

    try {
      console.log('Creating new collection:', collectionName);
      
      // Create the new collection
      const newCategory = await onCreateCategory(collectionName);
      
      if (!newCategory || !newCategory.id) {
        throw new Error('Failed to create collection - no category returned');
      }

      console.log('Created collection:', newCategory);

      // Move the book to the new collection
      console.log('Moving book to new collection:', bookToMove.id, 'to category:', newCategory.id);
      
      const success = await onBookCategoryChange(bookToMove.id, newCategory.id);
      
      if (success !== false) {
        console.log('Successfully created collection and moved book');
        hideMoveModal();
      } else {
        throw new Error('Failed to move book to new collection');
      }
    } catch (error) {
      console.error('Error creating collection and moving book:', error);
      Alert.alert('Error', 'Failed to create collection and move book');
      setIsProcessing(false);
    }
  };

  // Show new collection input
  const showNewCollectionInput = () => {
    if (isProcessing) return;
    setShowNewCategoryInput(true);
  };

  // Hide new collection input
  const hideNewCollectionInput = () => {
    setNewCategoryName('');
    setShowNewCategoryInput(false);
  };

  const renderBook = (book) => {
    const progress = getProgressPercentage(book);
    const coverColors = generateBookCover(book);
    const cleanTitle = book.name.replace(/\.(pdf|epub)$/i, '');
    const isUploading = book.isUploading || uploadingBooks.has(book.id);
    const uploadProgress = uploadingBooks.get(book.id) || 0;
    const isNewlyUploaded = book.isNewlyUploaded && !isUploading;

    return (
      <View style={styles.bookContainer} key={book.id}>
        <TouchableOpacity
          style={[
            styles.book,
            isDarkMode && styles.bookDark,
            isUploading && styles.bookUploading
          ]}
          onPress={() => !isUploading && !isProcessing && onBookPress(book)}
          onLongPress={(event) => !isUploading && !isProcessing && showBookOptionsOverlay(book, event)}
          activeOpacity={isUploading ? 1 : 0.8}
          disabled={isUploading || isProcessing}
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
                    progress={uploadProgress / 100}
                    showsText={true}
                    formatText={() => `${Math.round(uploadProgress)}%`}
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
                    progress={uploadProgress / 100}
                    showsText={true}
                    formatText={() => `${Math.round(uploadProgress)}%`}
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
                    progress={uploadProgress / 100}
                    showsText={true}
                    formatText={() => `${Math.round(uploadProgress)}%`}
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
  };

  const renderBookOptionsOverlay = () => {
    if (!showBookOptions || !selectedBook) return null;

    const cleanTitle = selectedBook.name.replace(/\.(pdf|epub)$/i, '');
    const truncatedTitle = truncateTitle(cleanTitle, MAX_OPTION_TITLE_LENGTH);

    return (
      <Modal
        visible={showBookOptions}
        transparent={true}
        animationType="none"
        onRequestClose={hideBookOptions}
      >
        <TouchableWithoutFeedback onPress={hideBookOptions}>
          <View style={styles.optionsOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.optionsContainer,
                  isDarkMode && styles.optionsContainerDark,
                  {
                    left: Math.max(20, Math.min(optionsPosition.x, screenWidth - 220)),
                    top: Math.max(100, optionsPosition.y),
                    opacity: optionsOpacity,
                    transform: [{ scale: optionsScale }],
                  }
                ]}
              >
                <View style={styles.optionsHeader}>
                  <Text 
                    style={[styles.optionsTitle, isDarkMode && styles.optionsTitleDark]}
                  >
                    {truncatedTitle}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.optionItem, isDarkMode && styles.optionItemDark]}
                  onPress={handleMoveToCollection}
                  activeOpacity={0.7}
                  disabled={isProcessing}
                >
                  <Text style={[
                    styles.optionText, 
                    isDarkMode && styles.optionTextDark,
                    isProcessing && styles.optionTextDisabled
                  ]}>
                    Move to Collection
                  </Text>
                  <Ionicons 
                    name="folder-outline" 
                    size={20} 
                    color={isProcessing ? '#9ca3af' : isDarkMode ? '#9ca3af' : '#6b7280'} 
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionItem, styles.optionItemDelete, isDarkMode && styles.optionItemDeleteDark]}
                  onPress={handleDeleteBook}
                  activeOpacity={0.7}
                  disabled={isProcessing}
                >
                  <Text style={[
                    styles.optionText, 
                    styles.optionTextDelete,
                    isProcessing && styles.optionTextDisabled
                  ]}>
                    Delete
                  </Text>
                  <Ionicons 
                    name="trash-outline" 
                    size={20} 
                    color={isProcessing ? '#9ca3af' : '#ef4444'} 
                  />
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  const renderMoveToCollectionModal = () => {
    if (!showMoveModal || !bookToMove) return null;

    // Calculate position adjusting for keyboard
    const adjustedTopPosition = showNewCategoryInput && keyboardHeight > 0 
      ? Math.min(optionsPosition.y, screenHeight - keyboardHeight - 180 - 50)
      : optionsPosition.y;

    return (
      <Modal
        visible={showMoveModal}
        transparent={true}
        animationType="none"
        onRequestClose={hideMoveModal}
      >
        <TouchableWithoutFeedback onPress={hideMoveModal}>
          <View style={styles.optionsOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.moveModalContainer,
                  isDarkMode && styles.moveModalContainerDark,
                  {
                    left: Math.max(20, Math.min(optionsPosition.x, screenWidth - 200)),
                    top: Math.max(100, adjustedTopPosition),
                    opacity: moveModalOpacity,
                    transform: [{ scale: moveModalScale }],
                  }
                ]}
              >
                <View style={styles.moveModalHeader}>
                  <Text style={[styles.moveModalTitle, isDarkMode && styles.moveModalTitleDark]}>
                    Collections
                  </Text>
                </View>
                
                {!showNewCategoryInput ? (
                  <ScrollView style={styles.categoryScrollList} showsVerticalScrollIndicator={false}>
                    {/* New button at the top */}
                    <TouchableOpacity
                      style={[
                        styles.categoryModalItem,
                        styles.newCategoryModalItem,
                        isDarkMode && styles.categoryModalItemDark,
                      ]}
                      onPress={showNewCollectionInput}
                      disabled={isProcessing}
                    >
                      <View style={styles.newCategoryModalContent}>
                        <Ionicons 
                          name="add" 
                          size={16} 
                          color={isProcessing ? '#9ca3af' : '#3b82f6'} 
                        />
                        <Text style={[
                          styles.newCategoryModalText, 
                          isDarkMode && styles.newCategoryModalTextDark,
                          isProcessing && styles.newCategoryModalTextDisabled
                        ]}>
                          New
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Existing collections */}
                    {shelves.map(shelf => (
                      <TouchableOpacity
                        key={shelf.id}
                        style={[
                          styles.categoryModalItem,
                          isDarkMode && styles.categoryModalItemDark,
                          bookToMove?.categoryId === shelf.id && styles.categoryModalItemSelected,
                          bookToMove?.categoryId === shelf.id && isDarkMode && styles.categoryModalItemSelectedDark
                        ]}
                        onPress={() => handleMoveToExistingCollection(shelf.id)}
                        disabled={isProcessing}
                      >
                        <Text style={[
                          styles.categoryModalItemText,
                          isDarkMode && styles.categoryModalItemTextDark,
                          bookToMove?.categoryId === shelf.id && styles.categoryModalItemTextSelected,
                          bookToMove?.categoryId === shelf.id && isDarkMode && styles.categoryModalItemTextSelectedDark,
                          isProcessing && styles.categoryModalItemTextDisabled
                        ]}>
                          {shelf.title}
                        </Text>
                        
                        {bookToMove?.categoryId === shelf.id && (
                          <Ionicons 
                            name="checkmark" 
                            size={16} 
                            color="#3b82f6" 
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.newCollectionInputContainer}>
                    <TextInput
                      style={[
                        styles.moveModalInput, 
                        isDarkMode && styles.moveModalInputDark,
                        isProcessing && styles.moveModalInputDisabled
                      ]}
                      placeholder="Collection name"
                      placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                      autoFocus
                      onSubmitEditing={handleCreateNewCollection}
                      editable={!isProcessing}
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />
                    
                    <View style={styles.moveModalButtons}>
                      <TouchableOpacity 
                        style={[
                          styles.moveModalButton, 
                          styles.moveModalButtonCancel,
                          isProcessing && styles.moveModalButtonDisabled
                        ]}
                        onPress={hideNewCollectionInput}
                        disabled={isProcessing}
                      >
                        <Text style={[
                          styles.moveModalButtonTextCancel,
                          isProcessing && styles.moveModalButtonTextDisabled
                        ]}>
                          Back
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[
                          styles.moveModalButton, 
                          styles.moveModalButtonCreate,
                          (!newCategoryName.trim() || isProcessing) && styles.moveModalButtonDisabled
                        ]}
                        onPress={handleCreateNewCollection}
                        disabled={!newCategoryName.trim() || isProcessing}
                      >
                        <Text style={[
                          styles.moveModalButtonTextCreate,
                          (!newCategoryName.trim() || isProcessing) && styles.moveModalButtonTextDisabled
                        ]}>
                          {isProcessing ? 'Creating...' : 'Create'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  const renderShelf = (shelf) => {
    // Don't render empty shelves
    if (shelf.books.length === 0) {
      return null;
    }

    return (
      <View key={shelf.id} style={styles.shelfContainer}>
        <View style={styles.shelfHeader}>
          <Text style={[styles.shelfTitle, isDarkMode && styles.shelfTitleDark]}>
            {shelf.title}
          </Text>
          {shelf.books.length > 0 && (
            <Text style={[styles.bookCount, isDarkMode && styles.bookCountDark]}>
              {shelf.books.length} {shelf.books.length === 1 ? 'book' : 'books'}
            </Text>
          )}
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shelfContent}
          scrollEventThrottle={16}
        >
          {shelf.books.map((book) => renderBook(book))}
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {shelves.map((shelf) => renderShelf(shelf)).filter(Boolean)}
        
        {/* Show empty message only if no shelves have books */}
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
  },
  shelfContainer: {
    marginBottom: 36,
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12,
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
    paddingRight: 4,
  },
  bookContainer: {
    alignItems: 'center',
    marginRight: 8,
  },
  book: {
    width: BOOK_WIDTH,
    height: BOOK_HEIGHT,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'visible',
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
    borderRadius: 0,
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
    fontWeight: '400',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 14,
    width: '100%',
    fontFamily: 'System',
  },
  bookLabelDark: {
    color: '#d1d5db',
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

  // Book Options Overlay
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  optionsContainer: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  optionsContainerDark: {
    backgroundColor: '#1a1a1a',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionsHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'System',
  },
  optionsTitleDark: {
    color: '#ffffff',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
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
  optionText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '400',
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

  // Move Modal Overlay - Smaller and positioned like options
  moveModalContainer: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    width: 180,
    maxHeight: 240,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  moveModalContainerDark: {
    backgroundColor: '#1a1a1a',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  moveModalHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  moveModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'left',
    fontFamily: 'System',
  },
  moveModalTitleDark: {
    color: '#ffffff',
  },
  categoryScrollList: {
    maxHeight: 140,
  },
  categoryModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  categoryModalItemDark: {
    borderBottomColor: '#374151',
  },
  categoryModalItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  categoryModalItemSelectedDark: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  categoryModalItemText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '400',
    fontFamily: 'System',
  },
  categoryModalItemTextDark: {
    color: '#f9fafb',
  },
  categoryModalItemTextSelected: {
    color: '#3b82f6',
  },
  categoryModalItemTextSelectedDark: {
    color: '#60a5fa',
  },
  categoryModalItemTextDisabled: {
    color: '#9ca3af',
  },
  newCategoryModalItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  newCategoryModalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newCategoryModalText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    fontFamily: 'System',
  },
  newCategoryModalTextDark: {
    color: '#60a5fa',
  },
  newCategoryModalTextDisabled: {
    color: '#9ca3af',
  },
  newCollectionInputContainer: {
    padding: 16,
  },
  moveModalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000000',
    marginBottom: 12,
    fontFamily: 'System',
  },
  moveModalInputDark: {
    borderColor: '#374151',
    color: '#ffffff',
    backgroundColor: '#0f0f0f',
  },
  moveModalInputDisabled: {
    opacity: 0.5,
  },
  moveModalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  moveModalButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  moveModalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  moveModalButtonCreate: {
    backgroundColor: '#3b82f6',
  },
  moveModalButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  moveModalButtonTextCancel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  moveModalButtonTextCreate: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
    fontFamily: 'System',
  },
  moveModalButtonTextDisabled: {
    color: '#d1d5db',
  },
});

export default BookShelf;