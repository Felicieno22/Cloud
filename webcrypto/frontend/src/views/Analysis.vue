<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 mb-8">
        Analyse des Transactions
      </h1>

      <div class="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
        <!-- Formulaire d'analyse -->
        <div class="p-6 space-y-6">
          <!-- Type d'analyse -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Type d'analyse</label>
            <select 
              v-model="analysisType"
              class="w-full rounded-lg border border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
            >
              <option value="quartile1">1er Quartile</option>
              <option value="max">Maximum</option>
              <option value="min">Minimum</option>
              <option value="mean">Moyenne</option>
              <option value="stddev">Écart-type</option>
            </select>
          </div>

          <!-- Sélection des cryptos -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Cryptomonnaies</label>
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  v-model="selectAllCryptos"
                  @change="toggleAllCryptos"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors duration-200"
                />
                <label class="text-sm text-gray-700">Toutes les cryptos</label>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                <div v-for="crypto in cryptoList" :key="crypto.symbol" class="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                  <input
                    type="checkbox"
                    v-model="selectedCryptos"
                    :value="crypto.symbol"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors duration-200"
                  />
                  <label class="ml-2 text-sm text-gray-700">{{ crypto.name }}</label>
                </div>
              </div>
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
              @click="performAnalysis"
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
                      Valeur
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Période analysée
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <template v-if="results && Object.keys(results).length > 0">
                    <tr v-for="(value, crypto) in results" :key="crypto" class="hover:bg-gray-50 transition-colors duration-150">
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
                          {{ formatValue(value) }}
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">
                          {{ formatDateRange(dateMin, dateMax) }}
                        </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { socket } from '@/socket';
import { useRouter } from 'vue-router';

export default {
  name: 'Analysis',
  
  setup() {
    const router = useRouter();
    const analysisType = ref('mean');
    const cryptoList = ref([]);
    const selectedCryptos = ref([]);
    const selectAllCryptos = ref(false);
    const dateMin = ref('');
    const dateMax = ref('');
    const results = ref(null);

    // Toggle toutes les cryptos
    const toggleAllCryptos = () => {
      if (selectAllCryptos.value) {
        selectedCryptos.value = cryptoList.value.map(c => c.symbol);
      } else {
        selectedCryptos.value = [];
      }
    };

    // Formater les valeurs selon le type d'analyse
    const formatValue = (value) => {
      if (typeof value !== 'number') return 'N/A';
      
      if (analysisType.value === 'stddev' || analysisType.value === 'mean' || analysisType.value === 'quartile1') {
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(value);
      }
      
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    };

    // Formater la plage de dates
    const formatDateRange = (start, end) => {
      if (!start || !end) return 'Période non spécifiée';
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `Du ${startDate.toLocaleString('fr-FR')} au ${endDate.toLocaleString('fr-FR')}`;
    };

    // Effectuer l'analyse
    const performAnalysis = () => {
      if (selectedCryptos.value.length === 0) {
        alert('Veuillez sélectionner au moins une cryptomonnaie');
        return;
      }

      if (!dateMin.value || !dateMax.value) {
        alert('Veuillez spécifier une période d\'analyse');
        return;
      }

      socket.emit('performAnalysis', {
        type: analysisType.value,
        cryptos: selectedCryptos.value,
        dateMin: dateMin.value,
        dateMax: dateMax.value
      });
    };

    const getCryptoName = (symbol) => {
      const crypto = cryptoList.value.find(c => c.symbol === symbol);
      return crypto ? crypto.name : symbol;
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

        socket.on('analysisResults', (data) => {
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
      socket.off('analysisResults');
      socket.off('authenticated');
      socket.off('error');
      socket.disconnect();
    });

    return {
      analysisType,
      cryptoList,
      selectedCryptos,
      selectAllCryptos,
      dateMin,
      dateMax,
      results,
      toggleAllCryptos,
      performAnalysis,
      formatValue,
      formatDateRange,
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

/* Checkbox styles */
input[type="checkbox"] {
  position: relative;
  cursor: pointer;
}

input[type="checkbox"]:checked {
  background-color: #4f46e5;
  border-color: #4f46e5;
}

input[type="checkbox"]:checked::before {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 0.75rem;
}

/* Crypto selection grid hover effect */
.grid > div:hover {
  background-color: rgba(99, 102, 241, 0.05);
  transform: translateX(4px);
}
</style> 