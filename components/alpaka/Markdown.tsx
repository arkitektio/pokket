import { Text } from '@/components/ui/text';
import { type InlineNode, parseBlocks } from '@/lib/alpaka/chat/markdown';
import * as React from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** The two tones a message is written in: on the primary colour (mine) or on a card (theirs). */
const tones = (own: boolean) => ({
  text: own ? 'text-primary-foreground' : 'text-card-foreground',
  soft: own ? 'text-primary-foreground/80' : 'text-muted-foreground',
  code: own ? 'bg-primary-foreground/15' : 'bg-muted',
  rule: own ? 'border-primary-foreground/40' : 'border-border',
});

const HEADER_SIZES = ['text-xl', 'text-lg', 'text-base', 'text-base', 'text-sm', 'text-sm'];

function Inline({ nodes, own }: { nodes: InlineNode[]; own: boolean }) {
  return (
    <>
      {nodes.map((node) => {
        if (typeof node === 'string') return node;
        if (node.type === 'code') {
          return (
            <Text key={node.key} style={{ fontFamily: MONO }} className={`text-[13px] ${tones(own).code}`}>
              {node.text}
            </Text>
          );
        }
        if (node.type === 'link') {
          return (
            <Text key={node.key} className="underline" onPress={() => void Linking.openURL(node.url).catch(() => undefined)}>
              <Inline nodes={node.children} own={own} />
            </Text>
          );
        }
        return (
          <Text key={node.key} className={node.type === 'bold' ? 'font-bold' : 'italic'}>
            <Inline nodes={node.children} own={own} />
          </Text>
        );
      })}
    </>
  );
}

/**
 * A message's text: orkestrator's markdown subset, drawn with native text.
 * Selectable, so a long press copies; code scrolls sideways and does not wrap.
 */
export const Markdown = React.memo(function Markdown({ text, own = false }: { text: string; own?: boolean }) {
  const blocks = React.useMemo(() => parseBlocks(text), [text]);
  const tone = tones(own);
  return (
    <View className="gap-2">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'header':
            return (
              <Text key={index} selectable className={`font-semibold ${HEADER_SIZES[block.level - 1] ?? 'text-base'} ${tone.text}`}>
                <Inline nodes={block.inline} own={own} />
              </Text>
            );
          case 'blockquote':
            return (
              <View key={index} className={`border-l-2 pl-3 ${tone.rule}`}>
                <Text selectable className={`text-[15px] italic leading-5 ${tone.soft}`}>
                  <Inline nodes={block.inline} own={own} />
                </Text>
              </View>
            );
          case 'list':
            return (
              <View key={index} className="gap-1">
                {block.items.map((item, itemIndex) => (
                  <View key={itemIndex} className="flex-row gap-2">
                    <Text className={`text-[15px] leading-5 ${tone.soft}`}>{block.ordered ? `${itemIndex + 1}.` : '•'}</Text>
                    <Text selectable className={`flex-1 text-[15px] leading-5 ${tone.text}`}>
                      <Inline nodes={item} own={own} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'code':
            return (
              <ScrollView key={index} horizontal showsHorizontalScrollIndicator={false} className={`rounded-lg ${tone.code}`}>
                <Text selectable style={{ fontFamily: MONO }} className={`p-2.5 text-[13px] leading-[18px] ${tone.text}`}>
                  {block.content}
                </Text>
              </ScrollView>
            );
          default:
            return (
              <Text key={index} selectable className={`text-[15px] leading-5 ${tone.text}`}>
                <Inline nodes={block.inline} own={own} />
              </Text>
            );
        }
      })}
    </View>
  );
});
