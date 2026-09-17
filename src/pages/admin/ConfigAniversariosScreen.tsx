import React, { useState, useEffect } from 'react';
import { 
  Cake, Loader2, Save, RefreshCw, AlertCircle, CheckCircle, 
  User, MessageSquare, Phone, Clock, Sparkles, Send
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { maskPhone } from '../../utils/validators';

interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string | null;
  telefone: string | null;
  role: string;
}

interface BirthdayConfig {
  id: string;
  usuario_notificacao_id: string | null;
  mensagem_padrao: string;
  cron_ativo: boolean;
}

const DEFAULT_MESSAGE = `Olá *{nome}*, tudo bem?\n\nHoje é um dia muito especial! Em nome do Gabinete do Vereador Alex Peixoto, gostaríamos de lhe desejar um **Feliz Aniversário**! 🎉🥳\n\nQue seu dia seja repleto de alegrias, saúde e paz. Um forte abraço!`;

const ConfigAniversariosScreen: React.FC = () => {
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [mensagemPadrao, setMensagemPadrao] = useState<string>(DEFAULT_MESSAGE);
  const [cronAtivo, setCronAtivo] = useState<boolean>(true);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchConfigAndProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Carregar lista de profiles
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, telefone, role')
        .order('full_name', { ascending: true });

      if (profErr) throw profErr;
      setProfiles(profData || []);

      // 2. Carregar configuração atual de aniversários
      const { data: configData, error: configErr } = await supabase
        .from('configuracao_aniversario')
        .select('*')
        .limit(1)
        .single();

      if (configErr && configErr.code !== 'PGRST116') {
        throw configErr;
      }

      if (configData) {
        setSelectedUserId(configData.usuario_notificacao_id || '');
        setMensagemPadrao(configData.mensagem_padrao || DEFAULT_MESSAGE);
        setCronAtivo(configData.cron_ativo ?? true);
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações de aniversário:', err);
      setError(err.message || 'Erro ao carregar dados de configuração.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigAndProfiles();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Atualizar ou criar configuração na tabela configuracao_aniversario
      const { data: existingConfig } = await supabase
        .from('configuracao_aniversario')
        .select('id')
        .limit(1)
        .single();

      if (existingConfig) {
        const { error: updErr } = await supabase
          .from('configuracao_aniversario')
          .update({
            usuario_notificacao_id: selectedUserId || null,
            mensagem_padrao: mensagemPadrao,
            cron_ativo: cronAtivo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConfig.id);

        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('configuracao_aniversario')
          .insert({
            usuario_notificacao_id: selectedUserId || null,
            mensagem_padrao: mensagemPadrao,
            cron_ativo: cronAtivo,
          });

        if (insErr) throw insErr;
      }

      // 2. Sincronizar o pg_cron com o status ativo/inativo
      const { error: cronRpcErr } = await supabase.rpc('update_birthday_cron', {
        p_is_enabled: cronAtivo,
        p_cron_schedule: '0 12 * * *', // 12:00 UTC = 09:00 BRT
      });

      if (cronRpcErr) {
        console.warn('Aviso ao sincronizar cron via RPC:', cronRpcErr);
      }

      setSuccess('Configurações de aniversário salvas com sucesso!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      setError(err.message || 'Erro ao salvar as configurações de aniversário.');
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = profiles.find((p) => p.id === selectedUserId);

  // Formatação de pré-visualização de mensagem
  const previewText = mensagemPadrao
    .replace(/\{nome\}/gi, 'João')
    .replace(/\{nome_completo\}/gi, 'João da Silva');

  const insertTag = (tag: string) => {
    setMensagemPadrao((prev) => prev + ` ${tag}`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cake className="h-7 w-7 text-pink-600 dark:text-pink-400" />
            Configuração de Aniversários
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie o aviso consolidado diário das 09h e o modelo de mensagem individual de parabéns.
          </p>
        </div>

        <button
          onClick={fetchConfigAndProfiles}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm">
          <CheckCircle className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
          <p className="text-slate-500 text-sm">Carregando configurações...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Coluna Esquerda: Configurações de Envio e Template (7 colunas) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Card 1: Aviso Diário Consolidado */}
              <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-lg">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Aviso Matinal Automático (09:00 BRT)
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Disparo diário de mensagem consolidada com todos os aniversariantes do dia.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Ativo/Inativo */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cronAtivo}
                      onChange={(e) => setCronAtivo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-pink-600"></div>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-slate-400" />
                      Usuário do Sistema que Receberá o Aviso
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                    >
                      <option value="">-- Selecione um usuário destinatário --</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || p.email} ({p.role}) {p.telefone ? `• ${maskPhone(p.telefone)}` : '• [Sem telefone]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Informações do usuário selecionado */}
                  {selectedUser && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 flex items-center justify-center font-bold text-xs uppercase">
                          {selectedUser.full_name ? selectedUser.full_name.slice(0, 2) : 'US'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {selectedUser.full_name || selectedUser.email}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedUser.telefone ? maskPhone(selectedUser.telefone) : 'Nenhum telefone cadastrado no perfil'}
                          </p>
                        </div>
                      </div>

                      {!selectedUser.telefone && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                          Aviso: Requer Telefone
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed bg-slate-50/60 dark:bg-slate-800/30 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    💡 <strong>Como funciona:</strong> Todo dia pontualmente às 09:00 (horário de Brasília), a rotina verifica a base de dados. Se houver aniversariantes (contatos ou dependentes), envia uma lista consolidada no WhatsApp do usuário selecionado. Se não houver aniversariantes no dia, nenhuma mensagem é enviada.
                  </div>
                </div>
              </div>

              {/* Card 2: Modelo da Mensagem Individual */}
              <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Mensagem Individual Padrão
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Texto enviado ao clicar no botão de WhatsApp de um aniversariante no cabeçalho.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Texto da Mensagem
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">Variáveis:</span>
                      <button
                        type="button"
                        onClick={() => insertTag('{nome}')}
                        className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-pink-900/30 text-slate-700 dark:text-slate-300 hover:text-pink-600 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 transition-colors font-mono"
                        title="Primeiro Nome"
                      >
                        {'{nome}'}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag('{nome_completo}')}
                        className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-pink-900/30 text-slate-700 dark:text-slate-300 hover:text-pink-600 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 transition-colors font-mono"
                        title="Nome Completo"
                      >
                        {'{nome_completo}'}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={6}
                    value={mensagemPadrao}
                    onChange={(e) => setMensagemPadrao(e.target.value)}
                    placeholder="Digite a mensagem de aniversário..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-y leading-relaxed font-sans"
                  />

                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Suporta formatação padrão do WhatsApp: *negrito*, _itálico_</span>
                    <button
                      type="button"
                      onClick={() => setMensagemPadrao(DEFAULT_MESSAGE)}
                      className="text-pink-600 dark:text-pink-400 hover:underline"
                    >
                      Restaurar Padrão
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Coluna Direita: Pré-visualização WhatsApp e Salvar (5 colunas) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Card de Pré-visualização */}
              <div className="bg-[#E5DDD5] dark:bg-[#0B141A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Pré-visualização (WhatsApp)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Exemplo</span>
                </div>

                {/* Balão de Conversa WhatsApp */}
                <div className="flex flex-col gap-3 py-2">
                  <div className="self-end max-w-[90%] bg-[#DCF8C6] dark:bg-[#005C4B] text-slate-900 dark:text-slate-100 p-3.5 rounded-2xl rounded-tr-none shadow-sm relative text-xs leading-relaxed whitespace-pre-wrap font-sans">
                    {previewText}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-300">
                      <span>09:00</span>
                      <span className="text-sky-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-600 dark:text-slate-400 text-center italic">
                  * A variável {'{nome}'} será substituída dinamicamente pelo primeiro nome do contato.
                </p>
              </div>

              {/* Botão Salvar */}
              <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#1E2B58] to-[#2A3B75] hover:from-[#151E3F] hover:to-[#1E2B58] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 text-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Salvando Configurações...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Salvar Configurações
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-400">
                  As alterações têm efeito imediato para todos os envios do sistema.
                </p>
              </div>

            </div>

          </div>
        </form>
      )}
    </div>
  );
};

export default ConfigAniversariosScreen;
