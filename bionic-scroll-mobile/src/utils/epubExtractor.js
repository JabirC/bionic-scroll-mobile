// src/utils/epubExtractor.js
import JSZip from 'jszip';

export class EPUBExtractor {
  async extractText(fileUri) {
    try {
      console.log('Starting EPUB text extraction...');
      
      const fileContent = await fetch(fileUri);
      const arrayBuffer = await fileContent.arrayBuffer();
      
      const zip = new JSZip();
      const contents = await zip.loadAsync(arrayBuffer);
      
      const { spine, manifest, basePath } = await this.parseEPUBStructure(contents);
      
      if (!spine || spine.length === 0) {
        throw new Error('Invalid EPUB structure: No readable content found');
      }
      
      const coverImage = await this.extractCoverImage(contents, manifest, basePath);
      
      const extractedTexts = [];
      const originalPages = [];
      
      for (const itemRef of spine) {
        try {
          const manifestItem = manifest[itemRef];
          if (manifestItem && this.isTextContent(manifestItem.mediaType)) {
            const filePath = basePath ? `${basePath}/${manifestItem.href}` : manifestItem.href;
            const contentFile = contents.file(filePath);
            
            if (contentFile) {
              const content = await contentFile.async('text');
              const extractedText = this.extractTextFromHTML(content);
              
              originalPages.push({
                id: originalPages.length,
                content: content,
                type: 'html'
              });
              
              if (extractedText.trim().length > 50) {
                extractedTexts.push(extractedText);
              }
            }
          }
        } catch (itemError) {
          console.warn('Error processing EPUB item:', itemError);
          continue;
        }
      }
      
      if (extractedTexts.length === 0) {
        return {
          text: null,
          extractionFailed: true,
          message: 'No readable text content found in EPUB file.',
          originalFormat: true,
          originalPages,
          coverImage
        };
      }
      
      const fullText = extractedTexts.join('\n\n');
      const cleanedText = this.cleanupText(fullText);
      const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;
      
      if (wordCount < 100) {
        return {
          text: null,
          extractionFailed: true,
          message: 'Insufficient text content extracted from EPUB.',
          originalFormat: true,
          originalPages,
          coverImage
        };
      }
      
      return {
        text: cleanedText,
        extractionFailed: false,
        originalPages,
        coverImage,
        metadata: {
          chapters: extractedTexts.length,
          wordCount,
          characterCount: cleanedText.length,
          extractionMethod: 'epub-structure'
        }
      };
      
    } catch (error) {
      console.error('EPUB extraction error:', error);
      return {
        text: null,
        extractionFailed: true,
        message: `EPUB processing failed: ${error.message}`,
        originalFormat: true,
        error: error.message
      };
    }
  }
  
