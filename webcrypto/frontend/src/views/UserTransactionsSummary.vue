<template>
  <div class="min-h-screen bg-gray-50">
    <AdminHeader />
    
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-3xl font-extrabold text-gray-900 mb-8">Récapitulatif des Transactions par Utilisateur</h1>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md">
        <!-- Filtres -->
        <div class="p-6 border-b border-gray-100 bg-white">
          <div class="grid grid-cols-1 gap-6">
            <div class="flex items-end space-x-4">
              <div class="flex-grow">
                <label class="block text-sm font-medium text-gray-700 mb-2">Date et heure max</label>
                <input
                  type="datetime-local"
                  v-model="filters.dateMax"
                  class="w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
                />
              </div>
              <button
                @click="fetchUserSummaries"
                class="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 flex items-center"
              >
                <span>Valider</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Tableau récapitulatif -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr class="bg-gray-50">
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Utilisateur</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Achat</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Vente</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Valeur portefeuille</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-for="summary in userSummaries" 
                  :key="summary.username" 
                  class="hover:bg-gray-50 transition-colors duration-150">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span class="text-sm font-medium text-indigo-700">
                        {{ summary.username[0]?.toUpperCase() }}
                      </span>
                    </div>
                    <span class="ml-3 text-sm text-gray-900">{{ summary.username }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatPrice(summary.totalBuy) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatPrice(summary.totalSell) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ formatPrice(summary.portfolioValue) }}
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { socket } from '@/socket'
import AdminHeader from '@/components/AdminHeader.vue'

export default {
  name: 'UserTransactionsSummary',
  components: {
    AdminHeader
  },
  
  setup() {
    const userSummaries = ref([])
    const filters = ref({
      dateMax: new Date().toISOString().slice(0, 16)
    })

    const formatPrice = (price) => {
      if (!price) return '$0.00'
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price)
    }

    const fetchUserSummaries = () => {
      console.log('Demande des données de transactions avec date max:', filters.value.dateMax)
      socket.emit('getUserTransactionsSummary', {
        dateMax: filters.value.dateMax
      })
    }

    // Initialiser la connexion socket
    if (!socket.connected) {
      socket.connect()
    }

    // Écouter les événements socket
    socket.on('userTransactionsSummary', (data) => {
      console.log('Données reçues:', data)
      userSummaries.value = data.map(summary => ({
        username: summary.username,
        totalBuy: parseFloat(summary.totalBuy) || 0,
        totalSell: parseFloat(summary.totalSell) || 0,
        portfolioValue: parseFloat(summary.portfolioValue) || 0
      }))
    })

    // Initialiser au montage du composant
    onMounted(() => {
      console.log('Composant monté, récupération des données...')
      fetchUserSummaries()
    })

    // Nettoyer à la destruction du composant
    onUnmounted(() => {
      socket.off('userTransactionsSummary')
      socket.disconnect()
    })

    return {
      userSummaries,
      filters,
      formatPrice,
      fetchUserSummaries
    }
  }
}
</script>

<style scoped>
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #cdcdcd;
}
</style> 