import "./assets/main.css";

import { createApp } from "vue";
import { pinia, logger } from 'cartes.gouv.fr-service';

import App from "./App.vue";

logger.apply({ level: 'debug', enabled: true });

const app = createApp(App);

app.use(logger);
app.use(pinia);

app.mount("#app");
