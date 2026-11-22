import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export interface ReaderImage {
  page: number;
  url: string;
  height?: number;
  headers?: Record<string, string>;
}

export const SelfSizingImage = React.memo(({ item, width }: { item: ReaderImage; width: number }) => {
  const [height, setHeight] = useState<number>(0);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  useEffect(() => {
    let isMounted = true;
    Image.getSize(
      item.url,
      (w, h) => {
        if (isMounted) {
          setHeight(width * (h / w));
          setIsCalculated(true);
        }
      },
      (error) => {
        console.warn("Image calculation error:", error);
        if (isMounted) {
          setHeight(width * 1.4);
          setIsCalculated(true);
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [item.url, width]);

  if (!isCalculated) {
    return (
      <View
        style={{
          width: width,
          height: width * 1.4,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000',
        }}
      >
        <ActivityIndicator color="#A8B5DB" />
      </View>
    );
  }

  return (
    <View style={{ width, height, alignItems: 'center', overflow: 'hidden', zIndex: isZoomed ? 10 : 1 }}>
      <GestureDetector gesture={composedGestures}>
        <Animated.Image
          source={{ uri: item.url, headers: item.headers }}
          style={[animatedStyle, { width, height }]}
          resizeMode="contain"
        />
      </GestureDetector>
    </View>
  );
});

export default SelfSizingImage;
