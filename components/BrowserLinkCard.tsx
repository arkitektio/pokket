import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import React from 'react';
import { Alert, View } from 'react-native';

// Example usage of the window popper in your app
// You can use this pattern anywhere in your app where you have access to the popper

interface BrowserLinkCardProps {
  title: string;
  description: string;
  url: string;
  popper?: {
    open: (url: string) => { close: () => Promise<void> };
    close: (popup: any) => void;
  };
}

export const BrowserLinkCard: React.FC<BrowserLinkCardProps> = ({ 
  title, 
  description, 
  url, 
  popper 
}) => {
  const handleOpenLink = () => {
    if (!popper) {
      Alert.alert('Error', 'Browser functionality not available');
      return;
    }

    try {
      popper.open(url);
      console.log(`Opening ${url} in browser`);
    } catch (error) {
      Alert.alert('Error', `Failed to open link: ${error}`);
    }
  };

  return (
    <Card style={{ marginVertical: 8 }}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Text style={{ marginBottom: 12, color: '#666' }}>
          {description}
        </Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 12, color: '#888' }}>
            {url}
          </Text>
          
          <Button 
            onPress={handleOpenLink}
            variant="outline"
            size="sm"
          >
            <Text>Open</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
};

// Example of how to use multiple browser links in a screen
export const BrowserLinksDemo: React.FC<{ popper?: any }> = ({ popper }) => {
  const links = [
    {
      title: 'React Native Docs',
      description: 'Learn more about React Native development',
      url: 'https://reactnative.dev/docs/getting-started',
    },
    {
      title: 'Expo Documentation',
      description: 'Explore Expo tools and services',
      url: 'https://docs.expo.dev/',
    },
    {
      title: 'GitHub Repository',
      description: 'View the source code and contribute',
      url: 'https://github.com/facebook/react-native',
    },
  ];

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
        External Resources
      </Text>
      
      {links.map((link, index) => (
        <BrowserLinkCard
          key={index}
          title={link.title}
          description={link.description}
          url={link.url}
          popper={popper}
        />
      ))}
    </View>
  );
};

export default BrowserLinkCard;
