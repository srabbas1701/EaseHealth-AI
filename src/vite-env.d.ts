/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_N8N_AI_SUMMARY_WEBHOOK: string
    readonly VITE_N8N_REPORT_CHAT_WEBHOOK: string
    readonly VITE_N8N_APPOINTMENT_WEBHOOK: string
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }