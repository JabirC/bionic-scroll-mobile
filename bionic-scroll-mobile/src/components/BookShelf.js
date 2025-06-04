// src/components/BookShelf.js
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Progress from 'react-native-progress';

const { width: screenWidth } = Dimensions.get('window');
const BOOK_WIDTH = 100;
const BOOK_HEIGHT = BOOK_WIDTH * 1.4;
const MAX_OPTION_TITLE_LENGTH = 25;

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
  
  const optionsScale = useRef(new Animated.Value(0)).current;
  const optionsOpacity = useRef(new Animated.Value(0)).current;
  
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

  // Handle move to collection button press
  const handleMoveToCollection = () => {
    if (isProcessing) return;
    
    hideBookOptions();
    setTimeout(() => {
      setBookToMove(selectedBook);
      setShowMoveModal(true);
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

  // Close all modals and reset state
  const closeAllModals = () => {
    setShowMoveModal(false);
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    setBookToMove(null);
    setIsProcessing(false);
  };

  // Handle moving book to existing collection
  const handleMoveToExistingCollection = async (targetCategoryId) => {
    if (isProcessing || !bookToMove) return;

    // Don't do anything if it's already in this category
    if (bookToMove.categoryId === targetCategoryId) {
      closeAllModals();
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Moving book to existing collection:', bookToMove.id, 'to category:', targetCategoryId);
      
      const success = await onBookCategoryChange(bookToMove.id, targetCategoryId);
      
      if (success !== false) {
        console.log('Successfully moved book to existing collection');
        closeAllModals();
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
        closeAllModals();
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

  const renderShelf = (shelf) => {
    // Only render shelves that have books, except for the default "All" shelf
    if (shelf.books.length === 0 && !shelf.isDefault) {
      return null;
    }

    return (
      <View key={shelf.id} style={styles.shelfContainer}>
        <View style={styles.shelfHeader}>
          <Text style={[styles.shelfTitle, isDarkMode && styles.shelfTitleDark]}>
            {shelf.title}
          </Text>
          {!shelf.isDefault && shelf.books.length > 0 && (
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
          
          {shelf.books.length === 0 && shelf.isDefault && (
            <View style={[styles.emptyShelf, isDarkMode && styles.emptyShelfDark]}>
              <Ionicons 
                name="book-outline" 
                size={32} 
                color={isDarkMode ? '#374151' : '#d1d5db'} 
              />
              <Text style={[styles.emptyShelfText, isDarkMode && styles.emptyShelfTextDark]}>
                No books yet
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderMoveToCollectionModal = () => {
    if (!showMoveModal || !bookToMove) return null;

    return (
      <Modal
        visible={showMoveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAllModals}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
              Move to Collection
            </Text>
            
            {!showNewCategoryInput ? (
              <>
                <View style={styles.categoryList}>
                  {shelves.map(shelf => (
                    <TouchableOpacity
                      key={shelf.id}
                      style={[
                        styles.categoryItem,
                        isDarkMode && styles.categoryItemDark,
                        bookToMove?.categoryId === shelf.id && styles.categoryItemSelected,
                        bookToMove?.categoryId === shelf.id && isDarkMode && styles.categoryItemSelectedDark
                      ]}
                      onPress={() => handleMoveToExistingCollection(shelf.id)}
                      disabled={isProcessing}
                    >
                      <Text style={[
                        styles.categoryItemText,
                        isDarkMode && styles.categoryItemTextDark,
                        bookToMove?.categoryId === shelf.id && styles.categoryItemTextSelected,
                        bookToMove?.categoryId === shelf.id && isDarkMode && styles.categoryItemTextSelectedDark,
                        isProcessing && styles.categoryItemTextDisabled
                      ]}>
                        {shelf.title}
                      </Text>
                      
                      {bookToMove?.categoryId === shelf.id && (
                        <Ionicons 
                          name="checkmark" 
                          size={20} 
                          color="#3b82f6" 
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      styles.newCategoryItem,
                      isDarkMode && styles.categoryItemDark,
                    ]}
                    onPress={showNewCollectionInput}
                    disabled={isProcessing}
                  >
                    <View style={styles.newCategoryContent}>
                      <Ionicons 
                        name="add-circle-outline" 
                        size={20} 
                        color={isProcessing ? '#9ca3af' : '#3b82f6'} 
                      />
                      <Text style={[
                        styles.newCategoryText, 
                        isDarkMode && styles.newCategoryTextDark,
                        isProcessing && styles.newCategoryTextDisabled
                      ]}>
                        Create New Collection
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.modalButton, 
                    styles.modalButtonCancel, 
                    styles.modalButtonFull,
                    isProcessing && styles.modalButtonDisabled
                  ]}
                  onPress={closeAllModals}
                  disabled={isProcessing}
                >
                  <Text style={[
                    styles.modalButtonTextCancel,
                    isProcessing && styles.modalButtonTextDisabled
                  ]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={[
                    styles.modalInput, 
                    isDarkMode && styles.modalInputDark,
                    isProcessing && styles.modalInputDisabled
                  ]}
                  placeholder="Collection name"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  autoFocus
                  onSubmitEditing={handleCreateNewCollection}
                  editable={!isProcessing}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.modalButton, 
                      styles.modalButtonCancel,
                      isProcessing && styles.modalButtonDisabled
                    ]}
                    onPress={hideNewCollectionInput}
                    disabled={isProcessing}
                  >
                    <Text style={[
                      styles.modalButtonTextCancel,
                      isProcessing && styles.modalButtonTextDisabled
                    ]}>
                      Back
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.modalButton, 
                      styles.modalButtonCreate,
                      (!newCategoryName.trim() || isProcessing) && styles.modalButtonDisabled
                    ]}
                    onPress={handleCreateNewCollection}
                    disabled={!newCategoryName.trim() || isProcessing}
                  >
                    <Text style={[
                      styles.modalButtonTextCreate,
                      (!newCategoryName.trim() || isProcessing) && styles.modalButtonTextDisabled
                    ]}>
                      {isProcessing ? 'Creating...' : 'Create & Move'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  emptyShelf: {
    width: BOOK_WIDTH,
    height: BOOK_HEIGHT,
    borderRadius: 0,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229, 231, 235, 0.2)',
  },
  emptyShelfDark: {
    borderColor: '#374151',
    backgroundColor: 'rgba(55, 65, 81, 0.2)',
  },
  emptyShelfText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    fontFamily: 'System',
  },
  emptyShelfTextDark: {
    color: '#6b7280',
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

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContentDark: {
    backgroundColor: '#1a1a1a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'System',
  },
  modalTitleDark: {
    color: '#ffffff',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    marginBottom: 24,
    fontFamily: 'System',
  },
  modalInputDark: {
    borderColor: '#374151',
    color: '#ffffff',
    backgroundColor: '#0f0f0f',
  },
  modalInputDisabled: {
    opacity: 0.5,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonFull: {
    marginTop: 12,
    flex: undefined,
    width: '100%',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonCreate: {
    backgroundColor: '#3b82f6',
  },
  modalButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalButtonTextCreate: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalButtonTextDisabled: {
    color: '#d1d5db',
  },
  categoryList: {
    marginBottom: 16,
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryItemDark: {
    backgroundColor: '#1f2937',
  },
  categoryItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  categoryItemSelectedDark: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    fontFamily: 'System',
  },
  categoryItemTextDark: {
    color: '#f9fafb',
  },
  categoryItemTextSelected: {
    color: '#3b82f6',
  },
  categoryItemTextSelectedDark: {
    color: '#60a5fa',
  },
  categoryItemTextDisabled: {
    color: '#9ca3af',
  },
  newCategoryItem: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
    backgroundColor: 'transparent',
  },
  newCategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newCategoryText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
    fontFamily: 'System',
  },
  newCategoryTextDark: {
    color: '#60a5fa',
  },
  newCategoryTextDisabled: {
    color: '#9ca3af',
  },
});

export default BookShelf;