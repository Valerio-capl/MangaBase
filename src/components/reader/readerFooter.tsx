import AntDesign from '@expo/vector-icons/AntDesign';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface ReaderFooterProps {
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export const ReaderFooter = React.memo(({ onPrev, onNext, hasPrev, hasNext }: ReaderFooterProps) => {
  return (
    <View style={styles.footerContainer}>
      <TouchableOpacity
        style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
        disabled={!hasPrev}
        onPress={onPrev}
        activeOpacity={0.7}
      >
        <AntDesign name="arrow-left" size={22} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
        disabled={!hasNext}
        onPress={onNext}
        activeOpacity={0.7}
      >
        <AntDesign name="arrow-right" size={22} color="white" />
      </TouchableOpacity>
    </View>
  );
});

export default ReaderFooter;

const styles = StyleSheet.create({
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 15,
    paddingHorizontal: 70,
    paddingBottom: 60,
    backgroundColor: '#000',
  },
  navButton: {
    flex: 1,
    padding: 6,
    backgroundColor: '#232c55',
    borderRadius: 12,
    alignItems: 'center',
    alignContent: 'space-around',
    marginHorizontal: 10,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
});
