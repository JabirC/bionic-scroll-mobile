// src/components/BookShelf.js
import React, { useState } from 'react';
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
  onDeleteCategory,
  onBookCategoryChange,
  isDarkMode, 
  selectedBook, 
  onBookLongPress,
}) => {
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [bookToMove, setBookToMove] = useState(null);
  
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

  const handleDeleteCategory = (categoryId, categoryName) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${categoryName}"? Books will be moved to "All".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteCategory(categoryId),
        },
      ]
    );
  };

  const handleMoveBook = (book) => {
    setBookToMove(book);
    setShowMoveModal(true);
  };

  const handleBookAction = (book) => {
    if (selectedBook === book.id) {
      // Already selected, show actions
      Alert.alert(
        'Book Actions',
        `"${book.name.replace(/\.(pdf|epub)$/i, '')}"`,
        [
          {
            text: 'Move to Category',
            onPress: () => handleMoveBook(book),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDeleteBook(book.id),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => onBookLongPress(null),
          },
        ]
      );
    } else {
      onBookLongPress(book.id);
    }
  };

  const renderBook = (book) => {
    const progress = getProgressPercentage(book);
    const coverColors = generateBookCover(book);
    const isSelected = selectedBook === book.id;
    const cleanTitle = book.name.replace(/\.(pdf|epub)$/i, '');
    const isUploading = book.isUploading || uploadingBooks.has(book.id);
    const uploadProgress = uploadingBooks.get(book.id) || 0;
    const isNewlyUploaded = book.isNewlyUploaded && !isUploading;

    return (
      <View style={styles.bookContainer}>
        <TouchableOpacity
          style={[
            styles.book,
            isSelected && styles.bookSelected,
            isDarkMode && styles.bookDark,
            isUploading && styles.bookUploading
          ]}
          onPress={() => !isUploading && onBookPress(book)}
          onLongPress={() => !isUploading && handleBookAction(book)}
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
            <View style={styles.bookActionIndicator} />
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

  const renderShelf = (shelf) => {
    return (
      <View key={shelf.id} style={styles.shelfContainer}>
        <View style={styles.shelfHeader}>
          <Text style={[styles.shelfTitle, isDarkMode && styles.shelfTitleDark]}>
            {shelf.title}
          </Text>
          {!shelf.isDefault && (
            <TouchableOpacity
              style={styles.deleteCategoryButton}
              onPress={() => handleDeleteCategory(shelf.id, shelf.title)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name="trash-outline" 
                size={18} 
                color={isDarkMode ? '#ef4444' : '#dc2626'} 
              />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shelfContent}
          scrollEventThrottle={16}
        >
          {shelf.books.map((book) => (
            <View key={book.id}>
              {renderBook(book)}
            </View>
          ))}
          
          {shelf.books.length === 0 && (
            <View style={[styles.emptyShelf, isDarkMode && styles.emptyShelfDark]}>
              <Ionicons 
                name="book-outline" 
                size={32} 
                color={isDarkMode ? '#374151' : '#d1d5db'} 
              />
              <Text style={[styles.emptyShelfText, isDarkMode && styles.emptyShelfTextDark]}>
                Empty
              </Text>
            </View>
          )}
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

      {/* Create Category Modal */}
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

      {/* Move Book Modal */}
      <Modal
        visible={showMoveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMoveModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
              Move to Category
            </Text>
            
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
                  onPress={() => {
                    if (bookToMove) {
                      onBookCategoryChange(bookToMove.id, shelf.id);
                      setShowMoveModal(false);
                      setBookToMove(null);
                      onBookLongPress(null);
                    }
                  }}
                >
                  <Text style={[
                    styles.categoryItemText,
                    isDarkMode && styles.categoryItemTextDark,
                    bookToMove?.categoryId === shelf.id && styles.categoryItemTextSelected,
                    bookToMove?.categoryId === shelf.id && isDarkMode && styles.categoryItemTextSelectedDark
                  ]}>
                    {shelf.title}
                  </Text>
                  
                  {bookToMove?.categoryId === shelf.id && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonCancel, styles.modalButtonFull]}
              onPress={() => {
                setShowMoveModal(false);
                setBookToMove(null);
                onBookLongPress(null);
              }}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
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
    marginBottom: 36,
    paddingTop: 12, // Added padding to prevent delete button cutoff
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24, // Aligned with header
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
  deleteCategoryButton: {
    padding: 6,
  },
  shelfContent: {
    paddingLeft: 24, // Aligned with header
    paddingRight: 4,
  },
  emptyShelf: {
    width: BOOK_WIDTH,
    height: BOOK_HEIGHT,
    borderRadius: 12,
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
    marginRight: 8, // Reduced from 16 to 8
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
  bookActionIndicator: {
    position: 'absolute',
    bottom: -4,
    left: BOOK_WIDTH / 2 - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
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
    paddingHorizontal: 24,
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
  categoryList: {
    marginBottom: 16,
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
});

export default BookShelf;