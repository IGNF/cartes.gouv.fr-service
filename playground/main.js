import { createApp } from 'vue'
import App from './App.vue'

import { createPinia } from 'pinia'
import { storePlugin } from 'pinia-plugin-store'
import { logger } from '@/utils/logger'

const pinia = createPinia()
const store = storePlugin({
  stores: ['service'],
  storage: localStorage,
})
pinia.use(store)

createApp(App)
  .use(logger)
  .use(pinia)
  .mount('#app')