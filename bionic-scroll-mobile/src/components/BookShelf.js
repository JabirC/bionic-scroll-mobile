// src/components/BookShelf.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const BOOK_WIDTH = (width - 80) / 3; // Adjusted for better spacing
const BOOK_HEIGHT = BOOK_WIDTH * 1.4;
const BOOKS_PER_SHELF = 3;

const BookShelf = ({ books, onBookPress, onDeleteBook, isDarkMode }) => {
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
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#a8edea', '#fed6e3'],
      ['#ff9a9e', '#fecfef'],
      ['#ffecd2', '#fcb69f'],
      ['#84fab0', '#8fd3f4'],
      ['#a18cd1', '#fbc2eb'],
    ];
    
    const hash = book.name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Organize books into shelves
  const organizeIntoShelves = () => {
    const shelves = [];
    let currentShelf = [];
    
    books.forEach((book, index) => {
      currentShelf.push(book);
      
      // When shelf is full or we've reached the last book
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

    return (
      <View key={book.id} style={styles.bookContainer}>
        <TouchableOpacity
          style={[
            styles.book,
            isSelected && styles.bookSelected,
            isDarkMode && styles.bookDark
          ]}
          onPress={() => onBookPress(book)}
          onLongPress={() => setSelectedBook(isSelected ? null : book.id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={coverColors}
            style={styles.bookCover}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.bookContent}>
              <Text style={styles.bookTitle} numberOfLines={3}>
                {book.name.replace(/\.(pdf|epub)$/i, '')}
              </Text>
              
              <View style={styles.fileTypeIndicator}>
                <Text style={styles.fileType}>
                  {book.type === 'application/pdf' ? 'PDF' : 'EPUB'}
                </Text>
              </View>
            </View>
            
            {progress > 0 && (
              <View style={styles.progressOverlay}>
                <View style={[
                  styles.progressIndicator,
                  { width: `${progress}%` }
                ]} />
              </View>
            )}
            
            <View style={[styles.bookSpine, isDarkMode && styles.bookSpineDark]} />
          </LinearGradient>
          
          {isSelected && (
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
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {book.name.replace(/\.(pdf|epub)$/i, '')}
          </Text>
          
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
        </View>
      </View>
    );
  };

  const renderShelf = (books, shelfIndex) => (
    <View key={shelfIndex} style={styles.shelfContainer}>
      <View style={styles.shelfBooks}>
        {books.map(book => renderBook(book))}
        
        {/* Fill empty positions with placeholders */}
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
    paddingBottom: 140, // Account for floating tab bar
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
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  bookSelected: {
    transform: [{ scale: 0.95 }],
  },
  bookDark: {
    shadowOpacity: 0.4,
  },
  bookCover: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  bookContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  bookTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 16,
    marginBottom: 8,
  },
  fileTypeIndicator: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  fileType: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: '#ffffff',
    opacity: 0.8,
  },
  bookSpine: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  bookSpineDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bookInfo: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
  },
  bookLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 14,
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
    fontWeight: '500',
  },
  bookDateDark: {
    color: '#9ca3af',
  },
  bookProgress: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '600',
  },
});

export default BookShelf;