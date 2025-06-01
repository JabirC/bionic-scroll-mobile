// src/utils/pdfExtractor.js
import * as FileSystem from 'expo-file-system';

export class PDFExtractor {
  async extractText(fileUri) {
    try {
      console.log('Starting PDF text extraction...');
      
      // Read PDF file as base64
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert to binary for processing
      const binaryString = atob(fileContent);
      
      // Try multiple extraction methods
      let extractedText = await this.tryAdvancedExtraction(binaryString);
      
      if (!extractedText || extractedText.length < 100) {
        extractedText = await this.tryBasicExtraction(binaryString);
      }
      
      if (!extractedText || extractedText.length < 50) {
        console.log('Text extraction failed, returning for page viewing');
        return {
          text: null,
          extractionFailed: true,
          message: 'Text extraction failed. Document will be displayed in page view mode.',
          originalFormat: true
        };
      }
      
      const cleanedText = this.cleanupText(extractedText);
      const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;
      
      if (wordCount < 50) {
        return {
          text: null,
          extractionFailed: true,
          message: 'Insufficient text content found. Document will be displayed in page view mode.',
          originalFormat: true
        };
      }
      
      return {
        text: cleanedText,
        extractionFailed: false,
        metadata: {
          wordCount,
          characterCount: cleanedText.length,
          extractionMethod: 'advanced'
        }
      };
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      return {
        text: null,
        extractionFailed: true,
        message: 'Unable to process PDF. Document will be displayed in page view mode.',
        originalFormat: true,
        error: error.message
      };
    }
  }
  
  async tryAdvancedExtraction(binaryData) {
    try {
      let text = '';
      
      // Method 1: Extract from content streams
      text += this.extractFromContentStreams(binaryData);
      
      // Method 2: Extract from text objects
      if (text.length < 100) {
        text += this.extractFromTextObjects(binaryData);
      }
      
      // Method 3: Extract from XObjects
      if (text.length < 100) {
        text += this.extractFromXObjects(binaryData);
      }
      
      return text;
    } catch (error) {
      console.error('Advanced extraction failed:', error);
      return '';
    }
  }
  
  async tryBasicExtraction(binaryData) {
    try {
      let text = '';
      
      // Extract strings in parentheses (basic text extraction)
      const stringPattern = /\(([^)]{3,})\)/g;
      let match;
      
      while ((match = stringPattern.exec(binaryData)) !== null) {
        const decoded = this.decodePDFString(match[1]);
        if (this.isValidText(decoded)) {
          text += decoded + ' ';
        }
      }
      
      // Extract strings in brackets
      const bracketPattern = /\[([^\]]+)\]/g;
      while ((match = bracketPattern.exec(binaryData)) !== null) {
        const content = match[1];
        const strings = content.match(/\(([^)]+)\)/g);
        if (strings) {
          strings.forEach(str => {
            const textMatch = str.match(/\(([^)]+)\)/);
            if (textMatch) {
              const decoded = this.decodePDFString(textMatch[1]);
              if (this.isValidText(decoded)) {
                text += decoded + ' ';
              }
            }
          });
        }
      }
      
      return text;
    } catch (error) {
      console.error('Basic extraction failed:', error);
      return '';
    }
  }
  
  extractFromContentStreams(binaryData) {
    let text = '';
    
    try {
      // Find content streams
      const streamPattern = /stream\s*\n([\s\S]*?)\nendstream/g;
      let match;
      
      while ((match = streamPattern.exec(binaryData)) !== null) {
        const streamContent = match[1];
        
        // Skip binary/compressed streams
        if (this.isBinaryStream(streamContent)) {
          continue;
        }
        
        text += this.extractTextFromStream(streamContent);
      }
    } catch (error) {
      console.error('Content stream extraction error:', error);
    }
    
    return text;
  }
  
  extractFromTextObjects(binaryData) {
    let text = '';
    
    try {
      // Find text objects (BT...ET blocks)
      const textBlockPattern = /BT\s*([\s\S]*?)\s*ET/g;
      let match;
      
      while ((match = textBlockPattern.exec(binaryData)) !== null) {
        const textBlock = match[1];
        text += this.extractTextFromTextBlock(textBlock);
      }
    } catch (error) {
      console.error('Text object extraction error:', error);
    }
    
    return text;
  }
  
  extractFromXObjects(binaryData) {
    let text = '';
    
    try {
      // Look for XObject references and extract text from them
      const xobjPattern = /\/XObject\s*<<([^>]*)>>/g;
      let match;
      
      while ((match = xobjPattern.exec(binaryData)) !== null) {
        const xobjContent = match[1];
        // This would require more complex parsing in a full implementation
        // For now, skip XObject extraction
      }
    } catch (error) {
      console.error('XObject extraction error:', error);
    }
    
    return text;
  }
  
  extractTextFromStream(streamContent) {
    let text = '';
    
    // Extract Tj operations
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    let match;
    
    while ((match = tjPattern.exec(streamContent)) !== null) {
      const decoded = this.decodePDFString(match[1]);
      if (this.isValidText(decoded)) {
        text += decoded + ' ';
      }
    }
    
    // Extract TJ operations (arrays)
    const tjArrayPattern = /\[(.*?)\]\s*TJ/g;
    while ((match = tjArrayPattern.exec(streamContent)) !== null) {
      const arrayContent = match[1];
      const strings = arrayContent.match(/\(([^)]*)\)/g);
      if (strings) {
        strings.forEach(str => {
          const textMatch = str.match(/\(([^)]*)\)/);
          if (textMatch) {
            const decoded = this.decodePDFString(textMatch[1]);
            if (this.isValidText(decoded)) {
              text += decoded + ' ';
            }
          }
        });
      }
    }
    
    return text;
  }
  
  extractTextFromTextBlock(textBlock) {
    return this.extractTextFromStream(textBlock);
  }
  
  isBinaryStream(content) {
    // Check if stream contains binary data
    const binaryRatio = (content.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length / content.length;
    return binaryRatio > 0.3;
  }
  
  decodePDFString(str) {
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
    
    // Check if text contains a reasonable amount of letters
    const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = text.length;
    const letterRatio = letterCount / totalChars;
    
    // Must be at least 40% letters and have minimum meaningful content
    return letterRatio >= 0.4 && letterCount >= 3 && !/^[\s\d\-_.,:;!?]+$/.test(text);
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