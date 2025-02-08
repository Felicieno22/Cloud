import { createRouter, createWebHistory } from 'vue-router'
import store from '../store'

// Composants
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import VerifyEmail from '../views/VerifyEmail.vue'
import Dashboard from '../views/Dashboard.vue'
import CryptoDetail from '../views/CryptoDetail.vue'
import OperationsHistory from '@/views/OperationsHistory.vue'
import UserHistory from '@/views/UserHistory.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true }
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: VerifyEmail,
    meta: { requiresGuest: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/wallet',
    name: 'Wallet',
    component: () => import('../views/Wallet.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/trade/:symbol',
    name: 'Trade',
    component: () => import('../views/Trade.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/crypto/:symbol',
    name: 'CryptoDetail',
    component: CryptoDetail,
    meta: { requiresAuth: true }
  },
  {
    path: '/transactions',
    name: 'TransactionsList',
    component: () => import('../views/TransactionsList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: () => import('../views/Analysis.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/commission-settings',
    name: 'CommissionSettings',
    component: () => import('../views/CommissionSettings.vue'),
    meta: { requiresAdmin: true }
  },
  {
    path: '/commission-analysis',
    name: 'CommissionAnalysis',
    component: () => import('../views/CommissionAnalysis.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/AdminLogin.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('../views/AdminDashboard.vue'),
    meta: { requiresAdmin: true }
  },
  {
    path: '/transactions-summary',
    name: 'UserTransactionsSummary',
    component: () => import('../views/UserTransactionsSummary.vue'),
    meta: { requiresAdmin: true }
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('../views/Account.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/operations-history',
    name: 'OperationsHistory',
    component: OperationsHistory,
    meta: { requiresAuth: true }
  },
  {
    path: '/user-history/:userId',
    name: 'UserHistory',
    component: UserHistory,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guards
router.beforeEach((to, from, next) => {
  const isAuthenticated = store.getters['auth/isAuthenticated']
  const isAdmin = store.getters['auth/isAdmin']

  if (to.meta.requiresAdmin) {
    if (!isAuthenticated || !isAdmin) {
      next('/admin/login')
    } else {
      next()
    }
  } else if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated) {
    if (isAdmin) {
      next('/admin/dashboard')
    } else {
      next('/dashboard')
    }
  } else {
    next()
  }
})

export default router
