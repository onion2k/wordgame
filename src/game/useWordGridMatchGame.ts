import type { UseWordGridGameBaseOptions, UseWordGridGameResult } from './useWordGridGameBase'
import { useWordGridGameBase } from './useWordGridGameBase'

export type UseWordGridMatchGameOptions = Omit<UseWordGridGameBaseOptions, 'removeOnMatch'>

export const useWordGridMatchGame = (
  options: UseWordGridMatchGameOptions
): UseWordGridGameResult => {
  return useWordGridGameBase({ ...options, removeOnMatch: true })
}
