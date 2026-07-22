// React-version-independent stable ID generator.
// useId() was added in React 18. This works in React 16, 17, 18, and 19.

// Usage (replaces useId):
//   import useStableId from '../utils/useStableId.js'
//   const id = useStableId()
//   <label htmlFor={`${id}-name`}>Name</label>
//   <input id={`${id}-name`} />

import { useRef } from 'react'

// Module-level (not per-call) so IDs stay unique across every component
// instance in the app, not just within one.
let counter = 0

export default function useStableId(prefix = 'to') {
    const idRef = useRef(null)
    if (idRef.current === null) {
    counter += 1
    idRef.current = `${prefix}_${counter}`
    }
    return idRef.current
}