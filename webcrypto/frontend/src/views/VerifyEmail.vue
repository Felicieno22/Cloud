<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Vérification de votre compte
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Veuillez entrer le code de vérification reçu par email
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleVerification">
        <div class="rounded-md shadow-sm space-y-4">
          <div class="flex justify-center">
            <div v-for="(digit, index) in 6" :key="index" class="mx-1">
              <input
                :ref="el => codeInputs[index] = el"
                v-model="code[index]"
                type="text"
                maxlength="1"
                class="w-12 h-12 text-center text-2xl border-2 rounded-lg focus:border-indigo-500 focus:ring-indigo-500"
                @input="handleInput(index)"
                @keydown="handleKeydown($event, index)"
                @paste="handlePaste"
              />
            </div>
          </div>
        </div>

        <div v-if="error" class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{{ error }}</p>
            </div>
          </div>
        </div>

        <div class="text-center text-sm">
          <p class="text-gray-600 mb-4">
            Vous n'avez pas reçu le code ?
          </p>
          <button
            type="button"
            :disabled="resendTimer > 0"
            @click="resendCode"
            class="text-indigo-600 hover:text-indigo-500 font-medium focus:outline-none focus:underline"
          >
            {{ resendTimer > 0 ? `Réessayer dans ${resendTimer}s` : 'Renvoyer le code' }}
          </button>
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading || !isCodeComplete"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'

export default {
  name: 'VerifyEmail',
  
  setup() {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()
    const loading = ref(false)
    const error = ref(null)
    const code = ref(Array(6).fill(''))
    const codeInputs = ref([])
    const resendTimer = ref(0)
    let resendInterval = null

    const email = computed(() => route.query.email)
    const isCodeComplete = computed(() => code.value.every(digit => digit !== ''))

    const startResendTimer = () => {
      resendTimer.value = 60
      resendInterval = setInterval(() => {
        if (resendTimer.value > 0) {
          resendTimer.value--
        } else {
          clearInterval(resendInterval)
        }
      }, 1000)
    }

    const handleInput = (index) => {
      const value = code.value[index]
      if (value && index < 5) {
        codeInputs.value[index + 1]?.focus()
      }
    }

    const handleKeydown = (event, index) => {
      if (event.key === 'Backspace' && !code.value[index] && index > 0) {
        code.value[index - 1] = ''
        codeInputs.value[index - 1]?.focus()
      }
    }

    const handlePaste = (event) => {
      event.preventDefault()
      const pastedText = event.clipboardData.getData('text')
      const digits = pastedText.replace(/\D/g, '').slice(0, 6).split('')
      code.value = [...digits, ...Array(6 - digits.length).fill('')]
      if (digits.length > 0) {
        codeInputs.value[Math.min(digits.length, 5)]?.focus()
      }
    }

    const handleVerification = async () => {
      if (!isCodeComplete.value) return

      try {
        loading.value = true
        error.value = null
        
        await store.dispatch('auth/verifyEmail', {
          email: email.value,
          code: code.value.join('')
        })

        router.push('/login')
      } catch (err) {
        error.value = err.message || 'Erreur lors de la vérification'
      } finally {
        loading.value = false
      }
    }

    const resendCode = async () => {
      try {
        loading.value = true
        error.value = null
        
        await store.dispatch('auth/resendVerificationCode', { email: email.value })
        
        startResendTimer()
      } catch (err) {
        error.value = err.message || 'Erreur lors du renvoi du code'
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      if (!email.value) {
        router.push('/register')
      }
      startResendTimer()
    })

    onUnmounted(() => {
      if (resendInterval) {
        clearInterval(resendInterval)
      }
    })

    return {
      loading,
      error,
      code,
      codeInputs,
      resendTimer,
      isCodeComplete,
      handleInput,
      handleKeydown,
      handlePaste,
      handleVerification,
      resendCode
    }
  }
}
</script>
