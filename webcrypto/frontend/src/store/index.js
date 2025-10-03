import { createStore } from 'vuex'
import auth from './modules/auth'
import crypto from './modules/crypto'
import wallet from './modules/wallet'
import admin from './modules/admin'

export default createStore({
  modules: {
    auth,
    crypto,
    wallet,
    admin
  }
})
