// src/components/BookShelf.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const BOOK_WIDTH = (width - 60) / 3;
const BOOK_HEIGHT = BOOK_WIDTH * 1.4;

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
    // Generate a gradient based on book name
    const colors = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#a8edea', '#fed6e3'],
      ['#ff9a9e', '#fecfef'],
      ['#ffecd2', '#fcb69f'],
    ];
    
    const hash = book.name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const renderBook = ({ item, index }) => {
    const progress = getProgressPercentage(item);
    const coverColors = generateBookCover(item);
    const isSelected = selectedBook === item.id;

    return (
      <View style={styles.bookContainer}>
        <TouchableOpacity
          style={[
            styles.book,
            isSelected && styles.bookSelected,
            isDarkMode && styles.bookDark
          ]}
          onPress={() => onBookPress(item)}
          onLongPress={() => setSelectedBook(isSelected ? null : item.id)}
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
                {item.name.replace(/\.(pdf|epub)$/i, '')}
              </Text>
              
              {/* File type indicator */}
              <View style={styles.fileTypeIndicator}>
                <Text style={styles.fileType}>
                  {item.type === 'application/pdf' ? 'PDF' : 'EPUB'}
                </Text>
              </View>
            </View>
            
            {/* Progress overlay */}
            {progress > 0 && (
              <View style={styles.progressOverlay}>
                <View style={[
                  styles.progressIndicator,
                  { width: `${progress}%` }
                ]} />
              </View>
            )}
            
            {/* Spine effect */}
            <View style={[styles.bookSpine, isDarkMode && styles.bookSpineDark]} />
          </LinearGradient>
          
          {isSelected && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                onDeleteBook(item.id);
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
            {item.name.replace(/\.(pdf|epub)$/i, '')}
          </Text>
          
          <View style={styles.bookMeta}>
            <Text style={[styles.bookDate, isDarkMode && styles.bookDateDark]}>
              {formatDate(item.lastRead || item.dateAdded)}
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

  const renderShelf = () => (
    <View style={[styles.shelf, isDarkMode && styles.shelfDark]} />
  );

  return (
    <FlatList
      data={books}
      renderItem={renderBook}
      keyExtractor={(item) => item.id}
      numColumns={3}
      contentContainerStyle={styles.container}
      columnWrapperStyle={styles.row}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListFooterComponent={books.length > 0 ? renderShelf : null}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  separator: {
    height: 20,
  },
  shelf: {
    height: 8,
    backgroundColor: '#8b5cf6',
    marginTop: 10,
    marginHorizontal: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shelfDark: {
    backgroundColor: '#7c3aed',
  },
  bookContainer: {
    width: BOOK_WIDTH,
    alignItems: 'center',
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