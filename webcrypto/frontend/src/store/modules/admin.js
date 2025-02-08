export default {
  namespaced: true,
  
  state: {
    adminToken: localStorage.getItem('adminToken') || null,
  },

  getters: {
    isAdmin: state => !!state.adminToken,
  },

  mutations: {
    SET_ADMIN_TOKEN(state, token) {
      state.adminToken = token;
      if (token) {
        localStorage.setItem('adminToken', token);
      } else {
        localStorage.removeItem('adminToken');
      }
    },
    CLEAR_ADMIN(state) {
      state.adminToken = null;
      localStorage.removeItem('adminToken');
    }
  },

  actions: {
    loginAdmin({ commit }, token) {
      commit('SET_ADMIN_TOKEN', token);
    },
    logoutAdmin({ commit }) {
      commit('CLEAR_ADMIN');
    }
  }
};
