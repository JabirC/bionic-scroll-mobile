// src/components/BookCard.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BookCard = ({ book, onPress, onDelete, isDarkMode }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.abs(now - date) / 36e5;
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getProgressPercentage = () => {
    if (!book.readingPosition || !book.readingPosition.percentage) return 0;
    return book.readingPosition.percentage;
  };

  const progressPercentage = getProgressPercentage();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isDarkMode && styles.containerDark
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {/* Progress Indicator */}
        <View style={styles.indicatorContainer}>
          {progressPercentage > 0 ? (
            <View style={styles.progressRing}>
              <View style={[
                styles.progressBackground,
                isDarkMode && styles.progressBackgroundDark
              ]} />
              <View 
                style={[
                  styles.progressForeground,
                  { 
                    transform: [{ 
                      rotate: `${(progressPercentage / 100) * 360}deg` 
                    }] 
                  }
                ]} 
              />
              <View style={styles.progressCenter}>
                <View style={[
                  styles.progressDot,
                  isDarkMode && styles.progressDotDark
                ]} />
              </View>
            </View>
          ) : (
            <View style={[
              styles.indicatorDot,
              isDarkMode && styles.indicatorDotDark
            ]} />
          )}
        </View>

        {/* Book Info */}
        <View style={styles.bookInfo}>
          <Text 
            style={[
              styles.title,
              isDarkMode && styles.titleDark
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {book.name.replace(/\.(pdf|epub)$/i, '')}
          </Text>
          
          <View style={styles.metadata}>
            <Text style={[styles.date, isDarkMode && styles.dateDark]}>
              {formatDate(book.lastRead || book.dateAdded)}
            </Text>
            
            {progressPercentage > 0 && (
              <>
                <Text style={[styles.separator, isDarkMode && styles.separatorDark]}>
                  •
                </Text>
                <Text style={styles.progress}>
                  {Math.round(progressPercentage)}% read
                </Text>
              </>
            )}
            
            {book.metadata?.wordCount && (
              <>
                <Text style={[styles.separator, isDarkMode && styles.separatorDark]}>
                  •
                </Text>
                <Text style={[styles.wordCount, isDarkMode && styles.wordCountDark]}>
                  {book.metadata.wordCount.toLocaleString()} words
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.deleteButton, isDarkMode && styles.deleteButtonDark]}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="trash-outline" 
            size={18} 
            color={isDarkMode ? '#f87171' : '#ef4444'} 
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      {progressPercentage > 0 && (
        <View style={[styles.progressBar, isDarkMode && styles.progressBarDark]}>
          <View 
            style={[
              styles.progressBarFill,
              { width: `${progressPercentage}%` }
            ]} 
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  containerDark: {
    backgroundColor: '#1e293b',
    shadowOpacity: 0.3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  indicatorContainer: {
    width: 40,
    height: 40,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#e5e7eb',
  },
  progressBackgroundDark: {
    borderColor: '#374151',
  },
  progressForeground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderTopColor: '#2563eb',
    borderRightColor: '#2563eb',
  },
  progressCenter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  progressDotDark: {
    backgroundColor: '#60a5fa',
  },
  indicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d1d5db',
  },
  indicatorDotDark: {
    backgroundColor: '#64748b',
  },
  bookInfo: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
    lineHeight: 22,
  },
  titleDark: {
    color: '#f1f5f9',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  date: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  dateDark: {
    color: '#94a3b8',
  },
  separator: {
    fontSize: 14,
    color: '#9ca3af',
    marginHorizontal: 6,
  },
  separatorDark: {
    color: '#6b7280',
  },
  progress: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  wordCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  wordCountDark: {
    color: '#9ca3af',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteButtonDark: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f3f4f6',
  },
  progressBarDark: {
    backgroundColor: '#374151',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
});

export default BookCard;