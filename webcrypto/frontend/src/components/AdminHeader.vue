<template>
  <div>
    <!-- Header principal avec "Administration" -->
    <nav class="bg-white shadow-md border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <div class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
              Administration
            </div>
          </div>
          <div class="flex items-center">
            <button
              @click="logout"
              class="text-red-600 hover:text-red-800 hover:bg-red-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Header de navigation -->
    <nav class="bg-custom-violet shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style="background-color: #6321cc;">
        <div class="flex h-14">
          <div class="flex items-center space-x-1">
            <router-link
              to="/admin/dashboard"
              class="text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-white/10 relative group"
              :class="{ 'bg-white/20': $route.path === '/admin/dashboard' }"
            >
              Tableau de bord
              <div class="absolute bottom-0 left-0 w-full h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
            </router-link>
            <router-link
              to="/commission-settings"
              class="text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-white/10 relative group"
              :class="{ 'bg-white/20': $route.path === '/commission-settings' }"
            >
              Paramètres des Commissions
              <div class="absolute bottom-0 left-0 w-full h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
            </router-link>
            <router-link
              to="/transactions-summary"
              class="text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-white/10 relative group"
              :class="{ 'bg-white/20': $route.path === '/transactions-summary' }"
            >
              Récapitulatif Transactions
              <div class="absolute bottom-0 left-0 w-full h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
            </router-link>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>

<script>
import { useRouter } from 'vue-router';
import store from '../store';

export default {
  name: 'AdminHeader',
  
  setup() {
    const router = useRouter();

    const logout = async () => {
      try {
        await store.dispatch('auth/logout');
        router.push('/admin/login');
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    };

    return {
      logout
    };
  }
};
</script>

<style scoped>
.router-link-active {
  position: relative;
}

.router-link-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: white;
  animation: linkActivate 0.3s ease forwards;
}

@keyframes linkActivate {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

/* Animation pour le hover des liens */
.group:hover .absolute {
  transform: scaleX(1);
}

/* Effet de brillance sur le header */
.bg-gradient-to-r {
  background-size: 200% auto;
  animation: gradient 15s ease infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

</style> 