// src/utils/textProcessor.js
import { Dimensions } from 'react-native';

export class TextProcessor {
  constructor() {
    this.fontSize = 22;
    this.lineHeight = 1.6;
    this.charWidth = 0.55;
    this.marginBottom = 24;
    
    const { width, height } = Dimensions.get('window');
    this.screenWidth = width;
    this.screenHeight = height;
  }

  setFontSize(fontSize) {
    this.fontSize = fontSize;
    this.charWidth = fontSize <= 18 ? 0.5 : fontSize <= 26 ? 0.55 : 0.6;
  }

  calculateSectionCapacity() {
    const safeAreaTop = 80;
    const safeAreaBottom = 120;
    const horizontalPadding = 28;
    const maxContentWidth = Math.min(this.screenWidth - horizontalPadding, 650);
    
    const availableHeight = this.screenHeight - safeAreaTop - safeAreaBottom;
    const availableWidth = maxContentWidth;
    
    const lineHeightPx = this.fontSize * this.lineHeight;
    const maxLines = Math.floor((availableHeight - 40) / lineHeightPx);
    const charsPerLine = Math.floor(availableWidth / (this.fontSize * this.charWidth));
    
    // More conservative limits for better section distribution
    const targetSectionHeight = availableHeight * 0.75;
    const targetLines = Math.floor(targetSectionHeight / lineHeightPx);
    
    return {
      maxLines: Math.max(4, maxLines),
      targetLines: Math.max(3, targetLines),
      charsPerLine: Math.max(30, charsPerLine),
      maxChars: Math.max(300, targetLines * charsPerLine * 0.7),
      targetChars: Math.max(200, targetLines * charsPerLine * 0.6),
      lineHeightPx,
      availableHeight,
      targetSectionHeight
    };
  }

  estimateTextHeight(text, isHeading = false) {
    const { charsPerLine, lineHeightPx } = this.calculateSectionCapacity();
    
    if (isHeading) {
      const level = this.getHeadingLevel(text);
      const headingMultiplier = level === 1 ? 2.2 : level === 2 ? 1.9 : level === 3 ? 1.6 : 1.3;
      const baseHeight = this.fontSize * headingMultiplier * this.lineHeight;
      const marginHeight = this.fontSize * 2;
      return baseHeight + marginHeight;
    }

    const cleanText = text.replace(/<[^>]*>/g, '');
    const words = cleanText.split(/\s+/);
    let currentLineLength = 0;
    let lines = 1;

    words.forEach(word => {
      const wordLength = word.length + 1;
      if (currentLineLength + wordLength > charsPerLine) {
        lines++;
        currentLineLength = wordLength;
      } else {
        currentLineLength += wordLength;
      }
    });

    return lines * lineHeightPx;
  }

  isHeading(text) {
    return /^<h[1-6]>/.test(text.trim());
  }

  getHeadingLevel(text) {
    const match = text.match(/^<h([1-6])>/);
    return match ? parseInt(match[1]) : 1;
  }

  preserveFormattedStructure(text) {
    // Preserve chapter breaks and section divisions
    const cleanText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    // Split by double line breaks but preserve structure
    const sections = cleanText.split(/\n\s*\n/);
    const processedSections = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;

      // Check if this looks like a chapter heading or major section
      if (this.isLikelyChapterHeading(section)) {
        processedSections.push(`<h2>${section}</h2>`);
      } else if (this.isLikelySubheading(section)) {
        processedSections.push(`<h3>${section}</h3>`);
      } else {
        // Handle regular paragraphs - preserve internal line breaks for poetry/formatting
        if (this.hasSignificantLineBreaks(section)) {
          const lines = section.split('\n').map(line => line.trim()).filter(line => line);
          processedSections.push(lines.join('\n'));
        } else {
          // Join single line breaks but keep the paragraph
          const cleanParagraph = section.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
          processedSections.push(cleanParagraph);
        }
      }
    }

