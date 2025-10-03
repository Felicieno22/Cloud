<template>
  <div class="min-h-screen bg-gray-100">
    <AdminHeader />

    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Statistiques -->
      <div class="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">
                    Demandes en attente
                  </dt>
                  <dd class="flex items-baseline">
                    <div class="text-2xl font-semibold text-gray-900">
                      {{ stats.pendingRequests }}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">
                    Utilisateurs actifs
                  </dt>
                  <dd class="flex items-baseline">
                    <div class="text-2xl font-semibold text-gray-900">
                      {{ stats.activeUsers }}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">
                    Volume total (24h)
                  </dt>
                  <dd class="flex items-baseline">
                    <div class="text-2xl font-semibold text-gray-900">
                      {{ formatPrice(stats.totalVolume) }}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste des demandes -->
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6">
          <h2 class="text-lg font-medium text-gray-900">Demandes en attente</h2>
        </div>
        <div class="border-t border-gray-200">
          <ul role="list" class="divide-y divide-gray-200">
            <li v-for="request in pendingRequests" :key="request.id" class="px-4 py-4 sm:px-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span class="text-indigo-600 font-medium">{{ request.user?.username?.[0]?.toUpperCase() || '?' }}</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ request.user?.username || 'Utilisateur inconnu' }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ request.type === 'deposit' ? 'Dépôt' : 'Retrait' }} de {{ formatPrice(request.amount) }}
                      <span class="ml-2 text-xs text-gray-400">(Solde actuel: {{ formatPrice(request.wallet_balance) }})</span>
                    </div>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button
                    @click="handleRequest(request.id, 'approve')"
                    class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                  >
                    Approuver
                  </button>
                  <button
                    @click="handleRequest(request.id, 'reject')"
                    class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import store from '../store';
import AdminHeader from '@/components/AdminHeader.vue';

export default {
  name: 'AdminDashboard',
  components: {
    AdminHeader
  },
  
  setup() {
    const router = useRouter();
    const stats = ref({
      pendingRequests: 0,
      activeUsers: 0,
      totalVolume: 0
    });
    const pendingRequests = ref([]);

    const formatPrice = (price) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD'
      }).format(price);
    };

    const loadStats = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) throw new Error('Erreur lors du chargement des statistiques');
        stats.value = await response.json();
      } catch (error) {
        console.error('Erreur:', error);
        if (error.response?.status === 401) {
          router.push('/login');
        }
      }
    };

    const loadPendingRequests = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/admin/pending-requests', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) throw new Error('Erreur lors du chargement des demandes');
        pendingRequests.value = await response.json();
      } catch (error) {
        console.error('Erreur:', error);
        if (error.response?.status === 401) {
          router.push('/login');
        }
      }
    };

    const handleRequest = async (requestId, action) => {
      try {
        const response = await fetch(`http://localhost:3000/api/admin/requests/${requestId}/${action}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) throw new Error('Erreur lors du traitement de la demande');
        
        // Recharger les données
        await Promise.all([loadStats(), loadPendingRequests()]);

        // Afficher une notification de succès
        alert(`Demande ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès`);
      } catch (error) {
        alert(error.message);
        if (error.response?.status === 401) {
          router.push('/login');
        }
      }
    };

    // Rafraîchissement automatique toutes les 30 secondes
    const startAutoRefresh = () => {
      const refreshInterval = setInterval(() => {
        loadStats();
        loadPendingRequests();
      }, 30000);

      // Nettoyer l'intervalle lors du démontage du composant
      onUnmounted(() => {
        clearInterval(refreshInterval);
      });
    };

    const logout = async () => {
      try {
        await store.dispatch('auth/logout');
        router.push('/admin/login');
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    };

    onMounted(() => {
      if (!localStorage.getItem('token')) {
        router.push('/admin/login');
        return;
      }
      loadStats();
      loadPendingRequests();
      startAutoRefresh();
    });

    return {
      stats,
      pendingRequests,
      formatPrice,
      handleRequest,
      logout
    };
  }
};
</script>
