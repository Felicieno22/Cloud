<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-3xl mx-auto">
      <div class="mb-8">
        <button @click="$router.back()" class="text-indigo-600 hover:text-indigo-800">
          ← Retour
        </button>
        <h1 class="text-3xl font-bold text-gray-900 mt-4">
          Trader {{ cryptoData?.name || cryptoSymbol }}
        </h1>
      </div>

      <!-- État de chargement -->
      <div v-if="isLoading" class="bg-white rounded-lg shadow-lg p-6 flex items-center justify-center min-h-[300px]">
        <div class="flex flex-col items-center space-y-4">
          <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p class="text-gray-600">Chargement des données...</p>
        </div>
      </div>

      <div v-else class="bg-white rounded-lg shadow-lg p-6">
        <!-- Prix actuel -->
        <div class="mb-8">
          <h2 class="text-lg text-gray-600">Prix actuel</h2>
          <div class="text-4xl font-bold text-gray-900">
            {{ formatPrice(cryptoData?.price) }}
          </div>
          <div :class="getPriceChangeClass()" class="mt-2 text-sm font-medium">
            {{ formatPriceChange(cryptoData?.priceChange) }}% sur 24h
          </div>
        </div>

        <!-- Formulaire de trading -->
        <form @submit.prevent="handleTrade">
          <div class="space-y-6">
            <!-- Type d'opération -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Type d'opération</label>
              <div class="mt-2 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  :class="[
                    'px-4 py-2 rounded-md text-sm font-medium w-full',
                    operationType === 'buy'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  ]"
                  @click="operationType = 'buy'"
                >
                  Acheter
                </button>
                <button
                  type="button"
                  :class="[
                    'px-4 py-2 rounded-md text-sm font-medium w-full',
                    operationType === 'sell'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  ]"
                  @click="operationType = 'sell'"
                >
                  Vendre
                </button>
              </div>
            </div>

            <!-- Montant -->
            <div>
              <label for="amount" class="block text-sm font-medium text-gray-700">
                Montant ({{ cryptoSymbol }})
              </label>
              <div class="mt-2">
                <input
                  type="number"
                  id="amount"
                  v-model="amount"
                  step="0.000001"
                  min="0"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <p class="mt-2 text-sm text-gray-500">
                ≈ {{ formatPrice(amount * (cryptoData?.price || 0)) }}
              </p>
            </div>

            <!-- Bouton de soumission -->
            <div>
              <button
                type="submit"
                :class="[
                  'w-full rounded-md px-4 py-2 text-sm font-medium text-white',
                  operationType === 'buy'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                ]"
              >
                {{ operationType === 'buy' ? 'Acheter' : 'Vendre' }}
                {{ cryptoSymbol }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { socket } from '@/socket';

export default {
  name: 'Trade',

  setup() {
    const route = useRoute();
    const router = useRouter();
    const cryptoSymbol = route.params.symbol?.toUpperCase();
    const cryptoData = ref(null);
    const operationType = ref('buy');
    const amount = ref(0);
    const isLoading = ref(true);

    // Formatage des prix
    const formatPrice = (price) => {
      if (typeof price !== 'number') return '$0.00';
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    };

    const formatPriceChange = (change) => {
      if (typeof change !== 'number') return '0.00';
      return change.toFixed(2);
    };

    const getPriceChangeClass = () => {
      if (!cryptoData.value) return 'text-gray-500';
      return {
        'text-green-500': cryptoData.value.priceChange > 0,
        'text-red-500': cryptoData.value.priceChange < 0,
        'text-gray-500': cryptoData.value.priceChange === 0
      };
    };

    // Gestion du trading
    const handleTrade = async () => {
      try {
        if (!amount.value || amount.value <= 0) {
          alert('Veuillez entrer un montant valide');
          return;
        }

        const totalPrice = amount.value * cryptoData.value.price;

        socket.emit('tradeCrypto', {
          type: operationType.value,
          symbol: cryptoSymbol,
          amount: parseFloat(amount.value),
          price: cryptoData.value.price
        });

        amount.value = 0;
      } catch (error) {
        console.error('Erreur lors de la transaction:', error);
        alert(error.message || 'Erreur lors de la transaction');
      }
    };

    onMounted(() => {
      if (!cryptoSymbol) {
        router.push('/dashboard');
        return;
      }

      socket.connect();

      // Authentification socket
      const token = localStorage.getItem('token') || localStorage.getItem('sessionToken');
      if (token) {
        socket.emit('authenticate', token);
      }

      socket.on('authenticated', () => {
        socket.emit('getPriceUpdate');
      });

      // Écouter les mises à jour des prix
      socket.on('priceUpdate', (data) => {
        const crypto = data.find(c => c.symbol === cryptoSymbol);
        if (crypto) {
          cryptoData.value = crypto;
          isLoading.value = false;
        }
      });

      // Écouter les réponses de trading
      socket.on('tradeResponse', (response) => {
        if (response.success) {
          alert(response.message);
        } else {
          alert(response.message || 'Erreur lors de la transaction');
        }
      });

      // Timeout de sécurité pour le chargement
      setTimeout(() => {
        if (isLoading.value) {
          isLoading.value = false;
        }
      }, 10000); // 10 secondes maximum de chargement
    });

    onUnmounted(() => {
      socket.off('tradeResponse');
      socket.off('priceUpdate');
      socket.off('authenticated');
      socket.disconnect();
    });

    return {
      cryptoSymbol,
      cryptoData,
      operationType,
      amount,
      isLoading,
      formatPrice,
      formatPriceChange,
      getPriceChangeClass,
      handleTrade
    };
  }
};
</script>
