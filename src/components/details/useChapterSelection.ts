import { useState } from 'react';

export function useChapterSelection() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [actionType, setActionType] = useState<'download' | 'delete'>('download');

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedChapters([]);
    } else {
      setSelectionMode(true);
    }
  };

  const activateDownloadMode = () => {
    setActionType('download');
    setSelectionMode(true);
    setSelectedChapters([]);
  };

  const activateDeleteMode = () => {
    setActionType('delete');
    setSelectionMode(true);
    setSelectedChapters([]);
  };

  const toggleChapterSelection = (chapterId: string) => {
    setSelectedChapters((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const resetSelection = () => {
    setSelectionMode(false);
    setSelectedChapters([]);
  };

  return {
    selectionMode,
    selectedChapters,
    actionType,
    toggleSelectionMode,
    activateDownloadMode,
    activateDeleteMode,
    toggleChapterSelection,
    resetSelection,
    setSelectedChapters,
  };
}
