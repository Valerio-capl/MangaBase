import { StyleSheet, Text, View, Image, TouchableOpacity, StyleProp, ViewStyle } from 'react-native'
import React from 'react'

interface MangaCardProps {
    item: {
        id: string;
        title: string;
        coverUrl: string | null;
    };
    onPress: () => void;
    containerStyle?: StyleProp<ViewStyle>; 
    hideTitle?: boolean;
}

const mangaCard = ({ item, onPress, containerStyle, hideTitle = false }: MangaCardProps) => {
  return (
    <TouchableOpacity 
      style={[styles.card, containerStyle]}
      onPress={onPress}
      activeOpacity={0.7}
    >
        <View style={styles.imageContainer}>
            {item.coverUrl ? (
            <Image 
                source={{ uri: item.coverUrl }} 
                style={styles.coverImage} 
                resizeMode="cover"
            />
            ) : (
            <View style={[styles.coverImage, { backgroundColor: '#333' }]} />
            )}
        </View>
      
        {!hideTitle && (
            <Text 
                style={styles.title} 
                numberOfLines={1} 
                ellipsizeMode="tail"
            >
                {item.title}
            </Text>
        )}
    </TouchableOpacity>
  )
}

export default mangaCard

const styles = StyleSheet.create({
    card: {
        width: 140,
        height: 200,
        marginBottom: 20,
        alignItems: 'center',
    },
    imageContainer: {
        width: '100%',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#2A2F45',
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 6,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    title: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
    },
})