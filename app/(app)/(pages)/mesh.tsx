import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { useMeshRecord } from '@/lib/mesh/hooks';
import { mesh } from '@/lib/mesh/integration';
import { meshAliases } from '@/lib/mesh/meshNeed';
import { useMeshSnapshot } from '@/lib/mesh/status';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { meshNative, type MeshNodeState, type MeshPeer } from '@/modules/pokket-mesh';
import * as React from 'react';
import { ScrollView, Switch, View } from 'react-native';

/** Same words as orkestrator's Mesh page. */
const STATE: Record<MeshNodeState, { label: string; tone: 'ok' | 'busy' | 'bad' | 'off' }> = {
  stopped: { label: 'Not running', tone: 'off' },
  starting: { label: 'Connecting', tone: 'busy' },
  'needs-login': { label: 'Membership lapsed', tone: 'bad' },
  'needs-machine-auth': { label: 'Awaiting approval', tone: 'busy' },
  running: { label: 'Connected', tone: 'ok' },
  error: { label: 'Error', tone: 'bad' },
};

const TONE_CLASS = {
  ok: 'bg-chart-2/20 text-foreground',
  busy: 'bg-chart-4/20 text-foreground',
  bad: 'bg-destructive/20 text-destructive',
  off: 'bg-muted text-muted-foreground',
};

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 mb-4">
      <Text className="font-semibold mb-1">{title}</Text>
      <Text className="text-muted-foreground text-sm">{children}</Text>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className="text-sm flex-shrink ml-4 text-right" selectable>
        {value}
      </Text>
    </View>
  );
}

const peerPath = (peer: MeshPeer): string | undefined =>
  peer.relay ? `via relay ${peer.relay}` : peer.curAddr ? `direct ${peer.curAddr}` : undefined;

function PeerRow({ peer }: { peer: MeshPeer }) {
  const name = peer.dnsName || peer.hostName || peer.ips[0] || 'unknown';
  return (
    <View className="flex-row items-center py-2 border-t border-border">
      <View className={`w-2 h-2 rounded-full mr-3 ${peer.online ? 'bg-chart-2' : 'bg-muted-foreground'}`} />
      <View className="flex-1">
        <Text className="text-sm" selectable>{name}</Text>
        <Text className="text-xs text-muted-foreground">
          {[peer.ips[0], peer.os, peerPath(peer)].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );
}

export default function MeshScreen() {
  const colors = useThemeColors();
  const connection = App.useConnection();
  const record = useMeshRecord();
  const { nodes, logs } = useMeshSnapshot();
  const [busy, setBusy] = React.useState(false);

  const available = !!meshNative();
  const endpoint = connection?.endpoint;
  const fakts = connection?.fakts;
  const status = record ? nodes[record.mesh.id] : undefined;
  const state = STATE[status?.state ?? 'stopped'] ?? STATE.error;
  const carried = meshAliases(fakts, record?.mesh);

  const toggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      await mesh.setEnabled(enabled, fakts);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-4 pt-6 pb-10">
        {!available ? (
          <Notice title="This build has no mesh">
            The mesh needs a build of pokket made with the mesh sidecar (`pnpm build:mesh`). Every
            service is reached directly.
          </Notice>
        ) : null}

        {available && endpoint?.mesh_coord_url && !record ? (
          <Notice title="Not on this deployment's mesh">
            {endpoint.name} has a mesh, but this organization&apos;s login was not let into it. Add the
            organization again from the switcher, and allow the mesh when you approve pokket.
          </Notice>
        ) : null}

        {available && !endpoint?.mesh_coord_url && !record ? (
          <Notice title="No mesh">
            {endpoint?.name ?? 'This deployment'} does not run an organisation mesh, so every
            service of this organization is reached directly.
          </Notice>
        ) : null}

        {record ? (
          <Card className="p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 mr-3">
                <Text className="text-lg font-semibold">{record.mesh.label}</Text>
                <View className={`self-start mt-1 px-2 py-0.5 rounded ${TONE_CLASS[state.tone]}`}>
                  <Text className="text-xs">{record.mesh.enabled ? state.label : 'Switched off'}</Text>
                </View>
              </View>
              <Switch
                value={record.mesh.enabled}
                disabled={busy || !available}
                onValueChange={(value) => void toggle(value)}
                trackColor={{ true: colors.primary }}
              />
            </View>

            {status?.error ? <Text className="text-destructive text-sm mb-2">{status.error}</Text> : null}
            {status?.state === 'needs-login' ? (
              <Text className="text-muted-foreground text-sm mb-2">
                The mesh no longer knows this device. Sign out and in again to rejoin.
              </Text>
            ) : null}

            <Fact label="Control server" value={record.mesh.controlUrl} />
            <Fact label="Tailnet" value={status?.tailnetName} />
            <Fact label="This device" value={status?.selfDnsName || status?.selfIps?.[0]} />
            <Fact label="Names" value={status?.magicDnsSuffix ? `*.${status.magicDnsSuffix}` : undefined} />
            <Fact
              label="Carries"
              value={carried.length ? carried.join(', ') : 'Nothing — every service is reached directly'}
            />
          </Card>
        ) : null}

        {record && status?.peers?.length ? (
          <Card className="p-4 mb-4">
            <Text className="font-semibold mb-2">
              Machines ({status.peers.filter((peer) => peer.online).length} online)
            </Text>
            {status.peers.map((peer) => (
              <PeerRow key={peer.dnsName || peer.ips.join(',')} peer={peer} />
            ))}
          </Card>
        ) : null}

        {logs.length ? (
          <Card className="p-4">
            <Text className="font-semibold mb-2">Log</Text>
            {logs.slice(-15).map((line, index) => (
              <Text key={`${line.at}-${index}`} className="text-xs text-muted-foreground" selectable>
                {line.message}
              </Text>
            ))}
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}
