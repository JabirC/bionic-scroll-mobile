// src/utils/textExtractor.js
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { Asset } from 'expo-asset';

export class TextExtractor {
  async extractFromPDF(fileUri) {
    try {
      console.log('Starting PDF extraction from:', fileUri);
      
      // Read the PDF file
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Try advanced PDF extraction first
      let extractedText = await this.extractAdvancedPDFText(fileContent);
      
      // If that fails, try basic extraction
      if (!extractedText || extractedText.trim().length < 50) {
        extractedText = await this.extractBasicPDFText(fileContent);
      }
      
      // If text extraction completely fails, return pages for doom scrolling
      if (!extractedText || extractedText.trim().length < 20) {
        console.log('Text extraction failed, preparing for page-by-page viewing');
        return {
          text: null,
          pages: await this.extractPDFPages(fileContent),
          extractionFailed: true,
          message: 'Text extraction failed. This PDF will be displayed page by page.'
        };
      }
      
      const cleanedText = this.cleanupText(extractedText);
      
      if (cleanedText.split(' ').length < 50) {
        throw new Error('Insufficient readable text found');
      }
      
      return {
        text: cleanedText,
        extractionFailed: false
      };
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      
      // Try to extract pages for viewing
      try {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64
        });
        const pages = await this.extractPDFPages(fileContent);
        
        return {
          text: null,
          pages,
          extractionFailed: true,
          message: 'Text extraction failed. This PDF will be displayed page by page.'
        };
      } catch (pageError) {
        throw new Error('Failed to process PDF file');
      }
    }
  }

  async extractFromEPUB(fileUri) {
    try {
      console.log('Starting EPUB extraction from:', fileUri);
      
      // Read EPUB file
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // EPUB files are ZIP archives
      const extractedText = await this.extractEPUBContent(fileContent);
      
      if (!extractedText || extractedText.trim().length < 50) {
        return {
          text: null,
          extractionFailed: true,
          message: 'EPUB text extraction failed. File structure may be unsupported.'
        };
      }
      
      const cleanedText = this.cleanupText(extractedText);
      
      return {
        text: cleanedText,
        extractionFailed: false
      };
      
    } catch (error) {
      console.error('EPUB extraction error:', error);
      throw new Error('Failed to extract text from EPUB');
    }
  }

  async extractAdvancedPDFText(base64Content) {
    try {
      const binaryString = atob(base64Content);
      let text = '';
      
      // Look for text streams with more sophisticated patterns
      const streamRegex = /stream\s*\n([\s\S]*?)\nendstream/gi;
      let match;
      
      while ((match = streamRegex.exec(binaryString)) !== null) {
        const streamContent = match[1];
        
        // Try to decode if it's compressed (basic FlateDecode detection)
        if (streamContent.includes('/FlateDecode')) {
          continue; // Skip compressed streams for now
        }
        
        // Extract text operations
        const textOps = this.extractTextOperations(streamContent);
        text += textOps + ' ';
      }
      
      // Also try to extract from content streams
      const contentStreams = binaryString.match(/BT[\s\S]*?ET/g) || [];
      
      for (const stream of contentStreams) {
        const streamText = this.extractTextFromContentStream(stream);
        text += streamText + ' ';
      }
      
      return text.trim();
    } catch (error) {
      console.error('Advanced PDF extraction failed:', error);
      return '';
    }
  }

  extractTextOperations(streamContent) {
    let text = '';
    
    // Look for Tj operations (show text)
    const tjMatches = streamContent.match(/\(([^)]*)\)\s*Tj/g) || [];
    tjMatches.forEach(match => {
      const textMatch = match.match(/\(([^)]*)\)/);
      if (textMatch) {
        text += this.decodePDFText(textMatch[1]) + ' ';
      }
    });
    
    // Look for TJ operations (show text with positioning)
    const tjArrayMatches = streamContent.match(/\[(.*?)\]\s*TJ/g) || [];
    tjArrayMatches.forEach(match => {
      const content = match.match(/\[(.*?)\]/);
      if (content) {
        const strings = content[1].match(/\(([^)]*)\)/g) || [];
        strings.forEach(str => {
          const textMatch = str.match(/\(([^)]*)\)/);
          if (textMatch) {
            text += this.decodePDFText(textMatch[1]) + ' ';
          }
        });
      }
    });
    
    return text;
  }

  extractTextFromContentStream(stream) {
    let text = '';
    
    // More comprehensive text extraction
    const patterns = [
      /\(([^)]+)\)\s*Tj/g,
      /\[(.*?)\]\s*TJ/g,
      /'([^']*)'[\s\S]*?Tj/g,
      /"([^"]*)"[\s\S]*?Tj/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(stream)) !== null) {
        if (match[1]) {
          text += this.decodePDFText(match[1]) + ' ';
        }
      }
    });
    
    return text;
  }

  async extractBasicPDFText(base64Content) {
    try {
      const binaryString = atob(base64Content);
      return this.extractTextFromPDFBinary(binaryString);
    } catch (error) {
      console.error('Basic PDF extraction failed:', error);
      return '';
    }
  }

  async extractPDFPages(base64Content) {
    try {
      // For page-by-page viewing, we'll return the base64 content
      // Each "page" will be the PDF viewed as an image
      return [{
        pageNumber: 1,
        content: base64Content,
        type: 'pdf'
      }];
    } catch (error) {
      console.error('PDF page extraction failed:', error);
      return [];
    }
  }

  async extractEPUBContent(base64Content) {
    try {
      // Basic EPUB extraction - in production, use a proper ZIP library
      const binaryString = atob(base64Content);
      
      // Look for HTML content in EPUB
      const htmlPattern = /<html[\s\S]*?<\/html>/gi;
      const bodyPattern = /<body[\s\S]*?<\/body>/gi;
      const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      
      let text = '';
      let match;
      
      // Try to extract from body tags
      while ((match = bodyPattern.exec(binaryString)) !== null) {
        const bodyContent = match[1];
        
        // Extract paragraphs
        let pMatch;
        while ((pMatch = pPattern.exec(bodyContent)) !== null) {
          const pContent = pMatch[1];
          // Remove HTML tags
          const cleanContent = pContent.replace(/<[^>]*>/g, '').trim();
          if (cleanContent && cleanContent.length > 10) {
            text += cleanContent + '\n\n';
          }
        }
      }
      
      // If no body content found, try direct paragraph extraction
      if (!text) {
        while ((match = pPattern.exec(binaryString)) !== null) {
          const pContent = match[1];
          const cleanContent = pContent.replace(/<[^>]*>/g, '').trim();
          if (cleanContent && cleanContent.length > 10) {
            text += cleanContent + '\n\n';
          }
        }
      }
      
      return text.trim();
    } catch (error) {
      console.error('EPUB content extraction failed:', error);
      return '';
    }
  }

  extractTextFromPDFBinary(pdfData) {
    let text = '';
    
    try {
      // Enhanced text extraction with multiple strategies
      
      // Strategy 1: Look for text objects
      const textBlocks = pdfData.match(/BT[\s\S]*?ET/g) || [];
      
      for (const block of textBlocks) {
        // Extract using Tj operator
        const tjMatches = block.match(/\(([^)]+)\)\s*Tj/g) || [];
        tjMatches.forEach(match => {
          const textMatch = match.match(/\(([^)]+)\)/);
          if (textMatch) {
            const decoded = this.decodePDFText(textMatch[1]);
            if (this.isValidText(decoded)) {
              text += decoded + ' ';
            }
          }
        });
        
        // Extract using TJ operator
        const tjArrayMatches = block.match(/\[(.*?)\]\s*TJ/g) || [];
        tjArrayMatches.forEach(match => {
          const arrayContent = match.match(/\[(.*?)\]/);
          if (arrayContent) {
            const strings = arrayContent[1].match(/\(([^)]+)\)/g) || [];
            strings.forEach(str => {
              const textMatch = str.match(/\(([^)]+)\)/);
              if (textMatch) {
                const decoded = this.decodePDFText(textMatch[1]);
                if (this.isValidText(decoded)) {
                  text += decoded + ' ';
                }
              }
            });
          }
        });
      }
      
      // Strategy 2: Direct string extraction as fallback
      if (text.length < 100) {
        const stringPattern = /\(([^)]{5,})\)/g;
        let match;
        
        while ((match = stringPattern.exec(pdfData)) !== null) {
          const decoded = this.decodePDFText(match[1]);
          if (this.isValidText(decoded) && decoded.split(' ').length >= 2) {
            text += decoded + ' ';
          }
        }
      }
      
      return text.trim();
    } catch (error) {
      console.error('Error in PDF binary extraction:', error);
      return '';
    }
  }

  decodePDFText(str) {
    if (!str) return '';
    
    try {
      return str
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\([0-7]{1,3})/g, (match, octal) => {
          const code = parseInt(octal, 8);
          return (code >= 32 && code <= 126) ? String.fromCharCode(code) : ' ';
        })
        .trim();
    } catch (error) {
      return str;
    }
  }

  isValidText(text) {
    if (!text || text.length < 2) return false;
    
    // Check if text contains reasonable amount of letters
    const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = text.length;
    const letterRatio = letterCount / totalChars;
    
    // Must be at least 30% letters and have minimum length
    return letterRatio >= 0.3 && letterCount >= 3 && !/^[\s\d\-_.]+$/.test(text);
  }

  cleanupText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .replace(/([.!?])\s*\n+\s*([A-Z])/g, '$1\n\n$2')
      .replace(/([.!?])\s+([A-Z])/g, '$1 $2')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n +/g, '\n')
      .replace(/ +\n/g, '\n')
      .replace(/\s*\n\s*\n\s*/g, '\n\n')
      .trim();
  }
}