import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'read_chapters';

export const getAllReadingProgress = async () => {
  try {
    const progressJson = await AsyncStorage.getItem(STORAGE_KEY);
    return progressJson ? JSON.parse(progressJson) : {};
  } catch (error) {
    console.error("Error loading reading progress:", error);
    return {};
  }
};

export const getReadChapters = async (mangaId) => {
  if (!mangaId) return [];
  try {
    const progress = await getAllReadingProgress();
    return progress[String(mangaId)] || [];
  } catch (error) {
    console.error("Error loading read chapters:", error);
    return [];
  }
};

export const saveChapterRead = async (mangaId, chapterId) => {
  if (!mangaId || !chapterId) return [];
  try {
    const progress = await getAllReadingProgress();
    const idKey = String(mangaId);
    const previous = progress[idKey] || [];
    const updated = [...previous.filter((readId) => readId !== chapterId), String(chapterId)];
    progress[idKey] = updated;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return updated;
  } catch (error) {
    console.error("Error saving chapter read:", error);
    throw error;
  }
};

// decides which chapter the "continue" button opens.
// chapters: newest first, the same order the reader uses for previous/next.
// readIds: chapter ids in the order they were read, the most recent one last.
export const getContinueTarget = (chapters, readIds = []) => {
  if (!chapters || chapters.length === 0) return null;
  const indexById = new Map(chapters.map((chapter, index) => [chapter.id, index]));
  for (let i = readIds.length - 1; i >= 0; i--) {
    const readIndex = indexById.get(readIds[i]);
    if (readIndex === undefined) continue;
    if (readIndex === 0) {
      return { state: 'upToDate', chapter: chapters[0] };
    }
    return { state: 'continue', chapter: chapters[readIndex - 1] };
  }

  // nothing read yet, or nothing matches the current list: start from the oldest chapter
  return { state: 'start', chapter: chapters[chapters.length - 1] };
};
