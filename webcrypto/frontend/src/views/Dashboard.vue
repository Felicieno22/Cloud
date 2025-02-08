<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Tableau de bord</h1>
      <p class="text-gray-600">
        Cours des cryptomonnaies mis à jour en temps réel
        <span :class="{'text-green-500': isConnected, 'text-red-500': !isConnected}">
          ●
        </span>
      </p>
    </div>

    <!-- État de chargement -->
    <div v-if="isLoading" class="flex justify-center items-center min-h-[400px]">
      <div class="flex flex-col items-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-gray-600">Chargement des données...</p>
      </div>
    </div>

    <!-- Grille des cryptomonnaies -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="crypto in cryptoList" :key="crypto.symbol" 
           class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold">{{ crypto.symbol }}</h2>
            <p class="text-gray-600">{{ crypto.name }}</p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold">{{ formatPrice(crypto.price) }}</div>
            <div :class="getPriceChangeClass(crypto.symbol)" class="text-sm">
              {{ formatPriceChange(crypto.priceChange) }}%
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-end space-x-2">
          <button @click="$router.push(`/crypto/${crypto.symbol}`)" 
                  class="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            Voir détails
          </button>
          <button @click="$router.push(`/trade/${crypto.symbol}`)"
                  class="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors">
            Trader
          </button>
        </div>
      </div>
    </div>

    <!-- Graphique pour la crypto sélectionnée -->
    <div v-if="selectedCrypto" class="mt-8">
      <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold">{{ selectedCrypto }}</h2>
          <div class="space-x-2">
            <button @click="$router.push({ name: 'Trade', params: { crypto: selectedCrypto }})"
                    class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors">
              Trader
            </button>
            <button @click="addToWatchlist(selectedCrypto)"
                    class="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 transition-colors">
              Suivre
            </button>
          </div>
        </div>
        <div class="h-96">
          <!-- TODO: Ajouter le graphique -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { socket } from '@/socket';
import { LineChart } from 'vue-chartjs';

export default {
  name: 'Dashboard',
  components: { LineChart },
  
  setup() {
    const router = useRouter();
    const isConnected = ref(false);
    const cryptoList = ref([]);
    const selectedCrypto = ref(null);
    const isLoading = ref(true);

    // Initialisation des écouteurs socket
    const initSocketListeners = () => {
      // Nettoyage des anciens écouteurs
      socket.off('connect');
      socket.off('disconnect');
      socket.off('authenticated');
      socket.off('priceUpdate');

      // Connexion socket
      socket.on('connect', () => {
        console.log('Connecté au serveur');
        isConnected.value = true;
        
        // Authentification socket
        const token = localStorage.getItem('token') || localStorage.getItem('sessionToken');
        if (token) {
          socket.emit('authenticate', token);
        }
      });

      socket.on('disconnect', () => {
        console.log('Déconnecté du serveur');
        isConnected.value = false;
        isLoading.value = true;
        cryptoList.value = [];
      });

      socket.on('authenticated', () => {
        console.log('Socket authentifié, demande des prix...');
        socket.emit('getPriceUpdate');
      });

      // Mise à jour des prix
      socket.on('priceUpdate', (data) => {
        console.log('Données reçues:', data);
        if (Array.isArray(data)) {
          cryptoList.value = data;
          isLoading.value = false;
        }
      });
    };

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

    // Formatage de la variation de prix
    const formatPriceChange = (change) => {
      if (typeof change !== 'number') return '0.00';
      return change.toFixed(2);
    };

    // Classe CSS pour la variation de prix
    const getPriceChangeClass = (symbol) => {
      const crypto = cryptoList.value.find(c => c.symbol === symbol);
      if (!crypto) return 'text-gray-500';
      
      return {
        'text-green-500': crypto.priceChange > 0,
        'text-red-500': crypto.priceChange < 0,
        'text-gray-500': crypto.priceChange === 0
      };
    };

    // Sélection d'une crypto
    const selectCrypto = (symbol) => {
      selectedCrypto.value = symbol;
    };

    // Ajout à la watchlist
    const addToWatchlist = (symbol) => {
      // TODO: Implémenter l'ajout à la watchlist
      console.log('Ajout à la watchlist:', symbol);
    };

    // Fonction pour initialiser la connexion
    const initConnection = () => {
      // Déconnexion si déjà connecté
      if (socket.connected) {
        socket.disconnect();
      }

      // Initialisation des écouteurs
      initSocketListeners();

      // Connexion au socket
      socket.connect();
    };

    onMounted(() => {
      initConnection();

      // Timeout de sécurité pour le chargement
      setTimeout(() => {
        if (isLoading.value) {
          console.log('Timeout de chargement atteint, tentative de reconnexion...');
          isLoading.value = false;
          initConnection(); // Tentative de reconnexion
        }
      }, 10000);
    });

    onUnmounted(() => {
      // Nettoyage des écouteurs
      socket.off('connect');
      socket.off('disconnect');
      socket.off('priceUpdate');
      socket.off('authenticated');
      socket.disconnect();
    });

    return {
      isConnected,
      cryptoList,
      selectedCrypto,
      isLoading,
      formatPrice,
      formatPriceChange,
      getPriceChangeClass,
      selectCrypto,
      addToWatchlist
    };
  }
};
</script>
