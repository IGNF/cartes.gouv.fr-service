<script setup>
import { computed, ref, toRaw } from 'vue';
import { useStore, logger } from 'cartes.gouv.fr-service';
import NotConnected from '../components/NotConnected.vue';

const store = useStore();
const isAuthenticated = computed(() => Boolean(store.connexion?.authenticated));
const documents = computed(() => store.connexion?.documents || {});
const labels = computed(() => Object.keys(documents.value));
const loading = ref(false);
const error = ref('');

const onRefresh = async () => {
  loading.value = true;
  error.value = '';
  try {
    const service = toRaw(store.getService());
    const results = await service.getDocuments();
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length) {
      error.value = `${failed.length} catégorie(s) en erreur (voir la console).`;
      logger.error('Documents en erreur :', failed);
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    logger.error('Chargement des documents impossible :', cause);
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
      <p>Les documents sont conservés dans le store en mémoire uniquement.</p>
      <button
        :disabled="loading"
        @click="onRefresh"
      >
        {{ loading ? 'Chargement…' : 'Rafraîchir depuis l’API' }}
      </button>
      <p
        v-if="error"
        role="alert"
        class="error"
      >
        {{ error }}
      </p>
      <p v-if="!labels.length">
        Aucun document chargé.
      </p>
      <div
        v-for="label in labels"
        :key="label"
      >
        <h3>{{ label }} ({{ documents[label]?.length || 0 }})</h3>
        <ul v-if="documents[label]?.length">
          <li
            v-for="doc in documents[label]"
            :key="doc._id"
          >
            <strong>{{ doc.name }}</strong>
            <small> — {{ doc.labels?.join(', ') }} — mis à jour le {{ doc.update }}</small>
          </li>
        </ul>
        <p v-else>
          Aucun document.
        </p>
      </div>
    </div>
  </section>
</template>
