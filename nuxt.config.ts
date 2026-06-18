// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: true,
  server: {
    port: parseInt(process.env.NUXT_PORT || '3000'),
  },
  nitro: {
    plugins: ['~/server/plugins/cron.ts'],
    scheduledTasks: {},
  },
})
