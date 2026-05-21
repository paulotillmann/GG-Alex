import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, Save, Loader2, FileText, Calendar, Hash, User, Users, ClipboardList, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Oficio } from '../../types/oficio';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Registrar o uso de estilos inline para tamanho de fonte e alinhamento ao invés de classes CSS
const SizeStyle = Quill.import('attributors/style/size');
SizeStyle.whitelist = ['small', 'large', 'huge', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px', '48px'];
Quill.register(SizeStyle, true);

const AlignStyle = Quill.import('attributors/style/align');
Quill.register(AlignStyle, true);

interface OficioFormProps {
  initialData?: Partial<Oficio> | null;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const STATUSES_OFICIO = ['ABERTA', 'EM ATENDIMENTO', 'AGUARDANDO RETORNO', 'CONCLUÍDA'] as const;

export const STATUS_STYLES_OFICIO: Record<string, string> = {
  'ABERTA': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'EM ATENDIMENTO': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'AGUARDANDO RETORNO': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'CONCLUÍDA': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
};

// Editor modules config (Must be outside component to prevent ReactQuill remount bugs)
const modules = {
  toolbar: [
    [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'align': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    ['link'],
    ['clean']
  ],
  keyboard: {
    bindings: {
      tab: {
        key: 9,
        handler: function(this: any, range: any) {
          // Insere 4 espaços inquebráveis para simular o Tab (para não sumirem ao recarregar do BD)
          this.quill.insertText(range.index, '\u00A0\u00A0\u00A0\u00A0');
          this.quill.setSelection(range.index + 4);
          return false;
        }
      }
    }
  }
};

const OficioForm: React.FC<OficioFormProps> = ({ initialData, mode, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Oficio>>({
    numero: '',
    data_emissao: new Date().toISOString().split('T')[0],
    destinatario_tratamento: 'Exmo. Senhor',
    destinatario_nome: '',
    destinatario_cargo: '',
    assunto: '',
    conteudo: '',
    assinatura_nome: 'Alex Peixoto',
    assinatura_cargo: 'Vereador',
    status: 'ABERTA',
    solicitante: '',
    resposta: '',
    ...initialData,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuillChange = (value: string) => {
    setFormData((prev) => ({ ...prev, conteudo: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.data_emissao) {
      setError('A data de emissão é obrigatória.');
      setLoading(false);
      return;
    }
    if (!formData.destinatario_nome?.trim()) {
      setError('O nome do destinatário é obrigatório.');
      setLoading(false);
      return;
    }
    if (!formData.assunto?.trim()) {
      setError('O assunto do ofício é obrigatório.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'create') {
        const { error: insertError } = await supabase
          .from('oficios')
          .insert({
            ...formData,
            created_by: user?.id,
          });
        if (insertError) throw insertError;
        onSuccess('Ofício criado com sucesso!');
      } else {
        const { error: updateError } = await supabase
          .from('oficios')
          .update({
            numero: formData.numero,
            data_emissao: formData.data_emissao,
            destinatario_tratamento: formData.destinatario_tratamento,
            destinatario_nome: formData.destinatario_nome,
            destinatario_cargo: formData.destinatario_cargo,
            assunto: formData.assunto,
            conteudo: formData.conteudo,
            assinatura_nome: formData.assinatura_nome,
            assinatura_cargo: formData.assinatura_cargo,
            status: formData.status,
            solicitante: formData.solicitante,
            resposta: formData.resposta,
          })
          .eq('id', formData.id);
        if (updateError) throw updateError;
        onSuccess('Ofício atualizado com sucesso!');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o ofício.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          title="Voltar"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            {mode === 'create' ? 'Novo Ofício' : 'Editar Ofício'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Preencha as informações necessárias para emitir ou gerenciar o ofício
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Principal (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quadro: DADOS PRINCIPAIS */}
          <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              IDENTIFICAÇÃO E ASSUNTO
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Número do Ofício
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero || ''}
                    onChange={handleChange}
                    placeholder="Gerado automaticamente"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Deixe em branco para gerar sequencial automático.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data de Emissão <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    name="data_emissao"
                    required
                    value={formData.data_emissao || ''}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assunto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <ClipboardList className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  name="assunto"
                  required
                  value={formData.assunto || ''}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Resumo ou tema central do ofício..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Solicitante
                </label>
                <input
                  type="text"
                  name="solicitante"
                  value={formData.solicitante || ''}
                  onChange={handleChange}
                  placeholder="Nome do solicitante..."
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Quadro: CONTEÚDO */}
          <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              CONTEÚDO DO OFÍCIO
            </h3>
            <div className="flex-1 bg-white rounded-lg pb-14 min-h-[520px]">
              <ReactQuill
                theme="snow"
                value={formData.conteudo || ''}
                onChange={handleQuillChange}
                modules={modules}
                className="h-[460px] text-slate-900"
              />
            </div>
          </div>

        </div>

        {/* Coluna Lateral (1/3) */}
        <div className="space-y-6">

          {/* Quadro: SITUAÇÃO */}
          <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              CONTROLE DE STATUS
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status || 'ABERTA'}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {STATUSES_OFICIO.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {formData.status && (
              <div className="mt-2">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES_OFICIO[formData.status] ?? ''}`}>
                  {formData.status}
                </span>
              </div>
            )}
          </div>

          {/* Quadro: DESTINATÁRIO */}
          <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              DESTINATÁRIO
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Forma de Tratamento
              </label>
              <input
                type="text"
                name="destinatario_tratamento"
                value={formData.destinatario_tratamento || ''}
                onChange={handleChange}
                placeholder="Ex: Exmo. Senhor"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  name="destinatario_nome"
                  required
                  value={formData.destinatario_nome || ''}
                  onChange={handleChange}
                  placeholder="Ex: Renato Carvalho Fernandes"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cargo / Função
              </label>
              <input
                type="text"
                name="destinatario_cargo"
                value={formData.destinatario_cargo || ''}
                onChange={handleChange}
                placeholder="Ex: Prefeito Municipal"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Quadro: ASSINATURA */}
          <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              ASSINATURA (REMETENTE)
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome do Assinante
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  name="assinatura_nome"
                  value={formData.assinatura_nome || ''}
                  onChange={handleChange}
                  placeholder="Ex: Rodrigo da Silva Cardoso"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cargo / Título
              </label>
              <input
                type="text"
                name="assinatura_cargo"
                value={formData.assinatura_cargo || ''}
                onChange={handleChange}
                placeholder="Ex: Secretário Executivo"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Quadro: RESPOSTA */}
          <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              RESPOSTA DO OFÍCIO
            </h3>
            
            <div>
              <textarea
                name="resposta"
                value={formData.resposta || ''}
                onChange={handleChange}
                rows={4}
                placeholder="Descreva a resposta recebida para este ofício..."
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-y min-h-[100px]"
              />
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E2B58] hover:bg-[#151E3F] disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? 'Salvando...' : mode === 'create' ? 'Emitir Ofício' : 'Salvar Alterações'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>

        </div>

      </form>
    </div>
  );
};

export default OficioForm;