    return processedSections.join('\n\n');
  }

  isLikelyChapterHeading(text) {
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    return (
      cleanText.length < 150 &&
      (
        /^(Chapter|CHAPTER|Ch\.?)\s*\d+/i.test(cleanText) ||
        /^(Part|PART|Section|SECTION)\s*[IVX\d]/i.test(cleanText) ||
        /^[IVX]+\.?\s*[A-Z][^.!?]*$/i.test(cleanText) ||
        (cleanText.length < 50 && /^[A-Z][^.!?]*[^.!?]$/.test(cleanText))
      )
    );
  }

  isLikelySubheading(text) {
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    return (
      cleanText.length < 100 &&
      cleanText.length > 5 &&
      /^[A-Z]/.test(cleanText) &&
      !/[.!?]$/.test(cleanText) &&
      cleanText.split(' ').length <= 12
    );
  }

  hasSignificantLineBreaks(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 3) return false;
    
    // Check if lines are short (like poetry or formatted text)
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    return avgLineLength < 80 && lines.length >= 3;
  }

  splitTextIntoScreenSections(text) {
    const { targetSectionHeight, targetChars, maxChars } = this.calculateSectionCapacity();
    
    console.log(`Text length: ${text.length} characters`);
    
    // First preserve the original structure
    const structuredText = this.preserveFormattedStructure(text);
    const paragraphs = structuredText.split(/\n\s*\n/).filter(p => p.trim());
    
    console.log(`Split into ${paragraphs.length} paragraphs`);
    
    const sections = [];
    let currentSection = [];
    let currentHeight = 0;
    let currentCharCount = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      if (!paragraph) continue;

      const isHeading = this.isHeading(paragraph);
      const paragraphHeight = this.estimateTextHeight(paragraph, isHeading);
      const paragraphChars = paragraph.replace(/<[^>]*>/g, '').length;
      
      // Check if this individual paragraph is too long
      if (paragraphHeight > targetSectionHeight * 1.2 && !isHeading) {
        // Save current section if it has content
        if (currentSection.length > 0) {
          sections.push(this.createSection(currentSection, sections.length));
          currentSection = [];
          currentHeight = 0;
          currentCharCount = 0;
        }

        // Split the long paragraph
        const subParagraphs = this.splitLongParagraph(paragraph, targetChars);
        for (const subParagraph of subParagraphs) {
          sections.push(this.createSection([subParagraph], sections.length));
        }
        continue;
      }
      
      // Calculate what the totals would be with this paragraph
      const spaceBetween = currentSection.length > 0 ? this.fontSize * 1.1 : 0;
      const newHeight = currentHeight + paragraphHeight + spaceBetween;
      const newCharCount = currentCharCount + paragraphChars;
      
      // More aggressive section breaks for better distribution
      const shouldBreak = (
        (newHeight > targetSectionHeight && currentSection.length > 0) ||
        (newCharCount > targetChars && currentSection.length > 0) ||
        (currentSection.length >= 3 && newCharCount > targetChars * 0.8)
      );
      
      if (shouldBreak) {
        // Start new section
        sections.push(this.createSection(currentSection, sections.length));
        currentSection = [paragraph];
        currentHeight = paragraphHeight;
        currentCharCount = paragraphChars;
      } else {
        // Add to current section
        currentSection.push(paragraph);
        currentHeight = newHeight;
        currentCharCount = newCharCount;
      }
    }

    // Add any remaining content
    if (currentSection.length > 0) {
      sections.push(this.createSection(currentSection, sections.length));
    }

    // If we only have one section from a long text, force split it
    if (sections.length === 1 && text.length > 2000) {
      console.log('Forcing split of single long section');
      return this.forceSplitText(text);
    }

    console.log(`Created ${sections.length} sections`);
    return sections.length > 0 ? sections : [this.createSection([text], 0)];
  }

  forceSplitText(text) {
    const { targetChars } = this.calculateSectionCapacity();
    const sentences = this.splitIntoSentences(text);
    const sections = [];
    let currentSection = '';
    
    for (const sentence of sentences) {
      if (currentSection.length + sentence.length > targetChars && currentSection) {
        sections.push(this.createSection([currentSection.trim()], sections.length));
        currentSection = sentence;
      } else {
        currentSection += (currentSection ? ' ' : '') + sentence;
      }
    }
    
    if (currentSection.trim()) {
      sections.push(this.createSection([currentSection.trim()], sections.length));
    }
    
    return sections.length > 1 ? sections : [this.createSection([text], 0)];
  }

  createSection(paragraphs, index) {
    const content = paragraphs.join('\n\n');
    const cleanContent = content.replace(/<[^>]*>/g, '');
    
    return {
      content,
      estimatedHeight: this.estimateTextHeight(content),
      id: index,
      characterCount: cleanContent.length,
      paragraphCount: paragraphs.length
    };
  }

  splitLongParagraph(paragraph, maxChars) {
    if (paragraph.replace(/<[^>]*>/g, '').length <= maxChars) {
      return [paragraph];
    }

    // Try to split by sentences first
    const sentences = this.splitIntoSentences(paragraph);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const sentenceLength = sentence.replace(/<[^>]*>/g, '').length;
      
      if (currentChunk.replace(/<[^>]*>/g, '').length + sentenceLength > maxChars && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // If we still have chunks that are too long, split by words
    const finalChunks = [];
    for (const chunk of chunks) {
      if (chunk.replace(/<[^>]*>/g, '').length > maxChars) {
        finalChunks.push(...this.splitByWords(chunk, maxChars));
      } else {
        finalChunks.push(chunk);
      }
    }

    return finalChunks.length > 0 ? finalChunks : [paragraph];
  }

  splitByWords(text, maxChars) {
    const words = text.split(/\s+/);
    const chunks = [];
    let currentChunk = '';

    for (const word of words) {
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + word;
      if (testChunk.replace(/<[^>]*>/g, '').length > maxChars && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk = testChunk;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  splitIntoSentences(text) {
    // Enhanced sentence splitting that preserves formatting
    const sentences = [];
    let current = '';
    let inTag = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '<') {
        inTag = true;
      } else if (char === '>') {
        inTag = false;
      }
      
      current += char;
      
      if (!inTag && /[.!?]/.test(char)) {
        // Look ahead to see if this is really the end of a sentence
        const nextChar = text[i + 1];
        const nextNextChar = text[i + 2];
        
        if (!nextChar || /\s/.test(nextChar)) {
          if (!nextNextChar || /[A-Z]/.test(nextNextChar) || /\n/.test(nextNextChar)) {
            sentences.push(current.trim());
            current = '';
            continue;
          }
        }
      }
    }
    
    if (current.trim()) {
      sentences.push(current.trim());
    }
    
    return sentences.filter(s => s.length > 0);
  }

  formatBionicText(text) {
    return text.replace(/\b([a-zA-Z]+)\b/g, (word) => {
      if (word.length <= 1) return word;

      let boldLength;
      if (word.length <= 3) {
        boldLength = 1;
      } else if (word.length <= 5) {
        boldLength = 2;
      } else if (word.length <= 8) {
        boldLength = Math.ceil(word.length * 0.4);
      } else {
        boldLength = Math.ceil(word.length * 0.35);
      }

      const boldPart = word.slice(0, boldLength);
      const normalPart = word.slice(boldLength);
      
      return `<b>${boldPart}</b>${normalPart}`;
    });
  }

  processSection(section, isBionic = false) {
    const content = isBionic ? this.formatBionicText(section.content) : section.content;
    const processed = this.formatForReading(content);

    return {
      ...section,
      processed,
      isBionic
    };
  }

  formatForReading(text) {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    return paragraphs.map(paragraph => {
      const trimmed = paragraph.trim();
      
      if (this.isHeading(trimmed)) {
        return trimmed; // Keep heading tags as-is
      } else {
        // Handle line breaks within paragraphs
        const lines = trimmed.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length > 1 && this.hasSignificantLineBreaks(trimmed)) {
          // Preserve internal line breaks (like poetry)
          return `<p>${lines.join('<br/>')}</p>`;
        } else {
          // Join lines with spaces for regular paragraphs
          return `<p>${lines.join(' ')}</p>`;
        }
      }
    }).join('');
  }

  findSectionByCharacterIndex(sections, targetCharIndex) {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (section.startCharIndex && section.endCharIndex) {
        if (targetCharIndex >= section.startCharIndex && targetCharIndex <= section.endCharIndex) {
          return i;
        }
      }
    }
    return 0;
  }

  estimateReadingTime(text, wordsPerMinute = 200) {
    const words = text.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0);
    const minutes = Math.ceil(words.length / wordsPerMinute);
    return {
      words: words.length,
      minutes,
      time: minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    };
  }
}