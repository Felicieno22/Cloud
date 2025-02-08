import axios from 'axios'
import { socket } from '@/socket'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Add token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (!token) {
    return Promise.reject('No authentication token found');
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default {
  namespaced: true,

  state: {
    balance: 0,
    cryptoHoldings: {},
    transactions: [],
    pendingDeposit: null
  },

  mutations: {
    SET_BALANCE(state, balance) {
      state.balance = balance
    },
    SET_CRYPTO_HOLDINGS(state, holdings) {
      state.cryptoHoldings = holdings
    },
    SET_TRANSACTIONS(state, transactions) {
      state.transactions = transactions
    },
    SET_PENDING_DEPOSIT(state, deposit) {
      state.pendingDeposit = deposit
    }
  },

  actions: {
    initializeSocket({ commit, rootState }) {
      if (!rootState.auth.token) {
        console.error('Cannot initialize socket: No authentication token');
        return;
      }

      socket.on('walletUpdate', (data) => {
        commit('SET_BALANCE', data.balance);
      });

      socket.on('positionsUpdate', (data) => {
        commit('SET_CRYPTO_HOLDINGS', data);
      });

      socket.on('transactionsUpdate', (data) => {
        commit('SET_TRANSACTIONS', data);
      });
    },

    async fetchWalletData({ commit, rootState }) {
      if (!rootState.auth.token) {
        throw new Error('Authentication required');
      }

      try {
        const [walletRes, holdingsRes, transactionsRes] = await Promise.all([
          api.get('/wallet'),
          api.get('/wallet/positions'),
          api.get('/wallet/transactions')
        ]);

        commit('SET_BALANCE', walletRes.data.balance);
        commit('SET_CRYPTO_HOLDINGS', holdingsRes.data);
        commit('SET_TRANSACTIONS', transactionsRes.data);
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        throw error.response?.data || error.message;
      }
    },

    async requestDeposit({ commit, rootState }, amount) {
      if (!rootState.auth.token) {
        throw new Error('Authentication required');
      }

      try {
        const response = await api.post('/wallet/deposit-request', { amount });
        commit('SET_PENDING_DEPOSIT', response.data);
        return response.data;
      } catch (error) {
        console.error('Error requesting deposit:', error);
        throw error.response?.data || error.message;
      }
    },

    async requestWithdrawal({ dispatch, rootState }, amount) {
      if (!rootState.auth.token) {
        throw new Error('Authentication required');
      }

      try {
        await api.post('/wallet/withdrawal-request', { amount });
        await dispatch('fetchWalletData');
      } catch (error) {
        console.error('Error requesting withdrawal:', error);
        throw error.response?.data || error.message;
      }
    }
  },

  getters: {
    getBalance: state => state.balance,
    getCryptoHoldings: state => state.cryptoHoldings,
    getTransactions: state => state.transactions,
    getPendingDeposit: state => state.pendingDeposit
  }
}
