<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
          Mon Compte
        </h1>
        <p class="mt-2 text-gray-600">Gérez vos informations personnelles</p>
      </div>

      <div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div class="p-8 space-y-8">
          <!-- Avatar et informations principales -->
          <div class="flex items-center space-x-6 pb-6 border-b border-gray-100">
            <div class="relative group">
              <!-- Avatar avec photo ou initiale -->
              <div v-if="form.photo" class="w-20 h-20 rounded-full overflow-hidden">
                <img :src="form.photo" alt="Photo de profil" class="w-full h-full object-cover" 
                     @error="handleImageError" />
              </div>
              <div v-else class="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                {{ form.username?.[0]?.toUpperCase() || 'U' }}
              </div>
              
              <!-- Bouton de modification -->
              <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full">
                <input
                  type="file"
                  ref="photoInput"
                  accept="image/*"
                  class="hidden"
                  @change="handlePhotoChange"
                />
                <button
                  @click="$refs.photoInput.click()"
                  class="text-white text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-full transition-colors"
                >
                  {{ form.photo ? 'Modifier' : 'Ajouter' }}
                </button>
              </div>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">{{ form.username }}</h2>
              <p class="text-gray-500">{{ form.email }}</p>
              <p class="text-sm text-gray-400 mt-1">Membre depuis {{ formatDate(user?.created_at) }}</p>
            </div>
          </div>

          <!-- Champs du formulaire -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div v-for="(field, key) in formFields" :key="key" 
                 class="space-y-2 transition-all duration-300 transform hover:scale-[1.02]">
              <div class="flex justify-between items-center">
                <label :for="key" class="block text-sm font-semibold text-gray-700">
                  {{ field.label }}
                </label>
                <button
                  v-if="!editingField[key]"
                  @click="startEditing(key)"
                  class="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center space-x-1 hover:bg-indigo-50 px-2 py-1 rounded-md transition-all duration-200"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Modifier</span>
                </button>
              </div>
              
              <div class="relative">
                <input
                  :id="key"
                  v-model="form[key]"
                  :type="key.includes('password') ? 'password' : 'text'"
                  :disabled="!editingField[key] || !field.editable"
                  :class="[
                    'block w-full rounded-lg border shadow-sm transition-all duration-200 px-4 py-3',
                    editingField[key] 
                      ? 'bg-white border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200' 
                      : 'bg-gray-50 border-gray-200'
                  ]"
                />
                
                <div v-if="field.editable" class="absolute inset-y-0 right-0 flex items-center pr-2">
                  <button
                    v-if="!editingField[key]"
                    type="button"
                    @click="startEditing(key)"
                    class="text-indigo-600 hover:text-indigo-800 focus:outline-none"
                  >
                  
                  </button>
                  <div v-else class="flex space-x-2">
                    <button
                      type="button"
                      @click="promptPasswordAndSave(key)"
                      class="text-green-600 hover:text-green-800 focus:outline-none"
                    >
                      Sauvegarder
                    </button>
                    <button
                      type="button"
                      @click="cancelEditing(key)"
                      class="text-red-600 hover:text-red-800 focus:outline-none"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section Sécurité -->
          <div class="col-span-full mt-8 pt-8 border-t border-gray-100">
            <h3 class="text-lg font-bold text-gray-900 mb-4">Sécurité</h3>
            
            <!-- Changement de mot de passe -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
              <div class="flex justify-between items-center">
                <div>
                  <h4 class="text-sm font-semibold text-gray-700">Mot de passe</h4>
                  <p class="text-sm text-gray-500">Changez votre mot de passe pour sécuriser votre compte</p>
                </div>
                <button
                  @click="showChangePasswordModal = true"
                  class="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                >
                  Changer
                </button>
              </div>
            </div>

            <!-- Suppression du compte -->
            <div class="bg-red-50 rounded-lg p-4">
              <div class="flex justify-between items-center">
                <div>
                  <h4 class="text-sm font-semibold text-red-700">Zone dangereuse</h4>
                  <p class="text-sm text-red-600">Supprimer définitivement votre compte</p>
                </div>
                <button
                  @click="showDeleteAccountModal = true"
                  class="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-all duration-200"
                >
                  Supprimer le compte
                </button>
              </div>
            </div>
          </div>

          <!-- Message d'erreur -->
          <div v-if="error" 
               class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm">{{ error }}</span>
          </div>

          <!-- Message de succès -->
          <div v-if="successMessage" 
               class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
            <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm">{{ successMessage }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de mot de passe -->
    <div v-if="showPasswordModal" 
         class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100 animate-slideIn">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Confirmation requise</h3>
        <p class="text-sm text-gray-600 mb-4">
          Veuillez entrer votre mot de passe pour confirmer la modification
        </p>
        <div class="relative">
          <input 
            :type="showPassword ? 'text' : 'password'"
            v-model="password"
            class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 mb-4"
            placeholder="Votre mot de passe"
            @keyup.enter="confirmPasswordAndSave"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
        </div>
        <div class="flex justify-end space-x-3">
          <button
            @click="cancelPasswordModal"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            @click="confirmPasswordAndSave"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-200"
            :disabled="loading"
          >
            {{ loading ? 'Modification...' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de changement de mot de passe -->
    <div v-if="showChangePasswordModal" 
         class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100 animate-slideIn">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Changer le mot de passe</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
            <div class="relative">
              <input 
                :type="showCurrentPassword ? 'text' : 'password'"
                v-model="currentPassword"
                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="button"
                @click="showCurrentPassword = !showCurrentPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <svg v-if="showCurrentPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <div class="relative">
              <input 
                :type="showNewPassword ? 'text' : 'password'"
                v-model="newPassword"
                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="button"
                @click="showNewPassword = !showNewPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <svg v-if="showNewPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
            <div class="relative">
              <input 
                :type="showConfirmPassword ? 'text' : 'password'"
                v-model="confirmPassword"
                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <svg v-if="showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="flex justify-end space-x-3 mt-6">
          <button
            @click="showChangePasswordModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            @click="changePassword"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-200"
            :disabled="loading"
          >
            {{ loading ? 'Modification...' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de suppression de compte -->
    <div v-if="showDeleteAccountModal" 
         class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100 animate-slideIn">
        <h3 class="text-lg font-bold text-red-600 mb-4">Supprimer le compte</h3>
        <p class="text-sm text-gray-600 mb-4">
          Cette action est irréversible. Toutes vos données seront définitivement supprimées.
        </p>
        <div class="relative">
          <input 
            :type="showDeletePassword ? 'text' : 'password'"
            v-model="deleteAccountPassword"
            class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 mb-4"
          />
          <button
            type="button"
            @click="showDeletePassword = !showDeletePassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            <svg v-if="showDeletePassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
        </div>
        <div class="flex justify-end space-x-3">
          <button
            @click="showDeleteAccountModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            @click="deleteAccount"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
            :disabled="loading"
          >
            {{ loading ? 'Suppression...' : 'Supprimer définitivement' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { socket } from '@/socket'
import axios from 'axios'

const IDENTITER_URL = 'http://localhost:8080/api'

export default {
  name: 'Account',
  
  setup() {
    const store = useStore()
    const router = useRouter()
    const loading = ref(false)
    const error = ref('')
    const successMessage = ref('')
    const showPasswordModal = ref(false)
    const showChangePasswordModal = ref(false)
    const showDeleteAccountModal = ref(false)
    const showCurrentPassword = ref(false)
    const showNewPassword = ref(false)
    const showConfirmPassword = ref(false)
    const showPassword = ref(false)
    const showDeletePassword = ref(false)
    const password = ref('')
    const currentPassword = ref('')
    const newPassword = ref('')
    const confirmPassword = ref('')
    const deleteAccountPassword = ref('')
    const currentEditingField = ref(null)
    const isAuthenticated = ref(false)
    
    const user = computed(() => store.getters['auth/user'])
    
    const form = ref({
      username: '',
      nom: '',
      prenom: '',
      date_naissance: '',
      ville: '',
      email: '',
      photo: ''
    })

    const editingField = ref({
      username: false,
      nom: false,
      prenom: false,
      date_naissance: false,
      ville: false,
      email: false
    })

    const formFields = {
      username: {
        label: 'Nom d\'utilisateur',
        validation: (value) => value.length >= 3 && value.length <= 50,
        editable: true
      },
      email: {
        label: 'Email',
        validation: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        editable: false
      },
      nom: {
        label: 'Nom',
        validation: (value) => value.length >= 2 && value.length <= 50,
        editable: true
      },
      prenom: {
        label: 'Prénom',
        validation: (value) => value.length >= 2 && value.length <= 50,
        editable: true
      },
      date_naissance: {
        label: 'Date de naissance',
        validation: (value) => {
          const date = new Date(value);
          const now = new Date();
          const age = Math.floor((now - date) / (365.25 * 24 * 60 * 60 * 1000));
          return age >= 18 && age <= 100;
        },
        editable: true
      },
      ville: {
        label: 'Ville',
        validation: (value) => value.length >= 2 && value.length <= 50,
        editable: true
      }
    }

    const initForm = () => {
      if (!user.value) return;
      
      Object.keys(form.value).forEach(key => {
        // Handle date_naissance specially
        if (key === 'date_naissance') {
          if (user.value[key]) {
            try {
              const date = new Date(user.value[key])
              if (!isNaN(date.getTime())) {
                form.value[key] = date.toISOString().split('T')[0]
              } else {
                form.value[key] = '' // Empty string for invalid date
              }
            } catch (e) {
              form.value[key] = '' // Empty string if date parsing fails
            }
          } else {
            form.value[key] = '' // Empty string if no date
          }
        } else {
          form.value[key] = user.value[key] || ''
        }
      })
      console.log('Formulaire initialisé avec:', form.value)
    }

    // Ajouter un watcher pour mettre à jour le formulaire quand l'utilisateur change
    watch(() => user.value, (newUser) => {
      if (newUser) {
        initForm()
      }
    }, { immediate: true })

    const startEditing = (field) => {
      editingField.value[field] = true
    }

    const cancelEditing = (field) => {
      editingField.value[field] = false
      form.value[field] = user.value?.[field] || ''
    }

    const promptPasswordAndSave = (field) => {
      currentEditingField.value = field
      showPasswordModal.value = true
      password.value = ''
      setTimeout(() => {
        document.querySelector('input[type="password"]')?.focus()
      }, 100)
    }

    const cancelPasswordModal = () => {
      showPasswordModal.value = false
      password.value = ''
      currentEditingField.value = null
    }

    const confirmPasswordAndSave = async () => {
      if (!password.value) {
        error.value = 'Veuillez entrer votre mot de passe'
        return
      }

      try {
        const field = currentEditingField.value
        let value = field === 'photo' ? form.value.tempPhoto : form.value[field]

        loading.value = true
        error.value = ''
        successMessage.value = ''

        if (!isAuthenticated.value) {
          throw new Error('Non authentifié')
        }

        // Émettre l'événement de mise à jour approprié
        if (field === 'photo') {
          socket.emit('updateUserField', {
            field: 'photo',
            value: value,
            password: password.value,
            isBase64: true
          })
        } else {
        socket.emit('updateUserField', {
          field,
          value,
          password: password.value
        })
        }

        showPasswordModal.value = false
        password.value = ''
        currentEditingField.value = null
        
        // Nettoyer la photo temporaire si c'était une mise à jour de photo
        if (field === 'photo') {
          delete form.value.tempPhoto
        }
      } catch (err) {
        error.value = err.message || 'Une erreur est survenue'
      } finally {
        loading.value = false
      }
    }

    const formatDate = (date) => {
      if (!date) return ''
      return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    const changePassword = async () => {
      if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
        error.value = 'Veuillez remplir tous les champs'
        return
      }

      if (newPassword.value !== confirmPassword.value) {
        error.value = 'Les nouveaux mots de passe ne correspondent pas'
        return
      }

      if (newPassword.value.length < 8) {
        error.value = 'Le nouveau mot de passe doit contenir au moins 8 caractères'
        return
      }

      try {
        loading.value = true
        error.value = ''

        socket.emit('changePassword', {
          currentPassword: currentPassword.value,
          newPassword: newPassword.value
        })

        showChangePasswordModal.value = false
        currentPassword.value = ''
        newPassword.value = ''
        confirmPassword.value = ''
        successMessage.value = 'Mot de passe modifié avec succès'
      } catch (err) {
        error.value = err.message || 'Une erreur est survenue'
      } finally {
        loading.value = false
      }
    }

    const deleteAccount = async () => {
      if (!deleteAccountPassword.value || deleteAccountPassword.value.trim() === '') {
        error.value = 'Veuillez entrer votre mot de passe'
        return
      }

      try {
        loading.value = true
        error.value = ''
        successMessage.value = ''

        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        if (!token) {
          throw new Error('Vous devez être connecté pour effectuer cette action')
        }

        // Vérifier la connexion socket
        if (!socket.connected) {
          socket.connect()
        }

        // Émettre l'événement d'authentification si nécessaire
        if (!isAuthenticated.value) {
          socket.emit('authenticate', token)
        }

        // Émettre l'événement de suppression de compte
        socket.emit('deleteAccount', {
          password: deleteAccountPassword.value.trim()
        })

        // Gérer la réponse
        socket.once('accountDeleted', () => {
          successMessage.value = 'Compte supprimé avec succès'
          store.dispatch('auth/logout')
          setTimeout(() => {
            router.push('/login')
          }, 1500)
          showDeleteAccountModal.value = false
        })

        socket.once('error', (error) => {
          throw new Error(error.message || 'Erreur lors de la suppression du compte')
        })

      } catch (err) {
        console.error('Erreur lors de la suppression:', err)
        error.value = err.message || 'Une erreur est survenue lors de la suppression du compte'
      } finally {
        loading.value = false
        deleteAccountPassword.value = ''
      }
    }

    const initializeSocket = () => {
      // Ne pas se reconnecter si déjà authentifié
      if (isAuthenticated.value) {
        return
      }

      const token = localStorage.getItem('token') || localStorage.getItem('sessionToken')
      if (!token) {
        router.push('/login')
        return
      }

      // Écouter l'événement de connexion
      socket.on('connect', () => {
        if (!isAuthenticated.value) {
          console.log('Socket connecté, authentification...')
          socket.emit('authenticate', token)
        }
      })

      // Écouter l'événement d'authentification réussie
      socket.on('authenticated', () => {
        if (!isAuthenticated.value) {
          console.log('Socket authentifié, récupération des informations...')
          isAuthenticated.value = true
          socket.emit('getUserInfo')
        }
      })

      // Écouter les mises à jour des informations utilisateur
      socket.on('userInfo', (data) => {
        console.log('Informations utilisateur reçues:', data)
        if (data && typeof data === 'object') {
          Object.keys(form.value).forEach(key => {
            if (data[key] !== undefined) {
              form.value[key] = data[key]
            }
          })
          // Mettre à jour le store avec les nouvelles informations
          store.dispatch('auth/updateUser', data)
        }
      })

      // Écouter les succès de mise à jour
      socket.on('userUpdateSuccess', (data) => {
        console.log('Mise à jour réussie:', data)
        if (data && typeof data === 'object') {
          Object.keys(form.value).forEach(key => {
            if (data[key] !== undefined) {
              form.value[key] = data[key]
            }
          })
          // Mettre à jour le store avec les nouvelles informations
          store.dispatch('auth/updateUser', data)
        }
        
        Object.keys(editingField.value).forEach(key => {
          editingField.value[key] = false
        })
        
        successMessage.value = 'Informations mises à jour avec succès'
        setTimeout(() => {
          successMessage.value = ''
        }, 3000)
      })

      // Écouter la mise à jour de la photo
      socket.on('photoUpdateSuccess', (data) => {
        console.log('Mise à jour photo réussie:', data)
        if (data && data.photo) {
          form.value.photo = data.photo
          store.dispatch('auth/updateUser', { ...user.value, photo: data.photo })
          successMessage.value = 'Photo de profil mise à jour avec succès'
          setTimeout(() => {
            successMessage.value = ''
          }, 3000)
        }
      })

      // Écouter les erreurs
      socket.on('error', (error) => {
        console.error('Erreur socket:', error)
        error.value = error.message || 'Une erreur est survenue'
        if (error.message?.includes('authentification')) {
          isAuthenticated.value = false
          router.push('/login')
        }
      })

      // Écouter la déconnexion
      socket.on('disconnect', () => {
        console.log('Socket déconnecté')
        isAuthenticated.value = false
      })

      // Se connecter si pas déjà connecté
      if (!socket.connected) {
        socket.connect()
      }
    }

    onMounted(async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      // Initialiser le formulaire avec les données utilisateur
      const userData = store.getters['auth/user']
      if (!userData) {
        router.push('/login')
        return
      }

      initForm()
      initializeSocket()
    })

    onUnmounted(() => {
      isAuthenticated.value = false
      const events = [
        'connect',
        'disconnect',
        'authenticated',
        'userInfo',
        'userUpdateSuccess',
        'photoUpdateSuccess',
        'error'
      ]
      
      events.forEach(event => {
        socket.off(event)
      })

      socket.disconnect()
    })

    const handlePhotoChange = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      try {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
          throw new Error('Veuillez sélectionner une image valide')
      }

        // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
          throw new Error('La taille de l\'image ne doit pas dépasser 5MB')
      }

        loading.value = true
        error.value = ''
        
        // Convertir l'image en base64
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
          const base64Image = e.target.result
            // Stocker temporairement l'image en base64
            form.value.tempPhoto = base64Image
            
            // Demander le mot de passe pour la modification
            currentEditingField.value = 'photo'
            showPasswordModal.value = true
          } catch (err) {
            error.value = err.message || 'Erreur lors de la conversion de l\'image'
            console.error('Erreur lors de la conversion:', err)
          } finally {
            loading.value = false
          }
        }
        reader.onerror = () => {
          error.value = 'Erreur lors de la lecture du fichier'
          loading.value = false
        }
        reader.readAsDataURL(file)
      } catch (err) {
        error.value = err.message || 'Erreur lors du traitement de l\'image'
        console.error('Erreur lors du changement de photo:', err)
        loading.value = false
      }
    }

    const handleImageError = (event) => {
      // En cas d'erreur de chargement de l'image, on affiche les initiales
      event.target.style.display = 'none'
      form.value.photo = null
    }

    return {
      loading,
      error,
      successMessage,
      form,
      editingField,
      formFields,
      showPasswordModal,
      password,
      showChangePasswordModal,
      showDeleteAccountModal,
      currentPassword,
      newPassword,
      confirmPassword,
      deleteAccountPassword,
      showCurrentPassword,
      showNewPassword,
      showConfirmPassword,
      showPassword,
      showDeletePassword,
      startEditing,
      cancelEditing,
      promptPasswordAndSave,
      cancelPasswordModal,
      confirmPasswordAndSave,
      formatDate,
      changePassword,
      deleteAccount,
      handlePhotoChange,
      user,
      handleImageError
    }
  }
}
</script>

