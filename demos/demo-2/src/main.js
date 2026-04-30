import "./assets/main.css";

import { createApp } from "vue";
import { createLogger } from "vue-logger-plugin";
import { pinia } from 'cartes.gouv.fr-service';

import App from "./App.vue";

const app = createApp(App);

const logger = createLogger({
  // Configuration options for the logger
});
app.use(logger);
app.use(pinia);

app.mount("#app");
