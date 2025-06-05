// src/utils/bookProcessor.js
import { TextProcessor } from './textProcessor';

export class BookProcessor {
  constructor() {
    this.textProcessor = new TextProcessor();
    this.processedBooks = new Map(); // Cache for processed books
    this.processingQueue = new Map(); // Track books being processed
  }

  async processBook(book, bookData, settings) {
    const cacheKey = `${book.id}_${settings.fontSize}_${settings.bionicMode}`;
    
    // Return cached version if available
    if (this.processedBooks.has(cacheKey)) {
      console.log('Returning cached processed book');
      return this.processedBooks.get(cacheKey);
    }

    // If already processing, wait for it
    if (this.processingQueue.has(cacheKey)) {
      console.log('Waiting for book processing to complete');
      return this.processingQueue.get(cacheKey);
    }

    // Start processing
    console.log('Starting book processing');
    const processPromise = this._processBookInternal(book, bookData, settings, cacheKey);
    this.processingQueue.set(cacheKey, processPromise);

    try {
      const result = await processPromise;
      this.processedBooks.set(cacheKey, result);
      return result;
    } finally {
      this.processingQueue.delete(cacheKey);
    }
  }

  async _processBookInternal(book, bookData, settings, cacheKey) {
    return new Promise((resolve) => {
      // Use setTimeout to make processing non-blocking
      setTimeout(() => {
        try {
          const isPDF = book.type === 'application/pdf';
          const isPageMode = isPDF || bookData.extractionFailed;

          if (isPDF && bookData.originalPages) {
            resolve({
              sections: bookData.originalPages,
              isPageMode: true,
              settings
            });
            return;
          }

          if (!bookData.text) {
            resolve({
              sections: [],
              isPageMode: true,
              settings,
              error: 'No content available'
            });
            return;
          }

          this.textProcessor.setFontSize(settings.fontSize || 22);
          const rawSections = this.textProcessor.splitTextIntoScreenSections(bookData.text);
          
          // Process sections in batches to avoid blocking
          this._processSectionsBatched(rawSections, settings.bionicMode || false)
            .then(processedSections => {
              resolve({
                sections: processedSections,
                isPageMode: false,
                settings
              });
            });

        } catch (error) {
          console.error('Error in book processing:', error);
          resolve({
            sections: [],
            isPageMode: true,
            settings,
            error: error.message
          });
        }
      }, 0);
    });
  }

  async _processSectionsBatched(sections, isBionic, batchSize = 5) {
    const processedSections = [];
    
    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);
      
      // Process batch
      const batchResults = batch.map(section => 
        this.textProcessor.processSection(section, isBionic)
      );
      
      processedSections.push(...batchResults);
      
      // Yield control to prevent blocking
      if (i + batchSize < sections.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return processedSections;
  }

  // Pre-process books in background when they're uploaded
  async preProcessBook(book, bookData) {
    const defaultSettings = [
      { fontSize: 18, bionicMode: false },
      { fontSize: 22, bionicMode: false },
      { fontSize: 26, bionicMode: false },
      { fontSize: 18, bionicMode: true },
      { fontSize: 22, bionicMode: true },
      { fontSize: 26, bionicMode: true },
    ];

    // Process in background without blocking
    setTimeout(async () => {
      for (const settings of defaultSettings) {
        try {
          await this.processBook(book, bookData, settings);
        } catch (error) {
          console.warn('Background processing failed for settings:', settings, error);
        }
      }
    }, 100);
  }

  clearCache() {
    this.processedBooks.clear();
    this.processingQueue.clear();
  }

  removeCachedBook(bookId) {
    for (const key of this.processedBooks.keys()) {
      if (key.startsWith(bookId)) {
        this.processedBooks.delete(key);
      }
    }
    for (const key of this.processingQueue.keys()) {
      if (key.startsWith(bookId)) {
        this.processingQueue.delete(key);
      }
    }
  }
}

// Global instance
export const bookProcessor = new BookProcessor();