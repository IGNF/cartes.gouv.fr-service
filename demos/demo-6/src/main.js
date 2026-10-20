import './assets/main.css';
import { createApp } from 'vue';
import { createLogger } from 'vue-logger-plugin';
import { configurePersistence, pinia } from 'cartes.gouv.fr-service';
import App from './App.vue';
import router from './router';

configurePersistence({ mode: 'memory' });

createApp(App)
  .use(createLogger({}))
  .use(pinia)
  .use(router)
  .mount('#app');
