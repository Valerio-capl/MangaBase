import * as FileSystem from 'expo-file-system/legacy';
import { DOWNLOAD_FOLDER } from './paths';

export const logChapterStorage = async (folderUri, storedUrl, rebuiltUrl) => {
  try {
    console.log("[Downloads] documentDirectory:", FileSystem.documentDirectory);
    console.log("[Downloads] stored URL (first page):", storedUrl);
    console.log("[Downloads] rebuilt URL (first page):", rebuiltUrl);

    const rebuiltInfo = await FileSystem.getInfoAsync(rebuiltUrl);
    console.log("[Downloads] rebuilt file exists:", rebuiltInfo.exists);
    if (storedUrl) {
      const storedInfo = await FileSystem.getInfoAsync(storedUrl);
      console.log("[Downloads] stored file exists:", storedInfo.exists);
    }

    let dir = folderUri;
    while (dir.length >= DOWNLOAD_FOLDER.length) {
      const info = await FileSystem.getInfoAsync(dir);
      if (info.exists) {
        const entries = await FileSystem.readDirectoryAsync(dir);
        console.log(`[Downloads] ${dir} contains ${entries.length} entries:`, entries.slice(0, 20));
        break;
      }
      console.log(`[Downloads] missing folder: ${dir}`);
      dir = dir.replace(/[^/]+\/$/, '');
    }
  } catch (e) {
    console.warn("[Downloads] diagnostic failed:", e);
  }
};
