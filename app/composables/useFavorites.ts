import { getSetting, setSetting } from '~/db'

const favoriteIds = ref<Set<number>>(new Set())
let loaded = false

async function load() {
  if (loaded) return
  loaded = true
  const ids = await getSetting<number[]>('favorite_products', [])
  favoriteIds.value = new Set(ids)
}

export function useFavorites() {
  if (import.meta.client) load()

  function isFavorite(id: number) {
    return favoriteIds.value.has(id)
  }

  async function toggleFavorite(id: number) {
    const next = new Set(favoriteIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    favoriteIds.value = next
    await setSetting('favorite_products', [...next])
  }

  return { favoriteIds, isFavorite, toggleFavorite }
}
