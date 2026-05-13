// useApi.js
// Generic hook that handles loading, error, and data state
// for any API call. Use this in every page.

import { useState, useEffect, useCallback, useRef } from 'react'

export function useApi(apiFn, deps = []) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState(null)
  const firstLoadRef = useRef(true)

  const fetch = useCallback(async () => {
    const isInitialLoad = firstLoadRef.current
    if (isInitialLoad) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)

    try {
      const res = await apiFn()
      const payload =
        res && typeof res === 'object' && 'data' in res
          ? res.data
          : (res ?? null)
      setData(payload)
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      if (isInitialLoad) {
        setLoading(false)
        firstLoadRef.current = false
      } else {
        setRefreshing(false)
      }
    }
  }, deps)

  useEffect(() => { fetch() }, [fetch])

  // expose refetch so components can manually re-trigger
  return { data, loading, refreshing, error, refetch: fetch }
}
