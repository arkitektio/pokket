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
  borderClassName?: string;
}

export function HomeCard({ href, title, icon, color, iconBgClassName, borderClassName }: HomeCardProps) {
  return (
    <Link href={href} asChild>
      <Pressable className="flex-1 min-w-[45%] active:opacity-80">
        <Card className={`items-center justify-center p-6 bg-card border border-border shadow-sm h-40 `}>
          <View className={`p-4 rounded-2xl mb-4 bg-primary/15 rounded-xl`}>
            <IconSymbol name={icon} size={32} color={color} />
          </View>
          <Text className="font-semibold text-base text-foreground">{title}</Text>
        </Card>
      </Pressable>
    </Link>
  );
}
