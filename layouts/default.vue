<template>
  <div class="app-shell">
    <header v-if="showHeader" class="app-header">
      <div class="header-title">宿舍打扫管理系统</div>
    </header>
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const showHeader = computed(() => !route.path.includes('/login') && !route.path.includes('/register'))
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f5f5;
}
.app-header {
  background: #fff;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  text-align: center;
}
.app-main {
  flex: 1;
  padding: 16px;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
}
</style>
