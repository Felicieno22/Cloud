<template>
  <div class="min-h-screen bg-gray-100">
    <AdminHeader />

    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-extrabold text-gray-900 mb-8">Gestion des Commissions</h1>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md">
        <div class="p-6 space-y-6">
          <!-- Commission d'achat -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Commission d'achat (%)</label>
            <div class="flex items-center space-x-2">
              <input
                type="number"
                v-model="buyCommission"
                step="0.01"
                min="0"
                max="100"
                class="w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
              />
              <span class="text-gray-500">%</span>
            </div>
          </div>

          <!-- Commission de vente -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Commission de vente (%)</label>
            <div class="flex items-center space-x-2">
              <input
                type="number"
                v-model="sellCommission"
                step="0.01"
                min="0"
                max="100"
                class="w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
              />
              <span class="text-gray-500">%</span>
            </div>
          </div>

          <!-- Bouton de sauvegarde -->
          <div class="flex justify-end">
            <button
              @click="saveCommissions"
              :disabled="isLoading"
              class="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50"
            >
              <span v-if="isLoading">Sauvegarde en cours...</span>
              <span v-else>Sauvegarder</span>
            </button>
          </div>

          <!-- Message d'erreur -->
          <div v-if="error" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p class="text-sm text-red-600">{{ error }}</p>
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
import AdminHeader from '@/components/AdminHeader.vue';

export default {
  name: 'CommissionSettings',
  components: {
    AdminHeader
  },
  
  setup() {
    const router = useRouter();
    const buyCommission = ref(0);
    const sellCommission = ref(0);
    const isLoading = ref(false);
    const error = ref('');

    const saveCommissions = () => {
      isLoading.value = true;
      error.value = '';
      
      socket.emit('updateCommissions', {
        buyCommission: parseFloat(buyCommission.value),
        sellCommission: parseFloat(sellCommission.value)
      });
    };

    onMounted(async () => {
      try {
        socket.connect();

        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        socket.emit('authenticate', token);

        socket.on('authenticated', () => {
          socket.emit('getCommissions');
        });

        socket.on('commissionsUpdate', (data) => {
          buyCommission.value = data.buyCommission;
          sellCommission.value = data.sellCommission;
        });

        socket.on('success', (data) => {
          isLoading.value = false;
          alert(data.message);
        });

        socket.on('error', (error) => {
          console.error('Erreur socket:', error);
          isLoading.value = false;
          error.value = error.message;
          if (error.message.includes('authentification')) {
            router.push('/login');
          } else {
            alert(error.message);
          }
        });

      } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        router.push('/login');
      }
    });

    onUnmounted(() => {
      socket.off('commissionsUpdate');
      socket.off('success');
      socket.off('error');
      socket.off('authenticated');
      socket.disconnect();
    });

    return {
      buyCommission,
      sellCommission,
      isLoading,
      error,
      saveCommissions
    };
  }
};
</script>

<style scoped>
/* Styles similaires à ceux de la page d'analyse */
.min-h-screen {
  background: linear-gradient(135deg, #f6f9fc 0%, #edf2f7 100%);
}

.bg-white {
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.bg-white:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
}

input[type="number"] {
  transition: all 0.3s ease;
}

input[type="number"]:hover {
  border-color: #cbd5e0;
}

input[type="number"]:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

button {
  position: relative;
  overflow: hidden;
}

button:after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.6s ease, height 0.6s ease;
}

button:active:after {
  width: 200px;
  height: 200px;
  opacity: 0;
}
</style> 