import "./assets/main.css";

import { createApp } from "vue";
import { createLogger } from "vue-logger-plugin";
import { createPinia } from 'pinia'
import { storePlugin } from 'pinia-plugin-store'

import App from "./App.vue";

const pinia = createPinia()
const store = storePlugin({
  stores: ['service'],
  storage: localStorage,
})
pinia.use(store)

const app = createApp(App);

const logger = createLogger({
  // Configuration options for the logger
});
app.use(logger);
app.use(pinia);

app.mount("#app");
