// src/utils/textProcessor.js
import { Dimensions } from 'react-native';

export class TextProcessor {
  constructor() {
    this.fontSize = 22;
    this.lineHeight = 1.9;
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
    const safeAreaTop = 120;
    const safeAreaBottom = 120;
    const horizontalPadding = 48;
    const maxContentWidth = Math.min(this.screenWidth - horizontalPadding, 600);
    
    const availableHeight = this.screenHeight - safeAreaTop - safeAreaBottom;
    const availableWidth = maxContentWidth;
    
    const lineHeightPx = this.fontSize * this.lineHeight;
    const maxLines = Math.floor(availableHeight / lineHeightPx) - 1;
    const charsPerLine = Math.floor(availableWidth / (this.fontSize * this.charWidth));
    
    return {
      maxLines: Math.max(3, maxLines),
      charsPerLine: Math.max(30, charsPerLine),
      maxChars: Math.max(150, maxLines * charsPerLine * 0.75),
      lineHeightPx,
      availableHeight: availableHeight - 40
    };
  }

  estimateTextHeight(text) {
    const { charsPerLine, lineHeightPx } = this.calculateSectionCapacity();
    const paragraphs = text.split(/\n\s*\n/);
    let totalHeight = 0;

    paragraphs.forEach((paragraph, index) => {
      const words = paragraph.split(/\s+/);
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

      const paragraphHeight = lines * lineHeightPx;
      totalHeight += paragraphHeight;
      
      if (index < paragraphs.length - 1) {
        totalHeight += this.marginBottom;
      }
    });

    return totalHeight;
  }

  splitTextIntoScreenSections(text) {
    const { maxChars, availableHeight } = this.calculateSectionCapacity();
    
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    const paragraphs = normalizedText.split(/\n\s*\n/).filter(p => p.trim());
    const sections = [];
    let currentSection = '';
    let currentHeight = 0;
    let currentCharIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      if (!paragraph) continue;

      const paragraphHeight = this.estimateTextHeight(paragraph);
      
      if (paragraphHeight > availableHeight * 0.9) {
        if (currentSection.trim()) {
          sections.push({
            content: currentSection.trim(),
            estimatedHeight: currentHeight,
            id: sections.length,
            startCharIndex: currentCharIndex - currentSection.length,
            endCharIndex: currentCharIndex,
            characterCount: currentSection.length
          });
          currentSection = '';
          currentHeight = 0;
        }

        const chunks = this.splitLongParagraph(paragraph, maxChars * 0.8);
        
        for (const chunk of chunks) {
          sections.push({
            content: chunk.trim(),
            estimatedHeight: this.estimateTextHeight(chunk),
            id: sections.length,
            startCharIndex: currentCharIndex,
            endCharIndex: currentCharIndex + chunk.length,
            characterCount: chunk.length
          });
          currentCharIndex += chunk.length + 2;
        }
      } else {
        if (currentHeight + paragraphHeight > availableHeight * 0.9 && currentSection.trim()) {
          sections.push({
            content: currentSection.trim(),
            estimatedHeight: currentHeight,
            id: sections.length,
            startCharIndex: currentCharIndex - currentSection.length,
            endCharIndex: currentCharIndex,
            characterCount: currentSection.length
          });
          
          currentSection = paragraph;
          currentHeight = paragraphHeight;
        } else {
          if (currentSection) {
            currentSection += '\n\n' + paragraph;
          } else {
            currentSection = paragraph;
          }
          currentHeight += paragraphHeight + (currentSection ? this.marginBottom : 0);
        }
        currentCharIndex += paragraph.length + 2;
      }
    }

    if (currentSection.trim()) {
      sections.push({
        content: currentSection.trim(),
        estimatedHeight: currentHeight,
        id: sections.length,
        startCharIndex: currentCharIndex - currentSection.length,
        endCharIndex: currentCharIndex,
        characterCount: currentSection.length
      });
    }

    return sections.length > 0 ? sections : [{
      content: text,
      estimatedHeight: this.estimateTextHeight(text),
      id: 0,
      startCharIndex: 0,
      endCharIndex: text.length,
      characterCount: text.length
    }];
  }

  splitLongParagraph(paragraph, maxChars) {
    if (paragraph.length <= maxChars) {
      return [paragraph];
    }

    const sentences = this.splitIntoSentences(paragraph);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (sentence.length > maxChars) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        const subChunks = this.splitLongSentence(sentence, maxChars);
        chunks.push(...subChunks);
      } else if (currentChunk.length + sentence.length > maxChars) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [paragraph];
  }

  splitIntoSentences(text) {
    const sentences = [];
    const regex = /[.!?]+[\s'"]*(?=[A-Z])|[.!?]+$/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const sentence = text.substring(lastIndex, match.index + match[0].length).trim();
      if (sentence) {
        sentences.push(sentence);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex).trim();
      if (remaining) {
        sentences.push(remaining);
      }
    }

    return sentences.length > 0 ? sentences : [text];
  }

  splitLongSentence(sentence, maxChars) {
    const chunks = [];
    const clauseRegex = /[,;:—–-]\s*/g;
    const clauses = sentence.split(clauseRegex);
    
    if (clauses.length > 1) {
      let currentChunk = '';
      
      for (let i = 0; i < clauses.length; i++) {
        const clause = clauses[i];
        const separator = i < clauses.length - 1 ? ', ' : '';
        
        if (currentChunk.length + clause.length + separator.length > maxChars && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = clause + separator;
        } else {
          currentChunk += (currentChunk ? ', ' : '') + clause;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    } else {
      const words = sentence.split(/\s+/);
      let currentChunk = '';
      
      for (const word of words) {
        if (currentChunk.length + word.length + 1 > maxChars && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + word;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    }

    return chunks;
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
    const regularFormatted = this.formatForReading(section.content);
    const processed = isBionic 
      ? this.formatForReading(this.formatBionicText(section.content))
      : regularFormatted;

    return {
      ...section,
      processed,
      regularFormatted,
      isBionic
    };
  }

  formatForReading(text) {
    return text
      .split(/\n\s*\n/)
      .filter(p => p.trim())
      .map(p => `<p>${p.trim()}</p>`)
      .join('');
  }

  findSectionByCharacterIndex(sections, targetCharIndex) {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (targetCharIndex >= section.startCharIndex && targetCharIndex <= section.endCharIndex) {
        return i;
      }
    }
    return 0;
  }

  estimateReadingTime(text, wordsPerMinute = 200) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const minutes = Math.ceil(words.length / wordsPerMinute);
    return {
      words: words.length,
      minutes,
      time: minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    };
  }
}