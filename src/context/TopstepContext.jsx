import { createContext, useContext } from 'react'
import { useTopstepX } from '../hooks/useTopstepX'

const Ctx = createContext(null)

export function TopstepProvider({ children }) {
  const tsx = useTopstepX()
  return <Ctx.Provider value={tsx}>{children}</Ctx.Provider>
}

export function useTopstep() {
  return useContext(Ctx)
}
