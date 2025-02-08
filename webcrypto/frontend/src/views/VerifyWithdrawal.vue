<template>
  <div class="verify-withdrawal">
    <h2>Vérification du retrait</h2>
    <div class="verification-form">
      <p>Un code de vérification a été envoyé à votre adresse email.</p>
      <div class="form-group">
        <label>Code de vérification</label>
        <input 
          v-model="verificationCode" 
          type="text" 
          class="form-control" 
          placeholder="Entrez le code"
        >
      </div>
      <button 
        @click="confirmWithdrawal" 
        class="btn btn-primary"
      >
        Confirmer le retrait
      </button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';

export default {
  setup() {
    const store = useStore();
    const route = useRoute();
    const router = useRouter();
    const verificationCode = ref('');

    const confirmWithdrawal = async () => {
      try {
        const result = await store.dispatch('wallet/confirmWithdrawal', {
          transactionId: route.query.transactionId,
          code: verificationCode.value
        });
        
        if (result.success) {
          alert(result.message);
          router.push('/wallet');
        }
      } catch (error) {
        alert(error.message || 'Erreur lors de la confirmation');
      }
    };

    return {
      verificationCode,
      confirmWithdrawal
    };
  }
};
</script> 