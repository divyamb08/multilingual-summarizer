/**
 * Splits content into chunks of reasonable size for API processing
 * @param content The content to chunk
 * @param maxChunkSize Maximum size of each chunk (default 10000 characters)
 * @returns Array of content chunks
 */
export function chunkContent(content: string, maxChunkSize: number = 10000): string[] {
    // If content is small enough, return it as a single chunk
    if (content.length <= maxChunkSize) {
      return [content];
    }
    
    const chunks: string[] = [];
    
    // Try to split at paragraph boundaries first
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed max size, save current chunk and start a new one
      if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
        // If current paragraph is too large, we need to split it further
        if (paragraph.length > maxChunkSize) {
          // First, save what we have so far
          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = '';
          }
          
          // Then split the paragraph by sentences
          const sentences = paragraph.split(/(?<=[.!?])\s+/);
          let sentenceChunk = '';
          
          for (const sentence of sentences) {
            if (sentenceChunk.length + sentence.length + 1 > maxChunkSize) {
              // If even a single sentence is too large, split by words
              if (sentence.length > maxChunkSize) {
                // Save what we have
                if (sentenceChunk.length > 0) {
                  chunks.push(sentenceChunk);
                  sentenceChunk = '';
                }
                
                // Split by words
                let i = 0;
                while (i < sentence.length) {
                  chunks.push(sentence.slice(i, i + maxChunkSize));
                  i += maxChunkSize;
                }
              } else {
                // Save current sentence chunk and start a new one
                chunks.push(sentenceChunk);
                sentenceChunk = sentence + ' ';
              }
            } else {
              sentenceChunk += sentence + ' ';
            }
          }
          
          // Add any remaining sentence chunk
          if (sentenceChunk.length > 0) {
            chunks.push(sentenceChunk);
          }
        } else {
          // Save current chunk and start a new one with current paragraph
          chunks.push(currentChunk);
          currentChunk = paragraph + '\n\n';
        }
      } else {
        // Add paragraph to current chunk
        currentChunk += paragraph + '\n\n';
      }
    }
    
    // Add last chunk if not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }