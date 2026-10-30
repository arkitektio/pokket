import { BlokLogo } from '@/components/blok/BlokLogo';
import type { BlokTaskRecord } from '@arkitektio/bsx/runtime';
import type { BlokLogoFragment } from '@/lib/rekuest/api/graphql';

/**
 * An action's logo (a blok whose root is `ActionLogo`), after orkestrator's
 * `rekuest/components/logo/ActionLogo.tsx`. With a `record`, `task` is that
 * task and the logo plays while it runs; see `BlokLogo`.
 */
export function ActionLogo({
  action,
  record,
  className,
}: {
  action: { logo?: BlokLogoFragment | null };
  record?: BlokTaskRecord | null;
  className?: string;
}) {
  return <BlokLogo blok={action.logo} record={record} className={className} />;
}