<style scoped>
.min-h-screen {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  min-height: 100vh;
  padding: 2rem;
}

.max-w-4xl {
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  padding: 2rem;
}

h1 {
  color: #4763E4;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

p {
  color: #64748b;
  font-size: 0.95rem;
}

/* Avatar styling */
.w-20 {
  width: 5rem;
  height: 5rem;
  background: #4763E4;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
}

/* Form fields styling */
.space-y-2 {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  color: #374151;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #1f2937;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

input:disabled {
  background: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

input:focus {
  outline: none;
  border-color: #4763E4;
  box-shadow: 0 0 0 3px rgba(71, 99, 228, 0.1);
}

/* Modifier button styling */
button {
  color: #4763E4;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

button:hover {
  background: rgba(71, 99, 228, 0.1);
}

/* Success and error messages */
.text-red-600 {
  color: #dc2626;
}

.text-green-600 {
  color: #059669;
}

.bg-red-50 {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.bg-green-50 {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

/* Password modal */
.fixed {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.bg-white {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

/* Responsive design */
@media (max-width: 768px) {
  .min-h-screen {
    padding: 1rem;
  }

  .max-w-4xl {
    padding: 1.5rem;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}

/* Animation classes */
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .min-h-screen {
    background: linear-gradient(135deg, #1a1b23 0%, #242631 100%);
  }

  .max-w-4xl {
    background: #1f2937;
  }

  input {
    background: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  input:disabled {
    background: #2d3748;
    color: #9ca3af;
  }

  label {
    color: #e5e7eb;
  }

  .bg-white {
    background: #1f2937;
  }
}
</style> 