import { createRouter, createWebHistory } from 'vue-router';

import LoginView from '../views/LoginView.vue';
import ProfileView from '../views/ProfileView.vue';
import DocumentsView from '../views/DocumentsView.vue';
import SessionView from '../views/SessionView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'login', component: LoginView },
    { path: '/profil', name: 'profile', component: ProfileView },
    { path: '/documents', name: 'documents', component: DocumentsView },
    { path: '/session', name: 'session', component: SessionView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
});

export default router;
