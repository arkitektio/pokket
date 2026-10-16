import { BlokLogo } from '@/components/blok/BlokLogo';
import type { AgentLogoFragment } from '@/lib/rekuest/api/graphql';

/** An agent's logo: the blok it declared as its default for the LOGO context. */
export function AgentLogo({ agent, className }: { agent: AgentLogoFragment; className?: string }) {
  return <BlokLogo blok={agent.logo?.blok} className={className} />;
}
