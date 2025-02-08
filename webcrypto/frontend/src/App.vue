<template>
  <div>
    <!-- Navigation principale - cachée pour les pages admin -->
    <nav v-if="!isAdminRoute" class="fixed w-full top-0 z-50 bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <router-link to="/" class="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors duration-200">
                CryptoTrade
              </router-link>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <!-- Liens pour utilisateur non authentifié -->
            <template v-if="!isAuthenticated">
              <router-link
                to="/login"
                class="nav-link"
              >
                Connexion
              </router-link>
              <router-link
                to="/register"
                class="nav-link"
              >
                Inscription
              </router-link>
              <router-link
                to="/admin/login"
                class="nav-link"
              >
                Admin
              </router-link>
            </template>
            <!-- Liens pour utilisateur authentifié -->
            <template v-else>
              <router-link
                to="/dashboard"
                class="nav-link"
              >
                Dashboard
              </router-link>
              <router-link
                to="/wallet"
                class="nav-link"
              >
                Portefeuille
              </router-link>
              <router-link
                to="/transactions"
                class="nav-link"
              >
                Transactions
              </router-link>
              <router-link
                to="/operations-history"
                class="nav-link"
              >
                Historique
              </router-link>
              <router-link
                to="/analysis"
                class="nav-link"
              >
                Analyses
              </router-link>
              <router-link
                to="/commission-analysis"
                class="nav-link"
              >
                Commissions
              </router-link>
              <template v-if="isAdmin">
                <router-link
                  to="/commission-settings"
                  class="nav-link"
                >
                  Paramètres Commissions
                </router-link>
              </template>

              <!-- Menu utilisateur -->
              <div class="relative ml-3">
                <button 
                  @click="showUserMenu = !showUserMenu"
                  class="user-menu-btn flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                >
                  <div class="w-8 h-8 rounded-full overflow-hidden">
                    <img v-if="user?.photo" :src="user.photo" alt="Photo de profil" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full bg-indigo-100 flex items-center justify-center">
                      <span class="text-sm font-medium text-indigo-700">
                        {{ user?.username?.[0]?.toUpperCase() || 'U' }}
                      </span>
                    </div>
                  </div>
                  <span class="text-sm font-medium text-gray-700">{{ user?.username || 'Utilisateur' }}</span>
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <!-- Menu déroulant utilisateur -->
                <div v-if="showUserMenu" class="user-dropdown absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                  <router-link
                    to="/account"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                    @click="showUserMenu = false"
                  >
                    Gérer mon compte
                  </router-link>
                  <button
                    @click="handleLogout"
                    class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>

              <!-- Bouton Notifications -->
              <div class="relative">
                <button 
                  @click="toggleNotifications"
                  class="notification-btn relative text-gray-700 hover:text-indigo-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span v-if="unreadNotifications.length" class="notification-badge absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {{ unreadNotifications.length }}
                  </span>
                </button>

                <!-- Menu déroulant des notifications -->
                <div v-if="showNotifications" class="notifications-dropdown absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-1 z-50">
                  <div class="max-h-96 overflow-y-auto">
                    <div v-if="notifications.length === 0" class="px-4 py-3 text-sm text-gray-500">
                      Aucune notification
                    </div>
                    <div v-for="notif in notifications" :key="notif.id" 
                         class="px-4 py-3 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0">
                      <div class="text-sm font-medium text-gray-900">{{ notif.title }}</div>
                      <div class="text-sm text-gray-500">{{ notif.message }}</div>
                      <div class="text-xs text-gray-400 mt-1">
                        {{ formatDate(notif.created_at) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <!-- Ajout d'un espace pour compenser la navbar fixe -->
    <div v-if="!isAdminRoute" class="h-16"></div>

    <router-view />
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'
import { socket } from '@/socket'

export default {
  name: 'App',
  setup() {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()
    const notifications = ref([])
    const showNotifications = ref(false)
    const showUserMenu = ref(false)
    
    const isAuthenticated = computed(() => store.getters['auth/isAuthenticated'])
    const isAdminRoute = computed(() => {
      return (route.path.startsWith('/admin') && route.name !== 'AdminLogin') || 
             route.path === '/commission-settings' || 
             route.path === '/transactions-summary'
    })
    const isAdmin = computed(() => store.getters['auth/isAdmin'])
    const unreadNotifications = computed(() => notifications.value.filter(n => !n.read))
    const user = computed(() => store.getters['auth/user'])
    
    const handleLogout = async () => {
      await store.dispatch('auth/logout')
      router.push('/login')
    }

    const toggleNotifications = () => {
      showNotifications.value = !showNotifications.value
      if (showNotifications.value) {
        // Rafraîchir les notifications quand on ouvre le menu
        socket.emit('getNotifications')
      }
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const initializeSocket = () => {
      socket.connect()

      const token = localStorage.getItem('token') || localStorage.getItem('sessionToken')
      if (token) {
        console.log('Émission du token d\'authentification')
        socket.emit('authenticate', token)
      }

      socket.on('authenticated', () => {
        console.log('Socket authentifié, demande des notifications')
        socket.emit('getNotifications')
      })

      socket.on('notificationsUpdate', (data) => {
        console.log('Notifications reçues:', data)
        notifications.value = Array.isArray(data) ? data : []
      })

      socket.on('error', (error) => {
        console.error('Erreur socket:', error)
        if (error.message?.includes('authentification')) {
          router.push('/login')
        }
      })
    }

    onMounted(() => {
      store.dispatch('auth/init')
      if (isAuthenticated.value) {
        initializeSocket()
      }
    })

    onUnmounted(() => {
      socket.off('notificationsUpdate')
      socket.off('authenticated')
      socket.off('error')
      socket.disconnect()
    })

    return {
      isAuthenticated,
      isAdminRoute,
      isAdmin,
      handleLogout,
      notifications,
      showNotifications,
      unreadNotifications,
      route,
      showUserMenu,
      user,
      toggleNotifications,
      formatDate
    }
  }
}
</script>

<style>
/* Styles généraux pour le header */
nav {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95) !important;
  border-bottom: 1px solid rgba(229, 231, 235, 0.5);
  transition: all 0.3s ease;
}

nav:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Logo styles */
.router-link-exact-active {
  color: #4F46E5 !important;
  font-weight: 600;
  position: relative;
}

.router-link-exact-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #4F46E5;
  border-radius: 2px;
  transform: scaleX(1);
  transition: transform 0.3s ease;
}

/* Navigation links */
nav a {
  position: relative;
  padding: 0.5rem 1rem;
  transition: all 0.3s ease;
  border-radius: 0.375rem;
}

nav a:hover {
  background: rgba(79, 70, 229, 0.05);
  color: #4F46E5 !important;
  transform: translateY(-1px);
}

/* Notification button styles */
.notification-btn {
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.notification-btn:hover {
  background: rgba(79, 70, 229, 0.1);
  transform: scale(1.05);
}

/* Notification badge */
.notification-badge {
  transform: scale(1);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
  
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

/* Notification dropdown */
.notifications-dropdown {
  transform-origin: top right;
  animation: dropdown 0.2s ease-out;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(229, 231, 235, 0.5);
}

@keyframes dropdown {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Scrollbar styles */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #CBD5E0;
  border-radius: 2px;
  transition: background 0.3s ease;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #A0AEC0;
}

/* Logout button */
button.logout-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: all 0.3s ease;
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444 !important;
}

button.logout-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  transform: translateY(-1px);
}

/* Classe pour les liens de navigation */
.nav-link {
  color: #4B5563;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: all 0.3s ease;
  position: relative;
  white-space: nowrap;
}

.nav-link:hover {
  color: #4F46E5;
  background: rgba(79, 70, 229, 0.05);
  transform: translateY(-1px);
}

.nav-link.router-link-active {
  color: #4F46E5;
  background: rgba(79, 70, 229, 0.1);
}

/* User menu styles */
.user-menu-btn {
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.user-menu-btn:hover {
  background: rgba(79, 70, 229, 0.1);
  transform: scale(1.05);
}

/* User dropdown styles */
.user-dropdown {
  transform-origin: top right;
  animation: dropdown 0.2s ease-out;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(229, 231, 235, 0.5);
}

@keyframes dropdown {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
