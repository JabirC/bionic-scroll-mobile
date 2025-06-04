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
  Alert,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Progress from 'react-native-progress';

const { width: screenWidth } = Dimensions.get('window');
const BOOK_WIDTH = 100;
const BOOK_HEIGHT = BOOK_WIDTH * 1.4;

const BookShelf = ({ 
  shelves, 
  uploadingBooks, 
  onBookPress, 
  onDeleteBook, 
  onCreateCategory,
  onAddBookToCategory,
  isDarkMode, 
  selectedBook, 
  onBookLongPress,
  isAddMode 
}) => {
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const bookAnimations = useRef({}).current;

  const getBookAnimation = (bookId) => {
    if (!bookAnimations[bookId]) {
      bookAnimations[bookId] = new Animated.Value(0);
    }
    return bookAnimations[bookId];
  };

  const animateBookAddition = (bookId) => {
    const animation = getBookAnimation(bookId);
    animation.setValue(-BOOK_WIDTH);
    
    Animated.spring(animation, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

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

  const handleCreateCategorySubmit = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    
    await onCreateCategory(newCategoryName.trim());
    setNewCategoryName('');
    setShowCreateCategory(false);
  };

  const renderBook = (book) => {
    const progress = getProgressPercentage(book);
    const coverColors = generateBookCover(book);
    const isSelected = selectedBook === book.id;
    const cleanTitle = book.name.replace(/\.(pdf|epub)$/i, '');
    const isUploading = book.isUploading || uploadingBooks.has(book.id);
    const uploadProgress = uploadingBooks.get(book.id) || 0;
    const isNewlyUploaded = book.isNewlyUploaded && !isUploading;
    
    const bookAnimation = getBookAnimation(book.id);

    useEffect(() => {
      if (isUploading && !book.animated) {
        animateBookAddition(book.id);
        book.animated = true;
      }
    }, [isUploading]);

    return (
      <Animated.View 
        style={[
          styles.bookContainer,
          {
            transform: [{ translateX: bookAnimation }],
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.book,
            isSelected && styles.bookSelected,
            isDarkMode && styles.bookDark,
            isUploading && styles.bookUploading
          ]}
          onPress={() => !isUploading && onBookPress(book)}
          onLongPress={() => !isUploading && onBookLongPress(isSelected ? null : book.id)}
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
          
          {isSelected && !isUploading && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                onDeleteBook(book.id);
                onBookLongPress(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={16} color="#ffffff" />
            </TouchableOpacity>
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
      </Animated.View>
    );
  };

  const renderAddBookTemplate = (shelfId) => (
    <TouchableOpacity
      style={[
        styles.bookContainer,
        styles.addBookContainer
      ]}
      onPress={() => onAddBookToCategory(shelfId)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.book,
        styles.addBookTemplate,
        isDarkMode && styles.addBookTemplateDark
      ]}>
        <Ionicons 
          name="add" 
          size={40} 
          color={isDarkMode ? '#6b7280' : '#9ca3af'} 
        />
      </View>
      <Text style={[styles.addBookLabel, isDarkMode && styles.addBookLabelDark]}>
        Add Book
      </Text>
    </TouchableOpacity>
  );

  const renderShelf = (shelf) => {
    return (
      <View key={shelf.id} style={styles.shelfContainer}>
        <View style={styles.shelfHeader}>
          <Text style={[styles.shelfTitle, isDarkMode && styles.shelfTitleDark]}>
            {shelf.title}
          </Text>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shelfContent}
          scrollEventThrottle={16}
        >
          {isAddMode && renderAddBookTemplate(shelf.id)}
          {shelf.books.map((book) => (
            <View key={book.id}>
              {renderBook(book)}
            </View>
          ))}
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
        {shelves.map((shelf) => renderShelf(shelf))}
        
        <TouchableOpacity 
          style={[styles.addCategoryButton, isDarkMode && styles.addCategoryButtonDark]}
          onPress={() => setShowCreateCategory(true)}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="add-circle-outline" 
            size={24} 
            color={isDarkMode ? '#9ca3af' : '#6b7280'} 
          />
          <Text style={[styles.addCategoryText, isDarkMode && styles.addCategoryTextDark]}>
            Create Category
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showCreateCategory}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateCategory(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
              New Category
            </Text>
            
            <TextInput
              style={[styles.modalInput, isDarkMode && styles.modalInputDark]}
              placeholder="Category name"
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
              onSubmitEditing={handleCreateCategorySubmit}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setNewCategoryName('');
                  setShowCreateCategory(false);
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCreate]}
                onPress={handleCreateCategorySubmit}
              >
                <Text style={styles.modalButtonTextCreate}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 40,
  },
  shelfHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
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
  shelfContent: {
    paddingLeft: 20,
    paddingRight: 4,
  },
  bookContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  addBookContainer: {
    marginRight: 16,
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
  bookSelected: {
    transform: [{ scale: 0.95 }],
  },
  bookDark: {
    shadowOpacity: 0.3,
  },
  addBookTemplate: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBookTemplateDark: {
    borderColor: '#374151',
  },
  addBookLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '400',
    fontFamily: 'System',
  },
  addBookLabelDark: {
    color: '#6b7280',
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
  deleteButton: {
    position: 'absolute',
    top: -12,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
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
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  addCategoryButtonDark: {
    backgroundColor: 'transparent',
  },
  addCategoryText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  addCategoryTextDark: {
    color: '#9ca3af',
  },
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
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonCreate: {
    backgroundColor: '#3b82f6',
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
});

export default BookShelf;