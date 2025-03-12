/**
 * Language detection utility for the Multilingual Summarizer
 * Uses franc for browser-compatible language detection with fallback mechanisms
 */
import franc from 'franc';

/**
 * Wrapper for franc language detection with error handling
 * @param text Text to detect language from
 * @returns ISO 639-3 language code or 'und' if detection fails
 */
const francDetect = (text: string): string => {
  try {
    if (typeof franc !== 'function') {
      console.warn('Franc is not available as a function, using fallback');
      return 'und';
    }
    
    // Normalize text by removing excess whitespace
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    
    // If text is too short, detection might be unreliable
    if (normalizedText.length < 20) {
      console.warn('Text too short for reliable language detection');
      return 'und';
    }
    
    return franc(normalizedText);
  } catch (error) {
    console.error('Error calling franc:', error);
    return 'und';
  }
};

/**
 * Map of ISO 639-3 language codes to full language names
 * Extended with more languages for better coverage
 */
const languageMap: Record<string, string> = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'deu': 'German',
  'ita': 'Italian',
  'por': 'Portuguese',
  'nld': 'Dutch',
  'rus': 'Russian',
  'zho': 'Chinese',
  'cmn': 'Chinese (Mandarin)',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'hin': 'Hindi',
  'ben': 'Bengali',
  'tur': 'Turkish',
  'tha': 'Thai',
  'vie': 'Vietnamese',
  'swe': 'Swedish',
  'nor': 'Norwegian',
  'dan': 'Danish',
  'fin': 'Finnish',
  'pol': 'Polish',
  'ces': 'Czech',
  'slk': 'Slovak',
  'ell': 'Greek',
  'hun': 'Hungarian',
  'ron': 'Romanian',
  'ukr': 'Ukrainian',
  'bul': 'Bulgarian',
  'ind': 'Indonesian',
  'msa': 'Malay',
  'heb': 'Hebrew',
  'fas': 'Persian',
  'urd': 'Urdu',
  'tel': 'Telugu',
  'tam': 'Tamil',
  'mar': 'Marathi',
  'guj': 'Gujarati',
  'kan': 'Kannada',
  'mal': 'Malayalam',
  'swa': 'Swahili',
  'amh': 'Amharic',
  'kat': 'Georgian',
  'hye': 'Armenian',
  'lat': 'Latin',
  'san': 'Sanskrit',
  'gle': 'Irish',
  'gla': 'Scottish Gaelic',
  'cym': 'Welsh',
  'yue': 'Cantonese',
  'afr': 'Afrikaans',
  'nep': 'Nepali',
  'cat': 'Catalan',
  'bak': 'Bashkir',
  'bel': 'Belarusian',
  'tgl': 'Tagalog',
  'lit': 'Lithuanian',
  'lav': 'Latvian',
  'est': 'Estonian',
  'hrv': 'Croatian',
  'srp': 'Serbian',
  'slv': 'Slovenian',
  'mkd': 'Macedonian',
  'aze': 'Azerbaijani',
  'uzb': 'Uzbek',
  'kaz': 'Kazakh',
  'kir': 'Kyrgyz',
  'tuk': 'Turkmen',
  'mon': 'Mongolian',
  'glg': 'Galician',
  'eus': 'Basque'
};

/**
 * Detects the language of given text and returns the language name
 * @param text Text to detect language from
 * @returns Full language name or 'unknown' if detection fails
 */
export async function detectLanguage(text: string): Promise<string> {
  // If text is missing or empty, return unknown
  if (!text || text.trim() === '') {
    console.warn('Empty text provided for language detection');
    return 'unknown';
  }
  
  try {
    // Ensure text is a string
    const textString = String(text);
    
    // Use an appropriate sample of text for faster detection
    // Taking from the middle can sometimes be more representative than the start
    const textLength = textString.length;
    let sampleText = textString;
    
    if (textLength > 2000) {
      // For very long text, take samples from beginning, middle and end
      const startSample = textString.slice(0, 600);
      const middleStart = Math.floor(textLength / 2) - 300;
      const middleSample = textString.slice(middleStart, middleStart + 600);
      const endSample = textString.slice(textLength - 600);
      sampleText = `${startSample} ${middleSample} ${endSample}`;
    } else if (textLength > 1000) {
      // For moderately long text, just sample the first 1000 chars
      sampleText = textString.slice(0, 1000);
    }
    
    // Detect language using the francDetect wrapper
    const langCode = francDetect(sampleText);
    
    if (langCode === 'und') {
      // 'und' means undefined/unknown language
      return 'unknown';
    }
    
    // Return full language name if available, otherwise return the code
    return languageMap[langCode] || langCode;
  } catch (error) {
    console.error('Language detection error:', error);
    return 'unknown';
  }
}