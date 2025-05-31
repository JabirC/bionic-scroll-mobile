// src/utils/textExtractor.js
import * as FileSystem from 'expo-file-system';

export class TextExtractor {
  async extractFromPDF(fileUri) {
    try {
      // Read the PDF file as base64
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Convert base64 to binary
      const binaryString = atob(fileContent);
      
      // Basic PDF text extraction
      const text = this.extractTextFromPDFBinary(binaryString);
      
      if (!text || text.trim().length < 100) {
        throw new Error('No readable text found in PDF');
      }
      
      return this.cleanupText(text);
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  async extractFromEPUB(fileUri) {
    try {
      // For EPUB, we'll need to implement a proper parser
      // For now, return an error message suggesting manual text input
      throw new Error('EPUB extraction not yet implemented. Please convert to PDF or copy/paste text.');
    } catch (error) {
      console.error('EPUB extraction error:', error);
      throw new Error('Failed to extract text from EPUB');
    }
  }

  extractTextFromPDFBinary(pdfData) {
    let text = '';
    
    try {
      // Look for text content in PDF streams
      // This is a basic implementation - for production use a proper PDF parser
      
      // Find text objects between BT and ET operators
      const textBlocks = pdfData.match(/BT[\s\S]*?ET/g);
      
      if (textBlocks) {
        for (const block of textBlocks) {
          // Extract text using Tj operator
          const tjMatches = block.match(/\(([^)]+)\)\s*Tj/g);
          if (tjMatches) {
            tjMatches.forEach(match => {
              const textMatch = match.match(/\(([^)]+)\)/);
              if (textMatch) {
                text += this.decodePDFString(textMatch[1]) + ' ';
              }
            });
          }
          
          // Extract text using TJ operator (array)
          const tjArrayMatches = block.match(/\[(.*?)\]\s*TJ/g);
          if (tjArrayMatches) {
            tjArrayMatches.forEach(match => {
              const arrayContent = match.match(/\[(.*?)\]/)[1];
              const stringMatches = arrayContent.match(/\(([^)]+)\)/g);
              if (stringMatches) {
                stringMatches.forEach(stringMatch => {
                  const textMatch = stringMatch.match(/\(([^)]+)\)/);
                  if (textMatch) {
                    text += this.decodePDFString(textMatch[1]) + ' ';
                  }
                });
              }
            });
          }
        }
      }
      
      // Fallback: extract any text-like content
      if (!text.trim()) {
        const fallbackText = this.extractFallbackText(pdfData);
        text = fallbackText;
      }
      
      return text.trim();
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return '';
    }
  }

  extractFallbackText(pdfData) {
    // Extract strings that look like readable text
    const textPattern = /\(([^)]{3,})\)/g;
    let text = '';
    let match;
    
    while ((match = textPattern.exec(pdfData)) !== null) {
      const extractedText = this.decodePDFString(match[1]);
      if (this.isReadableText(extractedText)) {
        text += extractedText + ' ';
      }
    }
    
    return text;
  }

  decodePDFString(str) {
    if (!str) return '';
    
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\([0-7]{1,3})/g, (match, octal) => {
        const code = parseInt(octal, 8);
        return (code >= 32 && code <= 126) ? String.fromCharCode(code) : ' ';
      })
      .trim();
  }

  isReadableText(text) {
    if (!text || text.length < 3) return false;
    
    const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = text.length;
    const letterRatio = letterCount / totalChars;
    
    return letterRatio >= 0.5 && letterCount >= 3;
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
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n +/g, '\n')
      .replace(/ +\n/g, '\n')
      .trim();
  }
}