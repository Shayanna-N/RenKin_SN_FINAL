import { cn } from '@/lib/utils'
import { badgeById, readableOn, toPublicAvatar } from '@/lib/companion'
import type { Animal, CompanionConfig, Mode, PublicAvatar } from '@/lib/types'

export function AnimalSilhouette({
  animal,
  className,
  style,
}: {
  animal: Animal
  className?: string
  style?: React.CSSProperties
}) {
  const url = `url(/animals/${animal}.png)`
  return (
    <span
      aria-hidden
      className={cn('block bg-current', className)}
      style={{
        ...style,
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}

/** Badges sit on the right-hand rim, from top-right sweeping down to bottom. */
const BADGE_ANGLES = [-60, -22, 16, 54, 92]

const SIZE = {
  sm: { box: 'size-9', animal: 'size-6', chip: 'size-3.5 p-0.5 border', icon: 'size-2.5' },
  md: { box: 'size-14', animal: 'size-9', chip: 'size-5 p-0.5 border-2', icon: 'size-3' },
  lg: { box: 'size-28', animal: 'size-18', chip: 'size-8 p-1.5 border-2', icon: 'size-4.5' },
}

export function ProfileAvatar({
  avatar,
  name,
  size = 'md',
  className,
}: {
  avatar: PublicAvatar
  name: string
  size?: keyof typeof SIZE
  className?: string
}) {
  const fg = readableOn(avatar.color)
  const s = SIZE[size]
  const badges = avatar.badges.map(badgeById).filter((b) => b !== undefined)
  const interests = badges.map((b) => b.label).join(', ')

  return (
    <span
      role="img"
      aria-label={interests ? `${name}. Interests: ${interests}` : name}
      className={cn('relative inline-flex shrink-0', s.box, className)}
    >
      <span
        className="flex size-full items-center justify-center overflow-hidden rounded-full"
        style={{ backgroundColor: avatar.color, color: fg }}
      >
        {avatar.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- small inline data URL
          <img src={avatar.photo} alt="" className="size-full object-cover" />
        ) : (
          <AnimalSilhouette animal={avatar.animal} className={s.animal} />
        )}
      </span>
      {badges.map((b, i) => {
        const rad = (BADGE_ANGLES[i] * Math.PI) / 180
        const Icon = b.icon
        return (
          <span
            key={b.id}
            aria-hidden
            className={cn(
              'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-background bg-card text-foreground shadow-sm',
              s.chip,
            )}
            style={{ left: `${50 + 50 * Math.cos(rad)}%`, top: `${50 + 50 * Math.sin(rad)}%` }}
          >
            <Icon className={s.icon} />
          </span>
        )
      })}
    </span>
  )
}

export function CompanionAvatar({
  companion,
  fallbackColor,
  mode,
  size = 'md',
  className,
}: {
  companion: CompanionConfig
  fallbackColor: string
  mode: Mode
  size?: keyof typeof SIZE
  className?: string
}) {
  return (
    <ProfileAvatar
      avatar={toPublicAvatar(companion, fallbackColor, mode)}
      name={`${companion.name} the ${companion.animal}`}
      size={size}
      className={className}
    />
  )
}

/** Avatar for a saved contact: their Renkin pfp when we have it, otherwise initials. */
export function ContactAvatar({
  name,
  avatar,
  className,
}: {
  name: string
  avatar?: PublicAvatar
  className?: string
}) {
  if (avatar) return <ProfileAvatar avatar={avatar} name={name} size="md" className={cn('size-10', className)} />
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary',
        className,
      )}
    >
      {name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)}
    </span>
  )
}
