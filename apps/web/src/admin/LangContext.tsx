import { createContext, useContext } from 'react'
import { Lang } from './i18n'

export const LangContext = createContext<Lang>('eu')

export function useLang(): Lang {
  return useContext(LangContext)
}
