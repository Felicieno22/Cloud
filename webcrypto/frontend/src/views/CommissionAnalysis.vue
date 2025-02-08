<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 mb-8">
        Analyse des Commissions
      </h1>

      <div class="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div class="p-6 space-y-6">
          <!-- Type d'analyse -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Type d'analyse</label>
            <select 
              v-model="analysisType"
              class="w-full rounded-lg border border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
            >
              <option value="sum">Somme</option>
              <option value="average">Moyenne</option>
            </select>
          </div>

          <!-- Sélection des cryptos -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Cryptomonnaie</label>
            <div class="space-y-2">
              <select 
                v-model="selectedCrypto"
                class="w-full rounded-lg border border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
              >
                <option value="">Toutes les cryptos</option>
                <option v-for="crypto in cryptoList" :key="crypto.symbol" :value="crypto.symbol">
                  {{ crypto.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Période -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Date et heure min</label>
              <input
                type="datetime-local"
                v-model="dateMin"
                class="w-full rounded-lg border border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Date et heure max</label>
              <input
                type="datetime-local"
                v-model="dateMax"
                class="w-full rounded-lg border border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
              />
            </div>
          </div>

          <!-- Bouton Valider -->
          <div class="flex justify-end">
            <button
              @click="analyzeCommissions"
              class="inline-flex items-center px-6 py-3 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Valider
            </button>
          </div>
        </div>

        <!-- Résultats -->
        <div class="border-t border-gray-100">
          <div class="p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Résultats de l'analyse</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cryptomonnaie
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission Totale
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre de Transactions
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <template v-if="results && Object.keys(results).length > 0">
                    <tr v-for="(result, crypto) in results" :key="crypto" class="hover:bg-gray-50 transition-colors duration-150">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center space-x-3">
                          <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full flex items-center justify-center transform transition-transform duration-200 hover:rotate-12">
                            <span class="text-sm font-bold text-white">{{ crypto[0] }}</span>
                          </div>
                          <div>
                            <div class="text-sm font-medium text-gray-900">{{ crypto }}</div>
                            <div class="text-xs text-gray-500">{{ getCryptoName(crypto) }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                          {{ formatPrice(result.commission) }}
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">{{ result.transactions }}</div>
                      </td>
                    </tr>
                  </template>
                  <tr v-else class="hover:bg-gray-50">
                    <td colspan="3" class="px-6 py-8 text-center text-gray-500">
                      <div class="flex flex-col items-center justify-center space-y-2">
                        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p class="text-sm">Aucune donnée disponible</p>
                        <p class="text-xs text-gray-400">Sélectionnez une période et lancez l'analyse</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { socket } from '@/socket';
import { useRouter } from 'vue-router';

export default {
  name: 'CommissionAnalysis',
  
  setup() {
    const router = useRouter();
    const analysisType = ref('sum');
    const selectedCrypto = ref('');
    const dateMin = ref('');
    const dateMax = ref('');
    const results = ref(null);
    const cryptoList = ref([]);

    const formatPrice = (price) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    };

    const getCryptoName = (symbol) => {
      const crypto = cryptoList.value.find(c => c.symbol === symbol);
      return crypto ? crypto.name : symbol;
    };

    const analyzeCommissions = () => {
      if (!dateMin.value || !dateMax.value) {
        alert('Veuillez spécifier une période d\'analyse');
        return;
      }

      socket.emit('analyzeCommissions', {
        type: analysisType.value,
        crypto: selectedCrypto.value,
        dateMin: dateMin.value,
        dateMax: dateMax.value
      });
    };

    onMounted(async () => {
      try {
        socket.connect();

        const token = localStorage.getItem('token') || localStorage.getItem('sessionToken') || localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }

        socket.emit('authenticate', token);

        socket.on('authenticated', () => {
          socket.emit('getCryptoList');
        });

        socket.on('cryptoListUpdate', (data) => {
          cryptoList.value = Array.isArray(data) ? data : [];
        });

        socket.on('commissionAnalysisResults', (data) => {
          results.value = data;
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
      socket.off('cryptoListUpdate');
      socket.off('commissionAnalysisResults');
      socket.off('authenticated');
      socket.off('error');
      socket.disconnect();
    });

    return {
      analysisType,
      selectedCrypto,
      dateMin,
      dateMax,
      results,
      cryptoList,
      analyzeCommissions,
      formatPrice,
      getCryptoName
    };
  }
};
</script>

<style scoped>
/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bg-white {
  animation: fadeIn 0.5s ease-out;
}

/* Hover effects */
.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Input focus styles */
input:focus, select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Button hover animation */
button {
  transition: all 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Loading animation */
.loading {
  position: relative;
}

.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  border: 2px solid #6366f1;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style> 