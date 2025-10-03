<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ pendingVerification ? 'Vérification en deux étapes' : 'Connexion à votre compte' }}
        </h2>
        <p v-if="pendingVerification" class="mt-2 text-center text-sm text-gray-600">
          {{ pendingVerification.message }}
        </p>
      </div>

      <!-- Formulaire de connexion -->
      <form v-if="!pendingVerification" class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email" class="sr-only">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Mot de passe</label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
              />
              <div
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
              >
                <svg
                  v-if="showPassword"
                  class="h-5 w-5 text-gray-400 hover:text-gray-500 transition-colors"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                </svg>
                <svg
                  v-else
                  class="h-5 w-5 text-gray-400 hover:text-gray-500 transition-colors"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg v-if="!loading" class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
              <svg v-else class="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </div>
      </form>

      <!-- Formulaire de vérification 2FA -->
      <form v-else class="mt-8 space-y-6" @submit.prevent="handleVerification">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="verification-code" class="sr-only">Code de vérification</label>
            <input
              id="verification-code"
              v-model="verificationCode"
              type="text"
              required
              pattern="[0-9]*"
              inputmode="numeric"
              class="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Code de vérification"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading || !verificationCode"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg v-if="!loading" class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
              <svg v-else class="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ loading ? 'Vérification...' : 'Vérifier' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

export default {
  name: 'Login',
  
  setup() {
    const store = useStore()
    const router = useRouter()
    const loading = ref(false)
    const showPassword = ref(false)
    const form = ref({
      email: '',
      password: ''
    })
    const verificationCode = ref('')

    const pendingVerification = computed(() => store.getters['auth/pendingVerification'])

    const handleSubmit = async () => {
      try {
        loading.value = true
        await store.dispatch('auth/login', {
          email: form.value.email,
          password: form.value.password
        })
        // Ne pas rediriger, attendre la vérification 2FA
      } catch (error) {
        alert(error.message || 'Erreur de connexion')
      } finally {
        loading.value = false
      }
    }

    const handleVerification = async () => {
      try {
        loading.value = true
        await store.dispatch('auth/verify2FA', {
          email: pendingVerification.value.email,
          code: verificationCode.value
        })
        router.push('/dashboard')
      } catch (error) {
        alert(error.message || 'Erreur lors de la vérification')
      } finally {
        loading.value = false
      }
    }

    return {
      loading,
      showPassword,
      form,
      verificationCode,
      pendingVerification,
      handleSubmit,
      handleVerification
    }
  }
}
</script>

<style scoped>
.min-h-screen {
  background: linear-gradient(135deg, #f6f9fc 0%, #edf2f7 100%);
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.min-h-screen::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 0% 0%, rgba(79, 70, 229, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 100% 100%, rgba(79, 70, 229, 0.03) 0%, transparent 50%),
    url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%234f46e5' fill-opacity='0.02' fill-rule='evenodd'/%3E%3C/svg%3E");
  z-index: 0;
  animation: gradientMove 15s ease infinite;
}

@keyframes gradientMove {
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}

.max-w-md {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 28rem;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  padding: 2.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.max-w-md:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 
    0 25px 30px -5px rgba(0, 0, 0, 0.15),
    0 15px 15px -5px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.15);
}

h2 {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin-bottom: 2rem;
}

input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 1rem !important;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

input:hover {
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.05),
    0 0 0 1px rgba(79, 70, 229, 0.1);
}

input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 
    0 0 0 3px rgba(79, 70, 229, 0.15),
    0 1px 2px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

button {
  position: relative;
  overflow: hidden;
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%) !important;
  border: none;
  border-radius: 1rem;
  color: white;
  font-weight: 600;
  letter-spacing: 0.025em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 6px -1px rgba(79, 70, 229, 0.2),
    0 2px 4px -1px rgba(79, 70, 229, 0.1);
}

button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 8px -1px rgba(79, 70, 229, 0.3),
    0 4px 6px -1px rgba(79, 70, 229, 0.2);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  transition: width 0.6s ease, height 0.6s ease;
}

button:active::after {
  width: 500px;
  height: 500px;
  opacity: 0;
}

.animate-spin {
  animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Animations pour les transitions */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Style pour les messages d'erreur */
.text-red-600 {
  animation: shake 0.5s cubic-bezier(0.36, 0, 0.66, -0.56);
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px) rotate(-1deg); }
  75% { transform: translateX(4px) rotate(1deg); }
}

/* Responsive design */
@media (max-width: 640px) {
  .max-w-md {
    padding: 1.5rem;
    margin: 1rem;
  }
  
  input, button {
    font-size: 1rem;
    padding: 0.625rem 1rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .min-h-screen {
    background: linear-gradient(135deg, #1a1b23 0%, #242631 100%);
  }
  
  .max-w-md {
    background: rgba(30, 31, 42, 0.95);
  }
  
  input {
    background: rgba(30, 31, 42, 0.9) !important;
    color: #e5e7eb;
  }
  
  h2 {
    background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
    -webkit-background-clip: text;
  }
}
</style>
