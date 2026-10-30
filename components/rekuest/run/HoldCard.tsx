import * as React from 'react';
import {ActivityIndicator, Pressable, TextInput, View} from 'react-native';
import {Check, Hand, MessageSquarePlus, X} from 'lucide-react-native';
import {Text} from '@/components/ui/text';
import {TaskBlokStatus, useDecideMutation} from '@/lib/rekuest/api/graphql';
import type {HoldRequest} from '@/lib/rekuest/run/holds';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {cn} from '@/lib/utils';
import {TaskBlokEmbedById} from './TaskBlokEmbed';

const isEmpty = (value: unknown) =>
  value === undefined || value === null || (typeof value === 'object' && Object.keys(value as object).length === 0);

const shown = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value));

/** What a decision sends: approve or deny, with a note and what was answered through the blok. */
export type HoldDecisionInput = {approved: boolean; answer: string | null; values: Record<string, unknown> | null};

/**
 * Something waits for the user's decision (orkestrator's `HoldCard`): a child
 * an agent asked to run, or a task's own hold. The title and description are
 * the agent's own words; what the server knows for certain (the action, the
 * agent, the arguments) is shown beside them. An ask through a blok is
 * answered in the blok, and only dismissed here.
 *
 * `onDecide` sends the decision; by default it is rekuest's `decide`.
 */
export const HoldCard = ({
  hold,
  onDecide,
  className,
}: {
  hold: HoldRequest;
  onDecide?: (decision: HoldDecisionInput) => Promise<unknown>;
  className?: string;
}) => {
  const colors = useThemeColors();
  const [decide] = useDecideMutation();
  const [answer, setAnswer] = React.useState('');
  const [answering, setAnswering] = React.useState(false);
  const [sending, setSending] = React.useState<'approve' | 'deny' | null>(null);

  const send = (approved: boolean, values?: Record<string, unknown>) => {
    setSending(approved ? 'approve' : 'deny');
    const decision: HoldDecisionInput = {approved, answer: answer.trim() || null, values: values ?? null};
    // Sent, the card stays busy: it goes when the decision comes back as an event. Only a refusal hands the buttons back.
    const sent = onDecide
      ? onDecide(decision)
      : decide({variables: {input: {task: hold.task, ...decision}}});
    return sent.catch(() => setSending(null));
  };
  const asksThroughBlok = hold.kind === 'self' && !!hold.blok;
  const speaker = hold.callerAgent?.name ?? (hold.kind === 'self' ? 'A task' : 'An agent');
  const args = !isEmpty(hold.args) && typeof hold.args === 'object' && !Array.isArray(hold.args)
    ? Object.entries(hold.args as Record<string, unknown>).filter(([, value]) => !isEmpty(value))
    : [];

  return (
    <View
      accessibilityLabel={`Waiting for your decision: ${hold.title}`}
      className={cn('gap-3 overflow-hidden rounded-2xl border border-amber-500/30 bg-card p-3', className)}
    >
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
          <Hand size={20} color="#f59e0b" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-foreground">{hold.title}</Text>
          <Text className="mt-0.5 text-[11px] text-muted-foreground">
            <Text className="text-[11px] font-medium text-foreground">{speaker}</Text>
            {hold.kind === 'assign' && hold.action
              ? ` asks to run ${hold.action.name}${hold.agent ? ` on ${hold.agent.name}` : ''}`
              : ' waits for you'}
          </Text>
        </View>
      </View>

      {hold.description ? (
        <Text className="border-l-2 border-border pl-3 text-xs text-muted-foreground">{hold.description}</Text>
      ) : null}

      {hold.kind === 'assign' && args.length > 0 ? (
        <View className="gap-1 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          {args.map(([key, value]) => (
            <View key={key} className="flex-row gap-3">
              <Text className="w-20 text-[11px] text-muted-foreground">{key}</Text>
              <Text numberOfLines={2} className="flex-1 text-xs text-foreground">
                {shown(value)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {asksThroughBlok && hold.blok ? (
        <TaskBlokEmbedById
          id={hold.blok}
          ask={{
            status:
              sending === 'deny' ? TaskBlokStatus.Dismissed : sending === 'approve' ? TaskBlokStatus.Answered : TaskBlokStatus.Waiting,
          }}
          onReturn={values => send(true, values)}
        />
      ) : null}

      {answering ? (
        <TextInput
          value={answer}
          onChangeText={setAnswer}
          placeholder="Anything to tell it? (optional)"
          placeholderTextColor={colors.mutedForeground}
          multiline
          autoFocus
          className="min-h-14 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
        />
      ) : null}

      <View className="flex-row items-center gap-1.5">
        <Text className="mr-auto text-[11px] text-amber-500">Waiting for you</Text>
        {!answering ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAnswering(true)}
            className="flex-row items-center gap-1 rounded-lg px-2 py-1.5 active:bg-muted"
          >
            <MessageSquarePlus size={14} color={colors.mutedForeground} />
            <Text className="text-xs text-muted-foreground">Note</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={sending !== null}
          onPress={() => void send(false)}
          className="flex-row items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 active:bg-muted"
        >
          {sending === 'deny' ? <ActivityIndicator size="small" /> : <X size={14} color={colors.foreground} />}
          <Text className="text-xs text-foreground">{asksThroughBlok ? 'Dismiss' : 'Deny'}</Text>
        </Pressable>
        {asksThroughBlok ? (
          sending === 'approve' ? <ActivityIndicator size="small" /> : null
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={sending !== null}
            onPress={() => void send(true)}
            className="flex-row items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 active:opacity-90"
          >
            {sending === 'approve' ? (
              <ActivityIndicator size="small" />
            ) : (
              <Check size={14} color={colors.primaryForeground} />
            )}
            <Text className="text-xs text-primary-foreground">Approve</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};
