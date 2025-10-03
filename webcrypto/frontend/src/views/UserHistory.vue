<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- En-tête avec informations utilisateur -->
      <div class="bg-white rounded-xl shadow-md p-6 mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="h-16 w-16">
              <img v-if="userData?.photo" 
                   :src="userData.photo" 
                   :alt="userData?.username"
                   class="h-16 w-16 rounded-full object-cover" 
                   @error="handleImageError" />
              <div v-else 
                   class="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <span class="text-indigo-700 font-bold text-xl">
                  {{ userData?.username?.[0]?.toUpperCase() || 'U' }}
                </span>
              </div>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">
                Historique de {{ userData?.username || 'l\'utilisateur' }}
              </h1>
              <p class="text-sm text-gray-500">
                {{ userData?.operations_count || 0 }} opérations au total
              </p>
            </div>
          </div>
          <button
            @click="goBack"
            class="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors duration-200"
          >
            Retour à la liste
          </button>
        </div>
      </div>

      <!-- Filtres -->
      <div class="bg-white rounded-xl shadow-md p-6 mb-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Filtre Date Début -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date début</label>
            <input
              type="datetime-local"
              v-model="filters.startDate"
              class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <!-- Filtre Date Fin -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
            <input
              type="datetime-local"
              v-model="filters.endDate"
              class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <!-- Filtre Crypto -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Crypto-monnaie</label>
            <select
              v-model="filters.crypto"
              class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Toutes les cryptos</option>
              <option v-for="crypto in cryptoList" :key="crypto.id" :value="crypto.symbol">
                {{ crypto.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Boutons de filtrage -->
        <div class="mt-4 flex justify-end space-x-3">
          <button
            @click="resetFilters"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            Réinitialiser
          </button>
          <button
            @click="applyFilters"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-200"
          >
            Appliquer les filtres
          </button>
        </div>
      </div>

      <!-- Liste des opérations -->
      <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opération
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Crypto
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="operation in filteredOperations" :key="operation.id" 
                  class="hover:bg-gray-50 transition-colors duration-200">
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    'px-2 py-1 text-xs font-medium rounded-full',
                    operation.type === 'achat' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  ]">
                    {{ operation.type }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ operation.crypto_symbol }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatAmount(operation.amount) }} €
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(operation.created_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { socket } from '@/socket'

export default {
  name: 'UserHistory',
  
  setup() {
    const router = useRouter()
    const route = useRoute()
    const operations = ref([])
    const cryptoList = ref([])
    const userData = ref(null)
    const isAuthenticated = ref(false)

    // Initialiser les filtres avec la date du jour
    const initializeDefaultFilters = () => {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      
      return {
        startDate: startOfDay.toISOString().slice(0, 16),
        endDate: endOfDay.toISOString().slice(0, 16),
        crypto: '',
        userId: route.params.userId
      }
    }

    const filters = ref(initializeDefaultFilters())

    // Récupérer les opérations
    const loadOperations = () => {
      if (!isAuthenticated.value) return
      console.log('Chargement des opérations avec les filtres:', filters.value)
      socket.emit('getOperationsHistory', {
        startDate: filters.value.startDate || null,
        endDate: filters.value.endDate || null,
        crypto: filters.value.crypto || null,
        userId: parseInt(filters.value.userId)
      })
    }

    // Récupérer les informations de l'utilisateur
    const loadUserData = () => {
      if (!isAuthenticated.value) return
      socket.emit('getUserInfo', { userId: parseInt(filters.value.userId) })
    }

    // Récupérer la liste des cryptos
    const loadCryptos = () => {
      if (!isAuthenticated.value) return
      socket.emit('getCryptosList')
    }

    // Initialiser les données
    const initializeData = () => {
      loadOperations()
      loadUserData()
      loadCryptos()
    }

    // Filtrer les opérations
    const filteredOperations = computed(() => {
      return operations.value.filter(op => {
        const matchDate = (!filters.value.startDate || new Date(op.created_at) >= new Date(filters.value.startDate)) &&
                         (!filters.value.endDate || new Date(op.created_at) <= new Date(filters.value.endDate))
        const matchCrypto = !filters.value.crypto || op.crypto_symbol.toLowerCase() === filters.value.crypto.toLowerCase()

        return matchDate && matchCrypto
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    })

    // Formater les montants
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
    }

    // Formater les dates
    const formatDate = (date) => {
      return new Date(date).toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Gérer les erreurs d'image
    const handleImageError = () => {
      if (userData.value) {
        userData.value.photo = null
      }
    }

    // Retourner à la liste principale
    const goBack = () => {
      router.push('/operations-history')
    }

    // Réinitialiser les filtres
    const resetFilters = () => {
      filters.value = initializeDefaultFilters()
      loadOperations()
    }

    // Appliquer les filtres
    const applyFilters = () => {
      console.log('Application des filtres:', filters.value)
      loadOperations()
    }

    // Socket listeners
    onMounted(() => {
      // Déconnexion des listeners précédents
      socket.off('operationsHistory')
      socket.off('cryptosList')
      socket.off('userInfo')
      socket.off('authenticated')
      socket.off('error')

      // Authentification
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      // Connexion au socket
      if (!socket.connected) {
        socket.connect()
      }

      socket.on('authenticated', () => {
        console.log('Socket authentifié, chargement des données...')
        isAuthenticated.value = true
        initializeData()
      })

      socket.on('operationsHistory', (data) => {
        console.log('Données historique reçues:', data)
        operations.value = Array.isArray(data) ? data.map(op => ({
          ...op,
          type: op.type || (op.amount > 0 ? 'achat' : 'vente'),
          amount: Math.abs(op.amount)
        })) : []
      })

      socket.on('userInfo', (data) => {
        console.log('Informations utilisateur reçues:', data)
        userData.value = data
      })

      socket.on('cryptosList', (data) => {
        console.log('Liste des cryptos reçue:', data)
        cryptoList.value = Array.isArray(data) ? data : []
      })

      socket.on('error', (error) => {
        console.error('Erreur socket:', error)
        if (error.message?.includes('authentification')) {
          isAuthenticated.value = false
          router.push('/login')
        }
      })

      // Émettre l'authentification
      socket.emit('authenticate', token)
    })

    onUnmounted(() => {
      isAuthenticated.value = false
      socket.off('operationsHistory')
      socket.off('cryptosList')
      socket.off('userInfo')
      socket.off('authenticated')
      socket.off('error')
      socket.disconnect()
    })

    return {
      operations,
      cryptoList,
      userData,
      filters,
      filteredOperations,
      formatAmount,
      formatDate,
      handleImageError,
      goBack,
      resetFilters,
      applyFilters
    }
  }
}
</script> 