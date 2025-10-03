<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <!-- Titre -->
        <h2 class="text-center text-3xl font-extrabold text-gray-900 mb-8">
          Administration
        </h2>

        <!-- Formulaire de connexion -->
        <form v-if="!pendingVerification" @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <div class="mt-1">
              <div class="relative">
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {{ loading ? 'Connexion...' : 'Se connecter' }}
            </button>
          </div>
        </form>

        <!-- Formulaire de vérification 2FA -->
        <form v-else @submit.prevent="handleVerification" class="space-y-6">
          <div>
            <label for="code" class="block text-sm font-medium text-gray-700">
              Code de vérification
            </label>
            <div class="mt-1">
              <input
                id="code"
                v-model="verificationCode"
                type="text"
                required
                maxlength="6"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <p class="mt-2 text-sm text-gray-500">
              {{ pendingVerification?.message }}
            </p>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {{ loading ? 'Vérification...' : 'Vérifier' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

export default {
  name: 'AdminLogin',
  
  setup() {
    const router = useRouter();
    const store = useStore();
    const loading = ref(false);
    const form = ref({
      email: 'cedricandriamifidisoa23@gmail.com',
      password: 'Admin123!'
    });
    const verificationCode = ref('');
    const showPassword = ref(false);

    const pendingVerification = computed(() => store.getters['auth/pendingVerification']);

    const handleLogin = async () => {
      try {
        loading.value = true;
        await store.dispatch('auth/loginAdmin', {
          email: form.value.email,
          password: form.value.password
        });
        router.push('/admin/dashboard');
      } catch (error) {
        alert(error.message || 'Erreur de connexion');
      } finally {
        loading.value = false;
      }
    };

    const handleVerification = async () => {
      try {
        loading.value = true;
        await store.dispatch('auth/verify2FA', {
          email: pendingVerification.value.email,
          code: verificationCode.value,
          isAdmin: true
        });
        router.push('/admin/dashboard');
      } catch (error) {
        alert(error.message || 'Erreur lors de la vérification');
      } finally {
        loading.value = false;
      }
    };

    return {
      loading,
      form,
      showPassword,
      verificationCode,
      pendingVerification,
      handleLogin,
      handleVerification
    };
  }
};
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
    radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.03) 0%, transparent 50%);
  z-index: 0;
}

