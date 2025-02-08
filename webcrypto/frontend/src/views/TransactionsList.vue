<template>
  <div v-if="isReady" class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-extrabold text-gray-900 mb-8">Historique des Transactions</h1>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md">
        <!-- Filtres -->
        <div class="p-6 border-b border-gray-100 bg-white">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Type de transaction</label>
              <select 
                v-model="filters.type" 
                class="w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
              >
                <option value="">Tous les types</option>
                <option value="BUY">Achats</option>
                <option value="SELL">Ventes</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Cryptomonnaie</label>
              <select 
                v-model="filters.symbol" 
                class="w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
              >
                <option value="">Toutes les cryptos</option>
                <option v-for="crypto in cryptoList" :key="crypto.symbol" :value="crypto.symbol">
                  {{ crypto.name }} ({{ crypto.symbol }})
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Tableau des transactions -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr class="bg-gray-50">
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Utilisateur</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Crypto</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantité</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prix</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-for="tx in paginatedTransactions" 
                  :key="tx.id" 
                  class="hover:bg-gray-50 transition-colors duration-150">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {{ new Date(tx.created_at).toLocaleString('fr-FR') }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span class="text-sm font-medium text-indigo-700">
                        {{ tx.username?.[0]?.toUpperCase() }}
                      </span>
                    </div>
                    <span class="ml-3 text-sm text-gray-900">{{ tx.username }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="{
                    'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium': true,
                    'bg-green-100 text-green-800 ring-1 ring-green-200': tx.transaction_type === 'BUY',
                    'bg-red-100 text-red-800 ring-1 ring-red-200': tx.transaction_type === 'SELL'
                  }">
                    <span :class="{
                      'w-1.5 h-1.5 rounded-full mr-1.5': true,
                      'bg-green-400': tx.transaction_type === 'BUY',
                      'bg-red-400': tx.transaction_type === 'SELL'
                    }"></span>
                    {{ tx.transaction_type === 'BUY' ? 'Achat' : 'Vente' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ tx.symbol }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatQuantity(tx.quantity) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatPrice(tx.price) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ formatPrice(tx.total || (tx.quantity * tx.price)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 bg-white border-t border-gray-100">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-700">
              Affichage de <span class="font-medium">{{ Math.min(filteredTransactions?.length || 0, paginationStart + 1) }}</span>
              à <span class="font-medium">{{ Math.min(filteredTransactions?.length || 0, paginationEnd) }}</span>
              sur <span class="font-medium">{{ filteredTransactions?.length || 0 }}</span> transactions
            </p>
            <div class="flex items-center space-x-2">
              <button 
                @click="currentPage--" 
                :disabled="currentPage <= 1"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Précédent
              </button>
              <div class="hidden md:flex items-center space-x-1">
                <button 
                  v-for="page in displayedPages" 
                  :key="page"
                  @click="currentPage = page"
                  :class="{
                    'relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200': true,
                    'z-10 bg-indigo-600 text-white': currentPage === page,
                    'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50': currentPage !== page
                  }"
                >
                  {{ page }}
                </button>
              </div>
              <button 
                @click="currentPage++" 
                :disabled="currentPage >= (totalPages || 1)"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, defineComponent } from 'vue';
import { socket } from '@/socket';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'TransactionsList',
  
  setup() {
    const router = useRouter();
    const isReady = ref(false);
    const transactions = ref([]);
    const cryptoList = ref([]);
    const currentPage = ref(1);
    const itemsPerPage = 10;

    // Filtres
    const filters = ref({
      type: '',
      symbol: ''
    });

    // Formatage des nombres
    const formatPrice = (price) => {
      if (!price) return '$0.00';
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    };

    const formatQuantity = (quantity) => {
      if (!quantity) return '0.000000';
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
      }).format(quantity);
    };

    // Filtrage des transactions
    const filteredTransactions = computed(() => {
      if (!transactions.value || !Array.isArray(transactions.value)) return [];
      return transactions.value.filter(tx => {
        if (!tx) return false;
        if (filters.value.type && tx.transaction_type !== filters.value.type.toUpperCase()) return false;
        if (filters.value.symbol && tx.symbol !== filters.value.symbol) return false;
        return true;
      });
    });

    // Pagination
    const totalPages = computed(() => {
      const length = filteredTransactions.value?.length || 0;
      return Math.max(1, Math.ceil(length / itemsPerPage));
    });
    
    const paginatedTransactions = computed(() => {
      if (!Array.isArray(filteredTransactions.value)) return [];
      const start = (currentPage.value - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      return filteredTransactions.value.slice(start, end);
    });

    const paginationStart = computed(() => {
      if (!filteredTransactions.value?.length) return 0;
      return Math.max(0, (currentPage.value - 1) * itemsPerPage);
    });

    const paginationEnd = computed(() => {
      if (!filteredTransactions.value?.length) return 0;
      return Math.min(
        (currentPage.value * itemsPerPage),
        filteredTransactions.value.length
      );
    });

    // Affichage des numéros de page
    const displayedPages = computed(() => {
      const total = totalPages.value || 1;
      const current = Math.min(currentPage.value, total);
      const pages = [];
      const maxDisplayed = 5;
      let start = Math.max(1, current - Math.floor(maxDisplayed / 2));
      let end = Math.min(total, start + maxDisplayed - 1);
      
      if (end - start + 1 < maxDisplayed) {
        start = Math.max(1, end - maxDisplayed + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    });

    onMounted(async () => {
      try {
        socket.connect();

        // Authentification
        const token = localStorage.getItem('token') || localStorage.getItem('sessionToken') || localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }

        socket.emit('authenticate', token);

        socket.on('authenticated', () => {
          // Demander la liste des transactions et des cryptos
          socket.emit('getAllTransactions');
          socket.emit('getCryptoList');
          isReady.value = true;
        });

        socket.on('allTransactionsUpdate', (data) => {
          transactions.value = Array.isArray(data) ? data.map(tx => ({
            ...tx,
            quantity: parseFloat(tx.quantity) || 0,
            price: parseFloat(tx.price_per_unit || tx.price) || 0,
            total: parseFloat(tx.total_amount) || parseFloat(tx.quantity) * parseFloat(tx.price_per_unit || tx.price) || 0,
            created_at: new Date(tx.created_at)
          })) : [];
        });

        socket.on('cryptoListUpdate', (data) => {
          cryptoList.value = Array.isArray(data) ? data : [];
        });

        socket.on('error', (error) => {
          console.error('Erreur socket:', error);
          if (error.message.includes('authentification')) {
            router.push('/login');
          }
        });
      } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        router.push('/login');
      }
    });

    onUnmounted(() => {
      socket.off('allTransactionsUpdate');
      socket.off('cryptoListUpdate');
      socket.off('authenticated');
      socket.off('error');
      socket.disconnect();
    });

    return {
      isReady,
      transactions,
      cryptoList,
      filters,
      currentPage,
      totalPages,
      paginatedTransactions,
      paginationStart,
      paginationEnd,
      displayedPages,
      formatPrice,
      formatQuantity
    };
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Smooth hover effects */
.hover\:shadow-md {
  transition: box-shadow 0.3s ease;
}

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