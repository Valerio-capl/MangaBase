import AsyncStorage from '@react-native-async-storage/async-storage';
import { DOWNLOAD_FOLDER, getCoverFileName, isEntryOf } from './paths';

const STORAGE_KEY = 'downloaded_manga';

export const getRawDownloadsDB = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error("Error loading downloads DB:", error);
    return [];
  }
};

export const saveDownloadsDB = async (db) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error("Error saving downloads DB:", error);
    throw error;
  }
};

export const findDownloadedManga = (db, mangaId, source) => {
  return db.find(isEntryOf(mangaId, source));
};

export const findDownloadedMangaIndex = (db, mangaId, source) => {
  return db.findIndex(isEntryOf(mangaId, source));
};

export const getDownloadedManga = async () => {
  const db = await getRawDownloadsDB();
  // Cover URIs are absolute and go stale like page URIs: rebuild them from the current directory
  return db.map((m) => {
    const coverFile = getCoverFileName(m);
    return coverFile ? { ...m, coverUrl: DOWNLOAD_FOLDER + coverFile } : m;
  });
};
