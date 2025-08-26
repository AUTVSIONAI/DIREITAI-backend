const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSystemSettingsTable() {
  try {
    console.log('🔄 Verificando se a tabela system_settings existe...');
    
    // Tentar fazer uma consulta simples para verificar se a tabela existe
    const { data: existingData, error: checkError } = await supabase
      .from('system_settings')
      .select('key')
      .limit(1);
    
    if (checkError && checkError.code === 'PGRST116') {
      console.log('❌ Tabela system_settings não existe. Você precisa criá-la manualmente no painel do Supabase.');
      console.log('📋 Execute o SQL do arquivo create_system_settings_table.sql no painel do Supabase.');
      return;
    }
    
    console.log('✅ Tabela system_settings encontrada!');
    
    // Inserir configurações padrão
    console.log('🔄 Inserindo configurações padrão...');

    const defaultSettings = [
      {
        key: 'general',
        value: {
          siteName: 'DireitaAI',
          siteDescription: 'Plataforma de engajamento político conservador',
          siteLogo: null,
          maintenanceMode: false,
          registrationEnabled: true,
          maxUsersPerEvent: 500
        },
        description: 'Configurações gerais do sistema'
      },
      {
        key: 'ai',
        value: {
          dailyLimitGratuito: 10,
          dailyLimitEngajado: 50,
          dailyLimitLider: 200,
          dailyLimitSupremo: -1,
          creativeAIEnabled: true
        },
        description: 'Configurações de IA'
      },
      {
        key: 'points',
        value: {
          checkinPoints: 10,
          purchasePointsRatio: 0.1,
          referralPoints: 50
        },
        description: 'Configurações do sistema de pontos'
      },
      {
        key: 'store',
        value: {
          freeShippingThreshold: 100,
          shippingCost: 15,
          taxRate: 0.08
        },
        description: 'Configurações da loja'
      },
      {
        key: 'security',
        value: {
          minPasswordLength: 8,
          sessionTimeout: 3600,
          twoFactorEnabled: false,
          maxLoginAttempts: 5
        },
        description: 'Configurações de segurança'
      },
      {
        key: 'notifications',
        value: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          emailProvider: 'smtp',
          smsProvider: 'twilio'
        },
        description: 'Configurações de notificações'
      },
      {
        key: 'system',
        value: {
          maxFileSize: 10485760,
          apiRateLimit: 1000,
          backupFrequency: 'daily',
          logLevel: 'info'
        },
        description: 'Configurações do sistema'
      }
    ];

    for (const setting of defaultSettings) {
      const { error: insertError } = await supabase
        .from('system_settings')
        .upsert(setting, { onConflict: 'key' });

      if (insertError) {
        console.error(`❌ Erro ao inserir configuração ${setting.key}:`, insertError);
      } else {
        console.log(`✅ Configuração ${setting.key} inserida com sucesso!`);
      }
    }

    console.log('🎉 Tabela system_settings configurada com sucesso!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
createSystemSettingsTable();