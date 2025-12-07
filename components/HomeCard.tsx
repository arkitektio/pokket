import { Card } from '@/components/ui/card';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { Href, Link } from 'expo-router';
import { Pressable, View } from 'react-native';

interface HomeCardProps {
  href: Href;
  title: string;
  icon: IconSymbolName;
  color: string;
  iconBgClassName: string;
}

export function HomeCard({ href, title, icon, color, iconBgClassName }: HomeCardProps) {
  return (
    <Link href={href} asChild>
      <Pressable className="flex-1 min-w-[45%] active:opacity-80">
        <Card className="items-center justify-center p-6 bg-black-200 dark:bg-zinc-900 border-1 border border-zinc-400 shadow-sm h-40">
          <View className={`p-4 rounded-full mb-4 ${iconBgClassName}`}>
            <IconSymbol name={icon} size={36} color={color} />
          </View>
          <Text className="font-semibold text-lg text-foreground">{title}</Text>
        </Card>
      </Pressable>
    </Link>
  );
}
