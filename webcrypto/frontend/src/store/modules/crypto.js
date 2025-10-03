import io from 'socket.io-client'

const BACKEND_URL = 'http://localhost:3000'

const DEFAULT_CRYPTOS = {
  'BTC': { name: 'Bitcoin', price: 0 },
  'ETH': { name: 'Ethereum', price: 0 },
  'BNB': { name: 'Binance Coin', price: 0 },
  'XRP': { name: 'Ripple', price: 0 },
  'SOL': { name: 'Solana', price: 0 },
  'ADA': { name: 'Cardano', price: 0 },
  'DOGE': { name: 'Dogecoin', price: 0 },
  'DOT': { name: 'Polkadot', price: 0 },
  'MATIC': { name: 'Polygon', price: 0 },
  'LINK': { name: 'Chainlink', price: 0 }
}

export default {
  namespaced: true,

  state: {
    prices: { ...DEFAULT_CRYPTOS },
    socket: null,
    connected: false,
    history: Object.keys(DEFAULT_CRYPTOS).reduce((acc, crypto) => {
      acc[crypto] = []
      return acc
    }, {}),
    selectedCrypto: null
  },

  mutations: {
    SET_PRICES(state, prices) {
      state.prices = { ...state.prices, ...prices }
      // Garder un historique des prix pour chaque crypto
      Object.keys(prices).forEach(crypto => {
        if (!state.history[crypto]) {
          state.history[crypto] = []
        }
        state.history[crypto].push({
          time: new Date(),
          price: prices[crypto].price
        })
        // Garder seulement les 30 derniers points
        if (state.history[crypto].length > 30) {
          state.history[crypto].shift()
        }
      })
    },
    SET_SOCKET(state, socket) {
      state.socket = socket
    },
    SET_CONNECTED(state, status) {
      state.connected = status
    },
    SET_SELECTED_CRYPTO(state, crypto) {
      state.selectedCrypto = crypto
    }
  },

  actions: {
    initializeSocket({ commit, state }) {
      if (state.socket) {
        state.socket.close()
      }

      const socket = io(BACKEND_URL)

      socket.on('connect', () => {
        commit('SET_CONNECTED', true)
      })

      socket.on('disconnect', () => {
        commit('SET_CONNECTED', false)
      })

      socket.on('priceUpdate', (prices) => {
        // Transformer les prix en objets avec nom et prix
        const formattedPrices = Object.keys(prices).reduce((acc, crypto) => {
          acc[crypto] = {
            name: DEFAULT_CRYPTOS[crypto].name,
            price: prices[crypto]
          }
          return acc
        }, {})
        commit('SET_PRICES', formattedPrices)
      })

      commit('SET_SOCKET', socket)
    },

    disconnect({ state, commit }) {
      if (state.socket) {
        state.socket.close()
        commit('SET_SOCKET', null)
        commit('SET_CONNECTED', false)
      }
    },

    selectCrypto({ commit }, crypto) {
      commit('SET_SELECTED_CRYPTO', crypto)
    }
  },

  getters: {
    getPrices: state => state.prices,
    getHistory: state => state.history,
    isConnected: state => state.connected,
    getPriceHistory: state => crypto => state.history[crypto] || [],
    getSelectedCrypto: state => state.selectedCrypto,
    getCryptoList: state => Object.keys(state.prices).map(symbol => ({
      symbol,
      name: state.prices[symbol].name,
      price: state.prices[symbol].price
    }))
  }
}
