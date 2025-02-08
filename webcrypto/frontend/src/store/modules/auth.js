import axios from 'axios'

const IDENTITER_URL = 'http://localhost:8080/api'

// Configuration d'Axios pour les logs et CORS
axios.defaults.withCredentials = true // Permet d'envoyer les cookies

// Intercepteur pour les logs
axios.interceptors.request.use(request => {
  console.log('Request:', {
    method: request.method,
    url: request.url,
    data: request.data,
    headers: request.headers
  })
  return request
})

axios.interceptors.response.use(
  response => {
    console.log('Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    })
    return response
  },
  error => {
    console.error('Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    })
    return Promise.reject(error)
  }
)

// Intercepteur pour ajouter le token aux requêtes
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default {
  namespaced: true,
  
  state: {
    token: null,
    user: null,
    pendingVerification: null,
    error: null,
    isAdmin: false
  },

  getters: {
    isAuthenticated: state => !!state.token && !!state.user,
    user: state => state.user,
    pendingVerification: state => state.pendingVerification,
    error: state => state.error,
    isAdmin: state => state.isAdmin
  },

  mutations: {
    SET_TOKEN(state, token) {
      state.token = token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },
    SET_USER(state, user) {
      // Ensure we have default empty values instead of 'Non renseigné'
      const defaultUser = {
        username: '',
        email: '',
        nom: '',
        prenom: '',
        date_naissance: '',
        ville: '',
        photo: null,
        created_at: null,
        ...user // Spread the actual user data to override defaults
      }
      
      state.user = defaultUser
      if (defaultUser) {
        localStorage.setItem('user', JSON.stringify(defaultUser))
      } else {
        localStorage.removeItem('user')
      }
      
      // Log pour debug
      console.log('User state updated:', state.user)
    },
    SET_PENDING_VERIFICATION(state, data) {
      state.pendingVerification = data
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    SET_ADMIN(state, isAdmin) {
      state.isAdmin = isAdmin
      if (isAdmin) {
        localStorage.setItem('isAdmin', 'true')
      } else {
        localStorage.removeItem('isAdmin')
      }
    },
    CLEAR_AUTH(state) {
      state.token = null
      state.user = null
      state.pendingVerification = null
      state.error = null
      state.isAdmin = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('isAdmin')
    }
  },

  actions: {
    // Initialiser l'état d'authentification au démarrage
    init({ commit }) {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      const isAdmin = localStorage.getItem('isAdmin') === 'true'
      
      if (token && user) {
        try {
          const userData = JSON.parse(user)
          commit('SET_TOKEN', token)
          commit('SET_USER', userData)
          commit('SET_ADMIN', isAdmin)
        } catch (error) {
          commit('CLEAR_AUTH')
        }
      } else {
        commit('CLEAR_AUTH')
      }
    },

    async register({ commit }, userData) {
      console.log('Tentative d\'inscription avec les données:', userData)
      try {
        // Validation plus stricte des champs
        const requiredFields = {
          nom: 'Nom',
          prenom: 'Prénom',
          username: "Nom d'utilisateur",
          email: 'Email',
          ville: 'Ville',
          date_naissance: 'Date de naissance',
          password: 'Mot de passe'
        }

        const missingFields = []
        for (const [field, label] of Object.entries(requiredFields)) {
          if (!userData[field] || userData[field].trim() === '') {
            missingFields.push(label)
          }
        }

        if (missingFields.length > 0) {
          throw new Error(`Champs obligatoires manquants : ${missingFields.join(', ')}`)
        }

        // Validation de l'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(userData.email)) {
          throw new Error('Format d\'email invalide')
        }

        // Validation du mot de passe
        if (userData.password.length < 6) {
          throw new Error('Le mot de passe doit contenir au moins 6 caractères')
        }

        // Formater la date de naissance
        let formattedDate
        try {
          formattedDate = new Date(userData.date_naissance).toISOString().split('T')[0]
        } catch (error) {
          throw new Error('Format de date de naissance invalide')
        }

        // Validation de la photo si présente
        if (userData.photo) {
          // Vérifier que c'est bien une URL
          if (!userData.photo.startsWith('http')) {
            throw new Error('Format de photo invalide - l\'URL doit commencer par http')
          }
        }

        // Formater les données
        console.log('=== PRÉPARATION DES DONNÉES ===')
        console.log('Données utilisateur brutes:', userData)
        console.log('Password présent:', !!userData.password)
        console.log('Password length:', userData.password?.length)
        
        const formattedData = {
          nom: userData.nom.trim(),
          prenom: userData.prenom.trim(),
          username: userData.username.trim(),
          email: userData.email.trim(),
          ville: userData.ville.trim(),
          passwordHash: userData.password,
          dateNaissance: formattedDate,
          photo: userData.photo || null
        }

        console.log('=== DONNÉES FORMATÉES ===')
        console.log('Données complètes:', formattedData)
        console.log('password présent:', !!formattedData.passwordHash)
        console.log('URL de l\'API:', `${IDENTITER_URL}/auth/register`)

        const response = await axios.post(`${IDENTITER_URL}/auth/register`, formattedData)
        
        console.log('Réponse complète du serveur:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          headers: response.headers
        })
        
        if (response.status === 201 || response.status === 200) {
          commit('SET_ERROR', null)
          return response.data
        }
        
        throw new Error(response.data.message || 'Erreur lors de l\'inscription')
      } catch (error) {
        console.error('Erreur détaillée lors de l\'inscription:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          fullError: error.response?.data?.error || error.response?.data?.message
        })
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Erreur lors de l\'inscription'
        commit('SET_ERROR', errorMessage)
        throw errorMessage
      }
    },

    async verifyEmail({ commit }, { email, code }) {
      console.log('Tentative de vérification email:', { email, code })
      try {
        const response = await axios.post(`${IDENTITER_URL}/auth/verify-email`, {
          email,
          code
        })
        
        console.log('Réponse de vérification:', response.data)
        
        if (response.data.code === 200) {
          commit('SET_ERROR', null)
          return response.data
        } else {
          throw new Error(response.data.message || 'Erreur lors de la vérification')
        }
      } catch (error) {
        console.error('Erreur lors de la vérification:', error)
        const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la vérification'
        commit('SET_ERROR', errorMessage)
        throw errorMessage
      }
    },

    async resendVerificationCode({ commit }, { email }) {
      console.log('Tentative de renvoi du code de vérification:', { email })
      try {
        const response = await axios.post(`${IDENTITER_URL}/auth/resend-code`, {
          email
        })
        
        console.log('Réponse du renvoi:', response.data)
        
        if (response.data.code === 200) {
          commit('SET_ERROR', null)
          return response.data
        } else {
          throw new Error(response.data.message || 'Erreur lors du renvoi du code')
        }
      } catch (error) {
        console.error('Erreur lors du renvoi du code:', error)
        const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du renvoi du code'
        commit('SET_ERROR', errorMessage)
        throw errorMessage
      }
    },

    async login({ commit }, credentials) {
      console.log('Tentative de connexion:', credentials)
      try {
        // Étape 1 : Initier la connexion
        const response = await axios.post(`${IDENTITER_URL}/auth/login/initiate`, {
          email: credentials.email,
          password: credentials.password,
          isAdmin: credentials.isAdmin
        })
        
        console.log('Réponse initiation connexion:', response.data)
        
        if (response.data.code === 200) {
          // Mettre à jour l'état pour indiquer que nous attendons la vérification 2FA
          commit('SET_PENDING_VERIFICATION', {
            email: credentials.email,
            message: response.data.data.message || 'Veuillez entrer le code de vérification envoyé par email',
            isAdmin: credentials.isAdmin
          })
          return response.data
        } else {
          throw new Error(response.data.message || 'Erreur lors de la connexion')
        }
      } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la connexion'
        commit('SET_ERROR', errorMessage)
        throw errorMessage
      }
    },

    async verify2FA({ commit }, { email, code, isAdmin }) {
      try {
        const response = await axios.post(`${IDENTITER_URL}/auth/login/verify`, {
          email,
          pin: code,
          isAdmin
        })
        
        if (response.data.code === 200) {
          const { token, user, isAdmin: responseIsAdmin } = response.data.data
          commit('SET_TOKEN', token)
          commit('SET_USER', user)
          commit('SET_ADMIN', responseIsAdmin || isAdmin)
          commit('SET_PENDING_VERIFICATION', null)
          commit('SET_ERROR', null)
          return response.data
        } else {
          throw new Error(response.data.message || 'Erreur lors de la vérification 2FA')
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message
        commit('SET_ERROR', errorMessage)
        throw errorMessage
      }
    },

    async logout({ commit }) {
      // Nettoyer le state
      commit('CLEAR_AUTH')
      
      // Nettoyer le localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Réinitialiser l'état de l'application
      commit('SET_PENDING_VERIFICATION', null)
      commit('SET_ERROR', null)
    },

    async loginAdmin({ commit }, credentials) {
      console.log('Tentative de connexion admin:', credentials);
      try {
        const response = await axios.post('http://localhost:3000/api/admin/login', {
          email: credentials.email,
          password: credentials.password
        });
        
        if (response.data.token) {
          const token = response.data.token;
          // Décoder le token pour obtenir les informations utilisateur
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const user = JSON.parse(window.atob(base64));

          commit('SET_TOKEN', token);
          commit('SET_USER', user);
          commit('SET_ADMIN', true);
          commit('SET_ERROR', null);
          return response.data;
        } else {
          throw new Error('Token manquant dans la réponse');
        }
      } catch (error) {
        console.error('Erreur lors de la connexion admin:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la connexion';
        commit('SET_ERROR', errorMessage);
        throw errorMessage;
      }
    },

    async updateUser({ commit, state }, userData) {
      try {
        console.log('Mise à jour des données utilisateur:', userData)
        // Fusionner les données existantes avec les nouvelles données
        const updatedUser = {
          ...state.user,
          ...userData
        }
        commit('SET_USER', updatedUser)
        return updatedUser
      } catch (error) {
        console.error('Erreur lors de la mise à jour utilisateur:', error)
        throw error
      }
    },

    async deleteAccount({ commit, state }, password) {
      try {
        const token = state.token || localStorage.getItem('token')
        if (!token) {
          throw new Error('Non authentifié')
        }

        const response = await axios.delete(`${IDENTITER_URL}/auth/users/me`, {
          data: { password },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.status === 200 || response.status === 204) {
          // Nettoyer le state et le localStorage
          commit('CLEAR_AUTH')
          return response.data
        }
        
        throw new Error(response.data?.message || 'Erreur lors de la suppression du compte')
      } catch (error) {
        console.error('Erreur lors de la suppression du compte:', error)
        if (error.response?.status === 403) {
          throw new Error('Mot de passe incorrect ou session expirée')
        }
        const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la suppression du compte'
        throw errorMessage
      }
    }
  }
}
