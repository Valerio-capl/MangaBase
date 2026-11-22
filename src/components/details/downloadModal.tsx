import styles from '@/src/app/mangaDetails/styleScreen';
import React from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';

interface DownloadModalProps {
  visible: boolean;
  downloadStatus: string;
}

export const DownloadModal = React.memo(({ visible, downloadStatus }: DownloadModalProps) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.downloadModal}>
          <ActivityIndicator size="large" color="#A8B5DB" style={{ marginBottom: 15 }} />
          <Text style={styles.downloadModalTitle}>{downloadStatus}</Text>
          <View style={styles.warningBox}>
            <Text style={styles.downloadModalWarning}>
              Warning: Do not close this screen or go back, as this may interrupt the download!
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default DownloadModal;
