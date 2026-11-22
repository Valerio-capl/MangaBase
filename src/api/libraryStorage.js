import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSameManga } from './mangaKey';

const STORAGE_KEY = 'myLibrary';

export const getSavedLibrary = async () => {
  try {
    const storedData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!storedData) return [];
    const parsedData = JSON.parse(storedData);
    parsedData.sort((a, b) => {
      const dateA = a.lastRead || 0;
      const dateB = b.lastRead || 0;
      return dateB - dateA;
    });
    return parsedData;
  } catch (error) {
    console.error("Library loading error:", error);
    return [];
  }
};

export const isMangaSaved = async (mangaId, source) => {
  if (!mangaId) return false;
  try {
    const storedLibrary = await AsyncStorage.getItem(STORAGE_KEY);
    if (!storedLibrary) return false;
    const library = JSON.parse(storedLibrary);
    return library.some((item) => isSameManga(item, { id: mangaId, source }));
  } catch (err) {
    console.error("Error checking saved manga status:", err);
    return false;
  }
};

export const toggleSaveManga = async (mangaData, source) => {
  try {
    const existingLibrary = await AsyncStorage.getItem(STORAGE_KEY);
    let library = existingLibrary ? JSON.parse(existingLibrary) : [];
    const exists = library.some((item) => isSameManga(item, { id: mangaData.id, source }));

    if (exists) {
      library = library.filter((item) => !isSameManga(item, { id: mangaData.id, source }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(library));
      return false;
    } else {
      const mangaSave = {
        id: mangaData.id,
        slug: mangaData.slug,
        title: mangaData.title,
        coverUrl: mangaData.coverUrl,
        source: source
      };
      library.push(mangaSave);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(library));
      return true;
    }
  } catch (error) {
    console.error("Saving Error:", error);
    throw error;
  }
};

export const updateLastRead = async (mangaId, source, originalSource, timestamp = Date.now()) => {
  try {
    const libraryStr = await AsyncStorage.getItem(STORAGE_KEY);
    if (!libraryStr) return;
    const library = JSON.parse(libraryStr);
    const mangaIndex = library.findIndex((m) => isSameManga(m, { id: mangaId, source, originalSource }));
    if (mangaIndex !== -1) {
      library[mangaIndex].lastRead = timestamp;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    }
  } catch (error) {
    console.error("Error updating lastRead:", error);
  }
};
