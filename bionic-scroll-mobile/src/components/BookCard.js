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

  const getProgressWidth = () => {
    if (!book.readingPosition || !book.readingPosition.percentage) return 0;
    return book.readingPosition.percentage;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isDarkMode && styles.containerDark
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[styles.indicator, isDarkMode && styles.indicatorDark]}>
          <View style={styles.progressRing}>
            <View 
              style={[
                styles.progressFill,
                { 
                  transform: [{ 
                    rotate: `${(getProgressWidth() / 100) * 360}deg` 
                  }] 
                }
              ]} 
            />
          </View>
          <View style={[styles.indicatorDot, isDarkMode && styles.indicatorDotDark]} />
        </View>

        <View style={styles.info}>
          <Text 
            style={[
              styles.title,
              isDarkMode && styles.titleDark
            ]}
            numberOfLines={2}
          >
            {book.name.replace(/\.(pdf|epub)$/i, '')}
          </Text>
          
          <View style={styles.metadata}>
            <Text style={[styles.date, isDarkMode && styles.dateDark]}>
              {formatDate(book.lastRead || book.dateAdded)}
            </Text>
            
            {getProgressWidth() > 0 && (
              <Text style={[styles.progress, isDarkMode && styles.progressDark]}>
                • {Math.round(getProgressWidth())}% read
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, isDarkMode && styles.deleteButtonDark]}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name="trash-outline" 
            size={18} 
            color={isDarkMode ? '#f87171' : '#ef4444'} 
          />
        </TouchableOpacity>
      </View>

      {/* Progress bar at bottom */}
      {getProgressWidth() > 0 && (
        <View style={[styles.progressBar, isDarkMode && styles.progressBarDark]}>
          <View 
            style={[
              styles.progressBarFill,
              { width: `${getProgressWidth()}%` }
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
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  containerDark: {
    backgroundColor: '#1e293b',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  indicator: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  progressRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  progressFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  indicatorDotDark: {
    backgroundColor: '#64748b',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 22,
  },
  titleDark: {
    color: '#f3f4f6',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },
  dateDark: {
    color: '#94a3b8',
  },
  progress: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  progressDark: {
    color: '#60a5fa',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteButtonDark: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  progressBar: {
    height: 3,
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