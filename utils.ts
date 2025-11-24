import { FileData } from './types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const processFile = async (file: File): Promise<FileData> => {
  // Handle PDF
  if (file.type === 'application/pdf') {
    const base64 = await fileToBase64(file);
    return {
      name: file.name,
      type: file.type,
      base64: base64
    };
  } 
  // Handle Text
  else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
    const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
    return {
      name: file.name,
      type: 'text/plain',
      textContent: text
    };
  }
  
  throw new Error(`Unsupported file type: ${file.name}. Please upload PDF or Text files (.txt, .md).`);
};