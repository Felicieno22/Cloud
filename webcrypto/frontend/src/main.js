import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './assets/tailwind.css'

const app = createApp(App)

// Initialiser l'état d'authentification avant de monter l'application
store.dispatch('auth/init').finally(() => {
  app
    .use(store)
    .use(router)
    .mount('#app')
})