  async extractCoverImage(zipContents, manifest, basePath) {
    try {
      const coverItem = Object.values(manifest).find(item => 
        item.href && (
          item.href.toLowerCase().includes('cover') ||
          item.href.toLowerCase().includes('title') ||
          item.properties === 'cover-image'
        ) && (
          item.mediaType.startsWith('image/') || 
          item.href.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        )
      );
      
      if (coverItem) {
        const imagePath = basePath ? `${basePath}/${coverItem.href}` : coverItem.href;
        const imageFile = zipContents.file(imagePath);
        
        if (imageFile) {
          const imageData = await imageFile.async('base64');
          return `data:${coverItem.mediaType};base64,${imageData}`;
        }
      }
      
      const commonCoverPaths = [
        'OEBPS/Images/cover.jpg',
        'OEBPS/images/cover.jpg',
        'OEBPS/Images/cover.png',
        'OEBPS/images/cover.png',
        'OPS/images/cover.jpg',
        'images/cover.jpg',
        'cover.jpg',
        'cover.png'
      ];
      
      for (const path of commonCoverPaths) {
        const imageFile = zipContents.file(path);
        if (imageFile) {
          const imageData = await imageFile.async('base64');
          const extension = path.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
          return `data:image/${extension};base64,${imageData}`;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Could not extract cover image:', error);
      return null;
    }
  }
  
  async parseEPUBStructure(zipContents) {
    try {
      const containerFile = zipContents.file('META-INF/container.xml');
      if (!containerFile) {
        throw new Error('Missing META-INF/container.xml');
      }
      
      const containerXML = await containerFile.async('text');
      const contentOpfPath = this.extractContentOpfPath(containerXML);
      
      if (!contentOpfPath) {
        throw new Error('Could not find content.opf path');
      }
      
      const contentOpfFile = zipContents.file(contentOpfPath);
      if (!contentOpfFile) {
        throw new Error('Missing content.opf file');
      }
      
      const contentOpfXML = await contentOpfFile.async('text');
      const { spine, manifest } = this.parseContentOpf(contentOpfXML);
      
      const basePath = contentOpfPath.includes('/') 
        ? contentOpfPath.substring(0, contentOpfPath.lastIndexOf('/'))
        : '';
      
      return { spine, manifest, basePath };
      
    } catch (error) {
      console.error('Error parsing EPUB structure:', error);
      throw error;
    }
  }
  
  extractContentOpfPath(containerXML) {
    try {
      const fullPathMatch = containerXML.match(/full-path\s*=\s*["']([^"']+)["']/);
      return fullPathMatch ? fullPathMatch[1] : null;
    } catch (error) {
      console.error('Error extracting content.opf path:', error);
      return null;
    }
  }
  
  parseContentOpf(contentOpfXML) {
    try {
      const manifest = {};
      const spine = [];
      
      const manifestPattern = /<item\s+([^>]+)>/g;
      let match;
      
      while ((match = manifestPattern.exec(contentOpfXML)) !== null) {
        const attributes = this.parseAttributes(match[1]);
        if (attributes.id && attributes.href && attributes['media-type']) {
          manifest[attributes.id] = {
            href: attributes.href,
            mediaType: attributes['media-type'],
            properties: attributes.properties || null
          };
        }
      }
      
      const spinePattern = /<itemref\s+([^>]+)>/g;
      while ((match = spinePattern.exec(contentOpfXML)) !== null) {
        const attributes = this.parseAttributes(match[1]);
        if (attributes.idref) {
          spine.push(attributes.idref);
        }
      }
      
      return { spine, manifest };
    } catch (error) {
      console.error('Error parsing content.opf:', error);
      throw error;
    }
  }
  
  parseAttributes(attributeString) {
    const attributes = {};
    const attrPattern = /(\w+(?:-\w+)*)\s*=\s*["']([^"']*)["']/g;
    let match;
    
    while ((match = attrPattern.exec(attributeString)) !== null) {
      attributes[match[1]] = match[2];
    }
    
    return attributes;
  }
  
  isTextContent(mediaType) {
    const textTypes = [
      'application/xhtml+xml',
      'text/html',
      'text/xml',
      'application/x-dtbook+xml'
    ];
    return textTypes.includes(mediaType);
  }
  
  extractTextFromHTML(htmlContent) {
    try {
      let text = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      
      let extractedText = '';
      
      // Extract headings with proper structure
      const headingPattern = /<(h[1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
      let match;
      const headings = [];
      
      while ((match = headingPattern.exec(text)) !== null) {
        const headingText = this.cleanTextContent(match[2]);
        if (headingText.trim()) {
          headings.push({
            level: match[1],
            text: headingText.trim(),
            position: match.index
          });
        }
      }
      
      // Extract paragraphs
      const paragraphPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      const paragraphs = [];
      
      while ((match = paragraphPattern.exec(text)) !== null) {
        const paragraphText = this.cleanTextContent(match[1]);
        if (paragraphText.trim() && paragraphText.length > 10) {
          paragraphs.push({
            text: paragraphText.trim(),
            position: match.index
          });
        }
      }
      
      // Extract div content (often used for paragraphs in EPUBs)
      const divPattern = /<div[^>]*class="[^"]*(?:para|paragraph|body|text)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      while ((match = divPattern.exec(text)) !== null) {
        const divText = this.cleanTextContent(match[1]);
        if (divText.trim() && divText.length > 10) {
          paragraphs.push({
            text: divText.trim(),
            position: match.index
          });
        }
      }
      
      // Combine all content, preserving structure
      const allContent = [...headings, ...paragraphs].sort((a, b) => a.position - b.position);
      
      allContent.forEach(item => {
        if (item.level) {
          extractedText += `\n\n<${item.level}>${item.text}</${item.level}>\n\n`;
        } else {
          extractedText += item.text + '\n\n';
        }
      });
      
      // If no structured content found, try body extraction
      if (!extractedText.trim()) {
        const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const contentToProcess = bodyMatch ? bodyMatch[1] : text;
        
        extractedText = this.cleanTextContent(contentToProcess)
          .replace(/\n\s*\n\s*\n+/g, '\n\n')
          .trim();
      }
      
      return extractedText;
    } catch (error) {
      console.error('Error extracting text from HTML:', error);
      return '';
    }
  }
  
  cleanTextContent(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (match, dec) => {
        try {
          return String.fromCharCode(dec);
        } catch (e) {
          return ' ';
        }
      })
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  cleanupText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n +/g, '\n')
      .replace(/ +\n/g, '\n')
      .replace(/^\s+|\s+$/gm, '')
      .trim();
  }
}