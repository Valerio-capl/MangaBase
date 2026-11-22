import styles from '@/src/app/mangaDetails/styleScreen';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface SelectionActionButtonProps {
  selectionMode: boolean;
  selectedCount: number;
  actionType: 'download' | 'delete';
  onPress: () => void;
}

export const SelectionActionButton = React.memo(({
  selectionMode,
  selectedCount,
  actionType,
  onPress,
}: SelectionActionButtonProps) => {
  if (!selectionMode || selectedCount === 0) return null;

  return (
    <View style={styles.floatingContainer}>
      {actionType === 'download' ? (
        <TouchableOpacity style={styles.downloadFab} onPress={onPress}>
          <Text style={styles.downloadFabText}>
            Download {selectedCount} Chapters
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.downloadFab, { backgroundColor: '#FF6B6B' }]}
          onPress={onPress}
        >
          <Text style={[styles.downloadFabText, { color: 'white' }]}>
            Delete {selectedCount} Chapters
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

export default SelectionActionButton;
