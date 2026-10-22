import { ref } from 'vue'

// wraps an api call so views get data/loading/error for free
// usage: const { data, loading, error, execute } = useApi(() => getClients())
export function useApi(apiCall) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // any args get passed straight to apiCall (handy for search queries)
  async function execute(...args) {
    loading.value = true
    error.value = null
    try {
      data.value = await apiCall(...args)
    } catch (err) {
      // interceptor already turned this into a readable message
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
