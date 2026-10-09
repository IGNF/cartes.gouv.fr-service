<script setup lang="js">
import { computed, ref } from 'vue';
import { useLogger } from 'vue-logger-plugin';
import { useSession } from '../composables/useSession';
import NotConnected from '../components/NotConnected.vue';

const log = useLogger();
const { service, store, isAuthenticated } = useSession();

const loading = ref(false);
const error = ref('');

// les documents sont chargés à la connexion puis persistés dans le store
const documents = computed(() => store.connexion?.documents || {});
const labels = computed(() => Object.keys(documents.value));
const total = computed(() => labels.value.reduce((n, label) => n + (documents.value[label]?.length || 0), 0));

const onRefresh = async () => {
  loading.value = true;
  error.value = '';
  try {
    const results = await service.getDocuments();
    const failed = results.filter((/** @type {any} */ r) => r.status === 'rejected');
    if (failed.length) {
      error.value = `${failed.length} catégorie(s) en erreur (voir la console).`;
      log.error('→ Documents en erreur :', failed);
    }
  } catch (e) {
    error.value = String(e);
    log.error('→ Documents :', e);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <section>
    <h2>Documents</h2>

    <NotConnected v-if="!isAuthenticated" />

    <div v-else>
      <p>
        {{ total }} document(s) issus du store persisté.
        <button :disabled="loading" @click="onRefresh">
          {{ loading ? 'Chargement…' : 'Rafraîchir depuis l\'API' }}
        </button>
      </p>
      <p v-if="error" class="error">{{ error }}</p>

      <p v-if="!labels.length">Aucun document chargé.</p>

      <div v-for="label in labels" :key="label">
        <h3>{{ label }} ({{ documents[label]?.length || 0 }})</h3>
        <ul v-if="documents[label]?.length">
          <li v-for="doc in documents[label]" :key="doc._id">
            <strong>{{ doc.name }}</strong>
            <small> — {{ doc.labels?.join(', ') }} — mis à jour le {{ doc.update }}</small>
          </li>
        </ul>
        <p v-else><small>Aucun document.</small></p>
      </div>
    </div>
  </section>
</template>

<style scoped>
h3 {
  margin-top: 1rem;
  font-weight: 600;
}

.error {
  color: #c00;
}
</style>
