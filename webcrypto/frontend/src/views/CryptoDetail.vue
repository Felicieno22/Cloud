<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8 flex items-center justify-between">
      <div class="flex items-center">
        <button @click="$router.push('/dashboard')" class="mr-4 text-indigo-600 hover:text-indigo-800">
          ← Retour
        </button>
        <h1 class="text-3xl font-bold text-gray-900">{{ cryptoSymbol }}</h1>
      </div>
      <button @click="$router.push(`/trade/${cryptoSymbol}`)"
              class="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors">
        Trader
      </button>
    </div>

    <!-- État de chargement -->
    <div v-if="isLoading" class="bg-white rounded-lg shadow-lg p-6 flex items-center justify-center min-h-[400px]">
      <div class="flex flex-col items-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-gray-600">Chargement des données...</p>
      </div>
    </div>

    <div v-else class="bg-white rounded-lg shadow-lg p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold">{{ cryptoData?.name }}</h2>
          <p class="text-gray-600">Prix actuel: {{ formatPrice(cryptoData?.price) }}</p>
        </div>
        <div :class="getPriceChangeClass()" class="text-lg font-semibold">
          {{ formatPriceChange(cryptoData?.priceChange) }}%
        </div>
      </div>

      <div class="h-96">
        <Line v-if="chartData" :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { socket } from '@/socket';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { fr } from 'date-fns/locale';
import { Line } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend
);

export default {
  name: 'CryptoDetail',
  components: { Line },

  setup() {
    const route = useRoute();
    const router = useRouter();
    const cryptoSymbol = route.params.symbol;
    const cryptoData = ref(null);
    const priceHistory = ref([]);
    const isLoading = ref(true);

    // Charger l'historique des prix
    const loadPriceHistory = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/cryptocurrencies/${cryptoSymbol}/history`);
        if (!response.ok) throw new Error('Erreur lors du chargement de l\'historique');
        
        const data = await response.json();
        priceHistory.value = data.map(item => ({
          price: parseFloat(item.price),
          timestamp: new Date(item.created_at)
        })).reverse(); // Inverser pour avoir l'ordre chronologique
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    // Configuration du graphique
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          adapters: {
            date: {
              locale: fr
            }
          },
          time: {
            unit: 'minute',
            displayFormats: {
              minute: 'HH:mm',
              hour: 'HH:mm',
              day: 'dd/MM'
            }
          },
          title: {
            display: true,
            text: 'Heure'
          }
        },
        y: {
          beginAtZero: false,
          ticks: {
            callback: value => formatPrice(value)
          },
          title: {
            display: true,
            text: 'Prix'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => formatPrice(context.raw),
            title: (tooltipItems) => {
              const date = new Date(tooltipItems[0].parsed.x);
              return date.toLocaleString('fr-FR', {
                dateStyle: 'short',
                timeStyle: 'short'
              });
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    };

    const chartData = computed(() => ({
      labels: priceHistory.value.map(item => item.timestamp),
      datasets: [{
        label: cryptoSymbol,
        data: priceHistory.value.map(item => item.price),
        borderColor: '#4F46E5',
        tension: 0.1,
        pointRadius: 2
      }]
    }));

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

    onMounted(async () => {
      socket.connect();

      // Authentification socket
      const token = localStorage.getItem('token') || localStorage.getItem('sessionToken');
      if (token) {
        socket.emit('authenticate', token);
      }

      socket.on('authenticated', () => {
        socket.emit('getPriceUpdate');
        loadPriceHistory();
      });

      // Écouter les mises à jour des prix
      socket.on('priceUpdate', (data) => {
        const crypto = data.find(c => c.symbol === cryptoSymbol);
        if (crypto) {
          cryptoData.value = crypto;
          isLoading.value = false;
        }
      });

      socket.on('error', (error) => {
        console.error('Erreur socket:', error);
        if (error.message?.includes('authentification')) {
          router.push('/login');
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
      socket.off('priceUpdate');
      socket.off('authenticated');
      socket.off('error');
      socket.disconnect();
    });

    return {
      cryptoSymbol,
      cryptoData,
      chartData,
      chartOptions,
      formatPrice,
      formatPriceChange,
      getPriceChangeClass,
      isLoading
    };
  }
};
</script>
