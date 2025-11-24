// Environment variables configuration
// This file should NOT be committed to version control with real API keys
// For local development, copy this file to env.local.ts and add your API key there

// Simple approach for client-side environment variables
export const API_KEY = '';

// Function to get API key from various sources
export const getApiKey = () => {
  // Check for Vite environment variables first
  if ((import.meta as any).env?.VITE_GEMINI_API_KEY) {
    return (import.meta as any).env.VITE_GEMINI_API_KEY;
  }
  
  // Check for other environment variables
  if ((import.meta as any).env?.GEMINI_API_KEY) {
    return (import.meta as any).env.GEMINI_API_KEY;
  }
  
  // Fallback to the default export
  return API_KEY;
};