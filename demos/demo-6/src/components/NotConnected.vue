<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <p>
    Vous n'êtes pas connecté. <RouterLink to="/">
      Se connecter
    </RouterLink>
  </p>
</template>
