import type { UseWordGridGameBaseOptions, UseWordGridGameResult } from './useWordGridGameBase'
import { useWordGridGameBase } from './useWordGridGameBase'

export type UseWordGridHuntGameOptions = Omit<UseWordGridGameBaseOptions, 'removeOnMatch'>

export const useWordGridHuntGame = (
  options: UseWordGridHuntGameOptions
): UseWordGridGameResult => {
  return useWordGridGameBase({ ...options, removeOnMatch: false })
}
