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
      
      // Extract cover image
      const coverImage = await this.extractCoverImage(contents, manifest, basePath);
      
      // Extract text from spine files in order
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
              
              // Keep original HTML for reader mode
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
      // Look for cover image in manifest
      const coverItem = Object.values(manifest).find(item => 
        item.href && (
          item.href.toLowerCase().includes('cover') ||
          item.href.toLowerCase().includes('title')
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
      
      // Fallback: look for any image in common cover locations
      const commonCoverPaths = [
        'OEBPS/Images/cover.jpg',
        'OEBPS/images/cover.jpg',
        'OPS/images/cover.jpg',
        'images/cover.jpg',
        'cover.jpg'
      ];
      
      for (const path of commonCoverPaths) {
        const imageFile = zipContents.file(path);
        if (imageFile) {
          const imageData = await imageFile.async('base64');
          return `data:image/jpeg;base64,${imageData}`;
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
            mediaType: attributes['media-type']
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
      
      const contentTags = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'];
      let extractedText = '';
      
      contentTags.forEach(tag => {
        const tagPattern = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'gi');
        let match;
        
        while ((match = tagPattern.exec(text)) !== null) {
          const content = match[1]
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
            .trim();
          
          if (content && content.length > 10) {
            extractedText += content + '\n\n';
          }
        }
      });
      
      if (!extractedText.trim()) {
        extractedText = text
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
          .replace(/&[^;]+;/g, ' ');
      }
      
      return extractedText;
    } catch (error) {
      console.error('Error extracting text from HTML:', error);
      return '';
    }
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