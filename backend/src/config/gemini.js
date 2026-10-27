import { GoogleGenAI } from '@google/genai';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let aiClient = null;

if (config.gemini.apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    logger.info('Google GenAI client initialized successfully with configured API key.');
  } catch (err) {
    logger.error('Failed to initialize Google GenAI client:', { error: err.message });
    aiClient = null;
  }
} else {
  logger.warn('GEMINI_API_KEY is not set. AI advisory features will provide structured guidance mode until an API key is configured.');
}

export const getAIClient = () => aiClient;

export const isAIConfigured = () => Boolean(config.gemini.apiKey && aiClient);
