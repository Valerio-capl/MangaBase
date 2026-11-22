import { icons } from '@/constants/icons';
import styles from '@/src/app/mangaDetails/styleScreen';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface ChapterListHeaderProps {
  selectionMode: boolean;
  totalChapters: number;
  selectedCount: number;
  onActivateDownload: () => void;
  onActivateDelete: () => void;
}

export const ChapterListHeader = React.memo(({
  selectionMode,
  totalChapters,
  selectedCount,
  onActivateDownload,
  onActivateDelete,
}: ChapterListHeaderProps) => {
  return (
    <View style={[styles.chaptersHeader, selectionMode && styles.chaptersHeaderSelected]}>
      <Text style={styles.sectionTitle}>
        {selectionMode ? `Selected: ${selectedCount}` : `Chapters (${totalChapters})`}
      </Text>

      {!selectionMode && (
        <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
          <TouchableOpacity onPress={onActivateDelete}>
            <Image
              source={icons.trashcan}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
              tintColor="#FF6B6B"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onActivateDownload}>
            <Image
              source={icons.download}
              style={styles.downloadIcon}
              resizeMode="contain"
              tintColor="#A8B5DB"
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

export default ChapterListHeader;
