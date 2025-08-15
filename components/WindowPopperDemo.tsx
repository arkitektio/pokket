import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import React from 'react';
import { Alert, View } from 'react-native';

interface WindowPopperDemoProps {
  popper?: {
    open: (url: string) => { close: () => Promise<void> };
    close: (popup: any) => void;
  };
}

export const WindowPopperDemo: React.FC<WindowPopperDemoProps> = ({ popper }) => {
  const handleOpenUrl = (url: string) => {
    if (!popper) {
      Alert.alert('Error', 'Window popper not available');
      return;
    }

    try {
      const popup = popper.open(url);
      console.log('Opened URL in browser:', url);
      
      // You can store the popup reference if you need to close it later
      // For example, you could set it in state and close it with a timer:
      // setTimeout(() => popup.close(), 10000); // Close after 10 seconds
      
      // Store popup reference to avoid unused variable warning
      if (popup) {
        console.log('Popup reference created successfully');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to open URL: ${error}`);
    }
  };

  const sampleUrls = [
    'https://google.com',
    'https://github.com',
    'https://reactnative.dev',
    'https://expo.dev'
  ];

  return (
    <View style={{ padding: 20, gap: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Window Popper Demo
      </Text>
      
      <Text style={{ marginBottom: 16, color: '#666' }}>
        Tap any button below to open a URL in your device&apos;s default browser:
      </Text>

      {sampleUrls.map((url, index) => (
        <Button
          key={index}
          onPress={() => handleOpenUrl(url)}
          variant="outline"
        >
          <Text>Open {url}</Text>
        </Button>
      ))}

      <View style={{ marginTop: 20, padding: 16, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
        <Text style={{ fontSize: 14, color: '#666' }}>
          Note: In React Native, opened browser windows cannot be programmatically closed. 
          Users must manually close the browser or return to the app.
        </Text>
      </View>
    </View>
  );
};

export default WindowPopperDemo;