.min-h-screen::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.686 0L10.2 6.485 11.616 7.9l7.9-7.9h-2.83zM22.343 0L13.857 8.485 15.272 9.9l7.9-7.9h-.83zm5.657 0L19.514 8.485 20.93 9.9l8.485-8.485h-1.415zM32.372 0L26.8 5.657 28.214 7.07 36.1 0h-3.728zM32 0l3.657 3.657L37.07 2.242l-4.07-4.07L32 0zm18.686 0l2.828 2.828-1.414 1.414L47.03 0h3.657zM9.314 0L6.485 2.828l1.414 1.414L12.97 0H9.314zM25.543 0l-4.07 4.07 1.415 1.415L27.03 0h-1.487zm-9.457 0l9.457 9.457-1.414 1.414L13.857 0h2.23zM14.457 0L0 14.457l1.414 1.414L16.343 0h-1.886zm5.657 0L1.414 18.7 2.83 20.113l18.7-18.7h-1.415zM38.457 0L40.343 1.886 0 42.23l1.414 1.414L41.957 0h-3.5zm9.457 0L0 47.914l1.414 1.414L50.343 0h-2.43zm-3.657 0l8.485 8.485-1.414 1.414L42.43 0h1.886zm10.371 0l6.485 6.485-1.414 1.415L53.8 0h.9zM32 0l13.172 13.172-1.414 1.414L30.586 0H32zm-3.757 0l19.8 19.8-1.415 1.414L26.83 0h1.414zM32 0l-4.07 4.07 1.414 1.415L34.485 0H32zm-18.343 0l24.342 24.342-1.414 1.414L10.829 0h2.828zM0 0l4.485 4.485L2.828 5.9 0 3.07V0zM54.627 0L40.485 14.142 42.143 15.8 58.785 0h-4.158zM22.457 0L0 22.457l1.414 1.414L24.343 0h-1.886zm5.657 0L9.957 18.157l1.414 1.414L29.657 0h-1.543zM32 0L13.172 18.828l1.414 1.414L34.485 0H32zm-7.515 0l20.657 20.657-1.414 1.414L22.457 0h2.028zm12.728 0L18.157 19.057l1.414 1.414L39.314 0h-2.1zM0 0l.828.828-1.414 1.414L0 2.243V0zm54.627 0L52.8 1.828l1.414 1.414L55.457 0h-.83zm-7.657 0L42.143 4.828l1.414 1.414L48.97 0h-2zm-18.686 0L20.857 7.428l1.414 1.414L28.214 0h-1.886zM40.485 0L26.8 13.685l1.414 1.414L43.314 0h-2.829zm-12.728 0l14.8 14.8-1.414 1.414L25.543 0h2.214zm-8.485 0L0 19.272l1.414 1.414L20.8 0h-1.828zm37.37 0L36.1 20.543l1.414 1.414L58.785 0h-2.143zM30.586 0L0 30.586l1.414 1.414L32 0h-1.414zm24.042 0L0 54.627l1.414 1.414L56.043 0h-1.415zM39.314 0L0 39.314l1.414 1.414L41.957 0h-2.643zm-7.657 0l-31.657 31.657 1.414 1.414L32 0h-.343zM0 0l1.828 1.828-1.414 1.414L0 3.243V0zm54.627 0L52.8 1.828l1.414 1.414L55.457 0h-.83zm-7.657 0L42.143 4.828l1.414 1.414L48.97 0h-2zm-18.686 0L20.857 7.428l1.414 1.414L28.214 0h-1.886zM40.485 0L26.8 13.685l1.414 1.414L43.314 0h-2.829z' fill='%234f46e5' fill-opacity='.02' fill-rule='evenodd'/%3E%3C/svg%3E");
  z-index: 0;
  animation: patternMove 20s linear infinite;
}

@keyframes patternMove {
  0% { background-position: 0 0; }
  100% { background-position: 100px 100px; }
}

.sm\:mx-auto {
  position: relative;
  z-index: 1;
}

.bg-white {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border-radius: 1rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.bg-white:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 20px 35px -10px rgba(0, 0, 0, 0.1),
    0 10px 20px -10px rgba(0, 0, 0, 0.1);
}

h2 {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  letter-spacing: -0.025em;
  position: relative;
  margin-bottom: 2rem;
}

h2::after {
  content: '';
  position: absolute;
  bottom: -0.75rem;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 3px;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  border-radius: 3px;
}

/* Animation pour le titre */
@keyframes titleFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

h2 {
  animation: titleFadeIn 0.6s ease-out forwards;
}

input {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 2px solid transparent;
  border-radius: 0.75rem !important;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  transition: all 0.3s ease;
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

button[type="submit"] {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%) !important;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  transition: all 0.3s ease;
  box-shadow: 
    0 4px 6px -1px rgba(79, 70, 229, 0.2),
    0 2px 4px -1px rgba(79, 70, 229, 0.1);
  position: relative;
  overflow: hidden;
}

button[type="submit"]:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 10px -1px rgba(79, 70, 229, 0.3),
    0 4px 6px -1px rgba(79, 70, 229, 0.2);
}

button[type="submit"]::after {
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

button[type="submit"]:active::after {
  width: 300px;
  height: 300px;
  opacity: 0;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .min-h-screen {
    background: linear-gradient(135deg, #1a1b23 0%, #242631 100%);
  }
  
  .bg-white {
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

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sm\:mx-auto {
  animation: fadeIn 0.5s ease-out;
}

/* Responsive design */
@media (max-width: 640px) {
  .min-h-screen {
    padding: 1rem;
  }
  
  .bg-white {
    border-radius: 0.75rem;
    padding: 1.5rem;
  }
  
  input, button {
    font-size: 1rem;
    padding: 0.625rem 1rem;
  }
}
</style>
