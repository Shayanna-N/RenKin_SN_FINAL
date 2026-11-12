import {
  Briefcase,
  Camera,
  Coffee,
  Crown,
  Feather,
  Flower2,
  Gem,
  Glasses,
  GraduationCap,
  Headphones,
  Heart,
  Leaf,
  Music,
  Ribbon,
  Sparkles,
  Sprout,
  Star,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import type { Animal, CardStyle, CompanionConfig, Mode, PublicAvatar } from './types'

export const ANIMALS: { id: Animal; label: string; trait: string }[] = [
  { id: 'capybara', label: 'Capybara', trait: 'Calm, gets along with everyone' },
  { id: 'elephant', label: 'Elephant', trait: 'Never forgets a face' },
  { id: 'alpaca', label: 'Alpaca', trait: 'Friendly and a little quirky' },
  { id: 'elk', label: 'Elk', trait: 'Steady, stands out in a crowd' },
  { id: 'tiger', label: 'Tiger', trait: 'Bold, goes after the big intro' },
  { id: 'orca', label: 'Orca', trait: 'Smart, thrives in a pod' },
  { id: 'wolf', label: 'Wolf', trait: 'Loyal, keeps the pack connected' },
]

export const MAX_BADGES = 5

export interface Badge {
  id: string
  /** Only shown to the owner while picking — badges render without text on the pfp. */
  label: string
  icon: LucideIcon
}

export const BADGES: Badge[] = [
  { id: 'sprout', label: 'Growth & sustainability', icon: Sprout },
  { id: 'leaf', label: 'Outdoors', icon: Leaf },
  { id: 'flower', label: 'Gardening', icon: Flower2 },
  { id: 'grad-cap', label: 'Learning', icon: GraduationCap },
  { id: 'glasses', label: 'Reading', icon: Glasses },
  { id: 'feather', label: 'Writing', icon: Feather },
  { id: 'headphones', label: 'Podcasts', icon: Headphones },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'camera', label: 'Photography', icon: Camera },
  { id: 'sparkles', label: 'Design', icon: Sparkles },
  { id: 'earrings', label: 'Fashion', icon: Gem },
  { id: 'coffee', label: 'Coffee chats', icon: Coffee },
  { id: 'sun', label: 'Travel', icon: Sun },
  { id: 'heart', label: 'Volunteering', icon: Heart },
  { id: 'ribbon', label: 'Causes', icon: Ribbon },
  { id: 'briefcase', label: 'Business', icon: Briefcase },
  { id: 'crown', label: 'Leadership', icon: Crown },
  { id: 'star', label: 'Mentoring', icon: Star },
]

export const badgeById = (id: string) => BADGES.find((b) => b.id === id)

export function toggleBadge(current: string[], id: string): string[] {
  if (current.includes(id)) return current.filter((b) => b !== id)
  if (current.length >= MAX_BADGES) return current
  return [...current, id]
}

/** The avatar other people see: your photo or companion, plus this mode's badges. */
export function toPublicAvatar(companion: CompanionConfig, brand: string, mode: Mode): PublicAvatar {
  return {
    animal: companion.animal,
    color: companion.color ?? brand,
    photo: companion.photo,
    badges: companion.badgesVisible ? (companion.badges[mode] ?? []).slice(0, MAX_BADGES) : [],
  }
}

export const CARD_STYLES: { id: CardStyle; label: string }[] = [
  { id: 'gradient', label: 'Gradient' },
  { id: 'solid', label: 'Solid' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'glass', label: 'Glass' },
  { id: 'metallic', label: 'Metallic' },
  { id: 'holographic', label: 'Holo' },
  { id: 'linen', label: 'Linen' },
]

/** Pick black or white text for legibility on a given hex background. */
export function readableOn(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.4 ? '#111114' : '#ffffff'
}

/** Downscale an uploaded image to a small square JPEG data URL for use as a pfp. */
export function resizeToAvatar(file: File, size = 192): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable'))
      const side = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    img.src = url
  })
}
