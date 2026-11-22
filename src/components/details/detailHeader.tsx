import { icons } from '@/constants/icons';
import styles from '@/src/app/mangaDetails/styleScreen';
import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Chapter, MangaDetailsData } from './types';

interface DetailHeaderProps {
  manga: MangaDetailsData;
  isSaved: boolean;
  onSavePress: () => void;
  continueTarget: { state: string; chapter: Chapter } | null;
  onContinuePress: (chapter: Chapter) => void;
}

export const DetailHeader = React.memo(({
  manga,
  isSaved,
  onSavePress,
  continueTarget,
  onContinuePress,
}: DetailHeaderProps) => {
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const isUpToDate = continueTarget?.state === 'upToDate';
  let continueLabel = '';
  if (continueTarget) {
    if (isUpToDate) {
      continueLabel = 'Up to date';
    } else if (continueTarget.state === 'start') {
      continueLabel = `Start reading · Chapter ${continueTarget.chapter.number}`;
    } else {
      continueLabel = `Continue · Chapter ${continueTarget.chapter.number}`;
    }
  }

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topSection}>
        <Image
          source={{ uri: manga.coverUrl }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={3}>{manga.title}</Text>

            <TouchableOpacity
              onPress={onSavePress}
              style={styles.saveButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Image
                source={isSaved ? icons.saveFilled : icons.save}
                style={styles.saveIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.metaText}>
            <Text style={styles.label}>Author: </Text>{manga.author}
          </Text>
          <Text style={styles.metaText}>
            <Text style={styles.label}>Year: </Text>{manga.year}
          </Text>
          <Text style={styles.metaText}>
            <Text style={styles.label}>Status: </Text>{manga.status}
          </Text>
        </View>
      </View>

      {manga.description ? (
        <View style={styles.descSection}>
          <Text style={styles.description} numberOfLines={isDescExpanded ? undefined : 4}>
            {manga.description}
          </Text>
          {manga.description.length > 100 && (
            <TouchableOpacity
              onPress={() => setIsDescExpanded(!isDescExpanded)}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: '#A8B5DB', fontWeight: 'bold', fontSize: 13 }}>
                {isDescExpanded ? 'Show less' : 'Show more...'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {continueTarget && (
        <TouchableOpacity
          style={[styles.continueButton, isUpToDate && styles.continueButtonDisabled]}
          onPress={() => onContinuePress(continueTarget.chapter)}
          disabled={isUpToDate}
          activeOpacity={0.8}
        >
          <Text style={[styles.continueButtonText, isUpToDate && styles.continueButtonTextDisabled]}>
            {continueLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

export default DetailHeader;
