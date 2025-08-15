import { useEffect } from 'react';
import { View } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useMeQuery } from '@/lib/lok/api/graphql';
import { Text } from './ui/text';

export function HelloWave() {

  const { data} = useMeQuery({})


  const rotationAnimation = useSharedValue(0);

  useEffect(() => {
    rotationAnimation.value = withRepeat(
      withSequence(withTiming(25, { duration: 150 }), withTiming(0, { duration: 150 })),
      4 // Run the animation 4 times
    );
  }, [rotationAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationAnimation.value}deg` }],
  }));

  return (
    <View className='flex-row items-center'>
    <Text className='text-3xl font-semibold'>

      Hi {data?.me?.username} :) 
    </Text>
    </View>
  );
}

