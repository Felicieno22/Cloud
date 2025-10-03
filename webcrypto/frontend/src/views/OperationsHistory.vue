<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
          Historique des Opérations
        </h1>
        <p class="mt-2 text-gray-600">Consultez l'historique des transactions de tous les utilisateurs</p>
      </div>

      <!-- Filtres -->
      <div class="bg-white rounded-xl shadow-md p-6 mb-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <!-- Filtre Utilisateur -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Utilisateur</label>
            <select
              v-model="filters.userId"
              class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Tous les utilisateurs</option>
              <option v-for="user in usersList" :key="user.id" :value="user.id">
                {{ user.username }} ({{ user.operations_count }} opérations)
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
                  Utilisateur
                </th>
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
                  class="hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                  @click="selectUser(operation.user_id)">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0">
                      <img v-if="operation.user_photo" 
                           :src="operation.user_photo" 
                           :alt="operation.username"
                           class="h-10 w-10 rounded-full object-cover cursor-pointer" 
                           @click.stop="goToUserHistory(operation.user_id)"
                           @error="handleImageError($event, operation)" />
                      <div v-else 
                           class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center cursor-pointer"
                           @click.stop="goToUserHistory(operation.user_id)">
                        <span class="text-indigo-700 font-medium text-sm">
                          {{ operation.username?.[0]?.toUpperCase() || 'U' }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900"
                           :class="{'text-indigo-600': filters.userId === operation.user_id.toString()}">
                        {{ operation.username }}
                      </div>
                      <div v-if="filters.userId === operation.user_id.toString()" 
                           class="text-xs text-indigo-500">
                        Sélectionné
                      </div>
                    </div>
                  </div>
                </td>
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
import { socket } from '@/socket'
import { useRouter } from 'vue-router'

export default {
  name: 'OperationsHistory',
  
  setup() {
    const operations = ref([])
    const usersList = ref([])
    const cryptoList = ref([])
    const isAuthenticated = ref(false)
    const router = useRouter()
    
    // Initialiser les filtres avec la date du jour
    const initializeDefaultFilters = () => {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      
      return {
        startDate: startOfDay.toISOString().slice(0, 16),
        endDate: endOfDay.toISOString().slice(0, 16),
        crypto: '',
        userId: ''
      }
    }

    const filters = ref(initializeDefaultFilters())

    // Récupérer les opérations
    const loadOperations = () => {
      if (!isAuthenticated.value) return;
      console.log('Chargement des opérations avec les filtres:', filters.value)
      const activeFilters = {
        startDate: filters.value.startDate || null,
        endDate: filters.value.endDate || null,
        crypto: filters.value.crypto || null,
        userId: filters.value.userId ? parseInt(filters.value.userId) : null
      }
      socket.emit('getOperationsHistory', activeFilters)
    }

    // Récupérer la liste des utilisateurs
    const loadUsers = () => {
      if (!isAuthenticated.value) return;
      socket.emit('getUsersList')
    }

    // Récupérer la liste des cryptos
    const loadCryptos = () => {
      if (!isAuthenticated.value) return;
      socket.emit('getCryptosList')
    }

    // Initialiser les données
    const initializeData = () => {
      loadOperations()
      loadUsers()
      loadCryptos()
    }

    // Filtrer les opérations
    const filteredOperations = computed(() => {
      return operations.value.filter(op => {
        const matchDate = (!filters.value.startDate || new Date(op.created_at) >= new Date(filters.value.startDate)) &&
                         (!filters.value.endDate || new Date(op.created_at) <= new Date(filters.value.endDate))
        const matchCrypto = !filters.value.crypto || op.crypto_symbol.toLowerCase() === filters.value.crypto.toLowerCase()
        const matchUser = !filters.value.userId || op.user_id === parseInt(filters.value.userId)

        return matchDate && matchCrypto && matchUser
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
    const handleImageError = (event, operation) => {
      event.target.style.display = 'none'
      operation.user_photo = null
    }

    // Sélectionner un utilisateur
    const selectUser = (userId) => {
      if (filters.value.userId === userId.toString()) {
        // Si l'utilisateur est déjà sélectionné, on désélectionne
        filters.value.userId = ''
      } else {
        filters.value.userId = userId.toString()
      }
      // Recharger les données après la sélection/désélection
      loadOperations()
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

    // Rediriger vers l'historique d'un utilisateur spécifique
    const goToUserHistory = (userId) => {
      router.push({
        name: 'UserHistory',
        params: { userId: userId.toString() }
      })
    }

    // Socket listeners
    onMounted(() => {
      // Déconnexion des listeners précédents
      socket.off('operationsHistory')
      socket.off('usersList')
      socket.off('cryptosList')
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
          amount: Math.abs(op.amount),
          user_photo: op.user_photo || null // S'assurer que user_photo est défini
        })) : []
      })

      socket.on('usersList', (data) => {
        console.log('Liste des utilisateurs reçue:', data)
        usersList.value = Array.isArray(data) ? data.map(user => ({
          ...user,
          operations_count: parseInt(user.operations_count) || 0
        })) : []
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
      socket.off('usersList')
      socket.off('cryptosList')
      socket.off('authenticated')
      socket.off('error')
      socket.disconnect()
    })

    return {
      operations,
      usersList,
      cryptoList,
      filters,
      filteredOperations,
      formatAmount,
      formatDate,
      handleImageError,
      selectUser,
      resetFilters,
      applyFilters,
      goToUserHistory,
    }
  }
}
</script> 