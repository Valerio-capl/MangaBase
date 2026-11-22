import { DownloadManager } from '@/src/api/downloadManager';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { MangaDetailsData } from './types';

export function useChapterDownloads() {
  const [downloadedChapters, setDownloadedChapters] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");

  const refreshDownloads = useCallback(async (mangaId?: string, source?: string) => {
    if (!mangaId) return;
    const ids = await DownloadManager.getDownloadedChapterIds(mangaId.toString(), source?.toString());
    setDownloadedChapters(ids);
  }, []);

  const startDownload = useCallback((
    manga: MangaDetailsData,
    selectedChapters: string[],
    source?: string | string[],
    onSuccess?: () => void
  ) => {
    if (selectedChapters.length === 0 || !manga) return;

    const chaptersToDownload = manga.chapters.filter((ch) => selectedChapters.includes(ch.id));
    setIsDownloading(true);
    setDownloadStatus("Downloading...");
    if (onSuccess) onSuccess();

    const mangaForDownload = {
      ...manga,
      source: source ? source.toString() : undefined,
    };

    DownloadManager.downloadChapters(mangaForDownload, chaptersToDownload, (msg: string) => {
      setDownloadStatus(msg);
    })
      .then(async (result: { failed: string[]; skipped: string[] }) => {
        const hasErrors = result.failed.length > 0;
        const skippedNote = result.skipped.length > 0 ? ` (${result.skipped.length} already downloaded)` : "";
        setIsDownloading(false);
        setDownloadStatus(hasErrors ? `Failed chapters: ${result.failed.join(', ')}` : `Download Completed!${skippedNote}`);
        if (manga.id) {
          await refreshDownloads(manga.id, source?.toString());
        }
        setTimeout(() => setDownloadStatus(""), hasErrors ? 5000 : 3000);
      })
      .catch((err: unknown) => {
        console.error("Download error:", err);
        setIsDownloading(false);
        setDownloadStatus("Download failed");
        setTimeout(() => setDownloadStatus(""), 3000);
      });
  }, [refreshDownloads]);

  const handleDelete = useCallback((
    mangaId: string,
    selectedChapters: string[],
    source?: string | string[],
    onSuccess?: () => void
  ) => {
    if (!mangaId || selectedChapters.length === 0) return;

    Alert.alert(
      "Delete Download",
      `Do you want to delete ${selectedChapters.length} chapters from your device?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await DownloadManager.deleteChapters(mangaId, selectedChapters, source?.toString());
            await refreshDownloads(mangaId, source?.toString());
            if (onSuccess) onSuccess();
            setDownloadStatus("Deleting Chapters");
            setTimeout(() => setDownloadStatus(""), 1000);
          },
        },
      ]
    );
  }, [refreshDownloads]);

  return {
    downloadedChapters,
    isDownloading,
    downloadStatus,
    refreshDownloads,
    startDownload,
    handleDelete,
  };
}
