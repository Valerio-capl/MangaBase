import { shouldShowChapterTitle } from '@/src/api/chapterUtils';
import styles from '@/src/app/mangaDetails/styleScreen';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Chapter } from './types';

interface ChapterRowProps {
  chapter: Chapter;
  selectionMode: boolean;
  isSelected: boolean;
  isRead: boolean;
  onPress: (chapter: Chapter) => void;
}

export const ChapterRow = React.memo(({
  chapter,
  selectionMode,
  isSelected,
  isRead,
  onPress,
}: ChapterRowProps) => {
  const showTitle = shouldShowChapterTitle(chapter.title, chapter.number);

  return (
    <TouchableOpacity
      style={[
        styles.chapterItem,
        selectionMode && isSelected
          ? { backgroundColor: 'rgba(255, 255, 255, 0.08)' }
          : isRead
            ? styles.read
            : null,
      ]}
      onPress={() => onPress(chapter)}
      activeOpacity={0.7}
    >
      <View>
        <Text style={[styles.chapterNumber, selectionMode && isSelected && { color: '#A8B5DB' }]}>
          chapter {chapter.number}
        </Text>
        {showTitle && (
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
        )}
      </View>

      {selectionMode ? (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      ) : (
        chapter.date ? <Text style={styles.chapterDate}>{chapter.date}</Text> : null
      )}
    </TouchableOpacity>
  );
});

export default ChapterRow;
