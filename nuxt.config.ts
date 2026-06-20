// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  ssr: true,
  devServer: {
    port: parseInt(process.env.NUXT_PORT || '3000'),
  },
  runtimeConfig: {
    sessionPassword: process.env.NUXT_SESSION_PASSWORD,
    public: {
      baseUrl: process.env.NUXT_PUBLIC_URL || 'http://localhost:3000',
    },
  },
  nitro: {
    plugins: ['~~/server/plugins/cron.ts'],
    scheduledTasks: {},
  },
})
