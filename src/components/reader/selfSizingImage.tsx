import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageLoadEvent,
  StyleSheet,
  View,
} from 'react-native';

import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

interface SelfSizingImageProps {
  item: ReaderImage;
  width: number;
  estimatedRatio?: number; // height / width guessed from the first loaded page
  onMeasured?: (ratio: number) => void;
}

export interface ReaderImage {
  page: number;
  url: string;
  height?: number;
  headers?: Record<string, string>;
}

export const SelfSizingImage = React.memo(({
  item,
  width,
  estimatedRatio = 1.4,
  onMeasured,
}: SelfSizingImageProps) => {
  'use no memo'; // keep React Compiler away from shared values read in gesture callbacks.
  const [measuredRatio, setMeasuredRatio] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const height = width * (measuredRatio ?? estimatedRatio);

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onDeactivate: () => {
      scale.value = withSpring(1);
      savedScale.value = 1;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      scheduleOnRN(setIsZoomed, false);
    },
  });

  const pinch = usePinchGesture({
    onUpdate: (event) => {
      scale.value = Math.max(1, savedScale.value * event.scale);
    },
    onDeactivate: () => {
      if (scale.value > 1.05) {
        savedScale.value = scale.value;
        scheduleOnRN(setIsZoomed, true);
      } else {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        scheduleOnRN(setIsZoomed, false);
      }
    },
  });

  const pan = usePanGesture({
    enabled: isZoomed,
    onUpdate: (event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    },
    onDeactivate: () => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
  });

  const composedGestures = useSimultaneousGestures(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const handleLoad = (event: ImageLoadEvent) => {
    const { width: w, height: h } = event.nativeEvent.source;
    if (w > 0 && h > 0) {
      setMeasuredRatio(h / w);
      onMeasured?.(h / w);
    }
    setIsLoaded(true);
  };


  return (
    <View style={{ width, height, alignItems: 'center', overflow: 'hidden', zIndex: isZoomed ? 10 : 1 }}>
      <GestureDetector gesture={composedGestures}>
        <Animated.Image
          source={{ uri: item.url, headers: item.headers }}
          style={[animatedStyle, { width, height }]}
          resizeMode="contain"
          onLoad={handleLoad}
          onError={() => setIsLoaded(true)}
        />
      </GestureDetector>
      {!isLoaded && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: 'center' }]}>
          <ActivityIndicator color="#A8B5DB" />
        </View>
      )}
    </View>
  );
});

export default SelfSizingImage;
