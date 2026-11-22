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