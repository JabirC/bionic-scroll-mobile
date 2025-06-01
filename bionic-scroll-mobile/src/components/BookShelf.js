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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Progress from 'react-native-progress';

const { width } = Dimensions.get('window');
const BOOK_WIDTH = (width - 80) / 3;
const BOOK_HEIGHT = BOOK_WIDTH * 1.4;
const BOOKS_PER_SHELF = 3;

const BookShelf = ({ books, uploadingBooks, onBookPress, onDeleteBook, isDarkMode }) => {
  const [selectedBook, setSelectedBook] = useState(null);

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

  const organizeIntoShelves = () => {
    const shelves = [];
    let currentShelf = [];
    
    books.forEach((book, index) => {
      currentShelf.push(book);
      
      if (currentShelf.length === BOOKS_PER_SHELF || index === books.length - 1) {
        shelves.push([...currentShelf]);
        currentShelf = [];
      }
    });
    
    return shelves;
  };

  const renderBook = (book) => {
    const progress = getProgressPercentage(book);
    const coverColors = generateBookCover(book);
    const isSelected = selectedBook === book.id;
    const cleanTitle = book.name.replace(/\.(pdf|epub)$/i, '');
    const isUploading = book.isUploading || uploadingBooks.has(book.id);
    const uploadProgress = uploadingBooks.get(book.id) || 0;

    return (
      <View key={book.id} style={styles.bookContainer}>
        <TouchableOpacity
          style={[
            styles.book,
            isSelected && styles.bookSelected,
            isDarkMode && styles.bookDark,
            isUploading && styles.bookUploading
          ]}
          onPress={() => !isUploading && onBookPress(book)}
          onLongPress={() => !isUploading && setSelectedBook(isSelected ? null : book.id)}
          activeOpacity={isUploading ? 1 : 0.8}
          disabled={isUploading}
        >
          {book.coverImage ? (
            <View style={styles.bookCover}>
              <Image 
                source={{ uri: book.coverImage }}
                style={styles.coverImage}
                resizeMode="cover"
              />
              <View style={styles.fileTypeOverlay}>
                <Text style={styles.fileType}>
                  {book.type === 'application/pdf' ? 'PDF' : 'EPUB'}
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
                
                <View style={styles.fileTypeIndicator}>
                  <Text style={styles.fileType}>
                    {book.type === 'application/pdf' ? 'PDF' : 'EPUB'}
                  </Text>
                </View>
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
          
          <View style={[styles.bookSpine, isDarkMode && styles.bookSpineDark]} />
          
          {isSelected && !isUploading && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                onDeleteBook(book.id);
                setSelectedBook(null);
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
              
              {progress > 0 && (
                <Text style={styles.bookProgress}>
                  {Math.round(progress)}%
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderShelf = (books, shelfIndex) => (
    <View key={shelfIndex} style={styles.shelfContainer}>
      <View style={styles.shelfBooks}>
        {books.map(book => renderBook(book))}
        
        {Array.from({ length: BOOKS_PER_SHELF - books.length }).map((_, index) => (
          <View key={`empty-${shelfIndex}-${index}`} style={styles.emptyBookSlot} />
        ))}
      </View>
    </View>
  );

  const shelves = organizeIntoShelves();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {shelves.map((shelfBooks, index) => renderShelf(shelfBooks, index))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 140,
  },
  shelfContainer: {
    marginBottom: 40,
  },
  shelfBooks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  bookContainer: {
    width: BOOK_WIDTH,
    alignItems: 'center',
  },
  emptyBookSlot: {
    width: BOOK_WIDTH,
  },
  book: {
    width: BOOK_WIDTH - 10,
    height: BOOK_HEIGHT,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  bookUploading: {
    opacity: 0.8,
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  fileTypeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    color: '#ffffff',
    fontWeight: '600',
  },
  bookContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
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
  fileTypeIndicator: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backdropFilter: 'blur(10px)',
  },
  fileType: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'System',
  },
  bookSpine: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  bookSpineDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bookInfo: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
    height: 32,
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
    color: '#000000',
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default BookShelf;