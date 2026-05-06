import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Plus, Loader2, Trash2, Pencil,
  AlertCircle, X, CheckCircle, Lock, MessageSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface Demanda {
  id: string;
  data_demanda: string;
  pessoa_id: string;
  solicitante: string;
  descricao: string;
  assessor: string | null;
  status: 'ABERTA' | 'EM ATENDIMENTO' | 'AGUARDANDO RETORNO' | 'CONCLUÍDA';
  motivo_retorno: string | null;
  created_at: string;
}

const DEFAULT_DEMANDA: Omit<Demanda, 'id' | 'pessoa_id' | 'created_at' | 'solicitante' | 'assessor'> = {
  data_demanda: new Date().toISOString().split('T')[0],
  descricao: '',
  status: 'ABERTA',
  motivo_retorno: null,
};

const STATUS_COLORS: Record<string, string> = {
  'ABERTA': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'EM ATENDIMENTO': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'AGUARDANDO RETORNO': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'CONCLUÍDA': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
};

// ─── Props ──────────────────────────────────────────────────────────────────────
interface DemandasSectionProps {
  pessoaId: string;
  pessoaNome: string;
  disabled?: boolean;
}

// ─── Componente ─────────────────────────────────────────────────────────────────
const DemandasSection: React.FC<DemandasSectionProps> = ({ pessoaId, pessoaNome, disabled = false }) => {
  const { profile } = useAuth();
  const assessorName = profile?.full_name || '';

  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...DEFAULT_DEMANDA });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchDemandas = useCallback(async () => {
    if (!pessoaId || disabled) return;
    setLoading(true);
    const { data } = await supabase
      .from('demandas')
      .select('*')
      .eq('pessoa_id', pessoaId)
      .order('created_at', { ascending: false });
    setDemandas((data ?? []) as Demanda[]);
    setLoading(false);
  }, [pessoaId, disabled]);

  useEffect(() => { fetchDemandas(); }, [fetchDemandas]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const formatDate = (ds?: string | null) => {
    if (!ds) return '—';
    const parts = ds.split('T')[0].split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ds;
  };

  const resetForm = () => {
    setFormData({ ...DEFAULT_DEMANDA, data_demanda: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setError(null);
    setShowForm(false);
  };

  const openEdit = (dem: Demanda) => {
    setFormData({
      data_demanda: dem.data_demanda,
      descricao: dem.descricao,
      status: dem.status,
      motivo_retorno: dem.motivo_retorno,
    });
    setEditingId(dem.id);
    setError(null);
    setShowForm(true);
  };

  // ── Salvar demanda ────────────────────────────────────────────────────────
  const handleSave = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setError(null);
    
    if (!formData.data_demanda || !formData.descricao || !formData.status) {
      setError('Preencha os campos obrigatórios (*).');
      return;
    }

    if (formData.status === 'AGUARDANDO RETORNO' && !formData.motivo_retorno?.trim()) {
      setError('O Motivo do Retorno é obrigatório para este status.');
      return;
    }

    setSaving(true);
    const payload = {
      ...formData,
      motivo_retorno: formData.status === 'AGUARDANDO RETORNO' ? formData.motivo_retorno?.trim() : null,
      updated_at: new Date().toISOString(),
    };

    let saveError;
    if (editingId) {
      // Edição: não sobrescreve pessoa_id, solicitante e assessor se já existiam, mas mantemos o básico
      const { error: err } = await supabase
        .from('demandas')
        .update(payload)
        .eq('id', editingId);
      saveError = err;
    } else {
      // Criação: injeta os campos automáticos
      const { error: err } = await supabase
        .from('demandas')
        .insert({ 
          ...payload, 
          pessoa_id: pessoaId,
          solicitante: pessoaNome,
          assessor: assessorName
        });
      saveError = err;
    }

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
    } else {
      resetForm();
      fetchDemandas();
      showSuccess(editingId ? 'Demanda atualizada com sucesso!' : 'Demanda cadastrada com sucesso!');
    }
  };

  // ── Excluir demanda ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const { error: e } = await supabase.from('demandas').delete().eq('id', id);
    if (!e) {
      setDeleteId(null);
      fetchDemandas();
      showSuccess('Demanda removida.');
    } else {
      alert('Erro ao excluir: ' + e.message);
    }
  };

  // ── Estado Bloqueado ─────────────────────────────────────────────────────────
  if (disabled) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-4 w-4 text-slate-400" />
          <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
            Demandas
          </h4>
          <Lock className="h-3.5 w-3.5 text-slate-400 ml-auto" />
        </div>
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Salve o cadastro da pessoa primeiro
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Após salvar, o lançamento de demandas será liberado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  // ── Estado Habilitado ────────────────────────────────────────────────────────
  return (
    <div className="mt-8">
      {/* Header da seção */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-500" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Demandas
          </h4>
          {demandas.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-medium">
              {demandas.length}
            </span>
          )}
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Nova Demanda
          </button>
        )}
      </div>

      {/* Toast de sucesso */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-2 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-xs"
          >
            <CheckCircle className="h-3.5 w-3.5 shrink-0" /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini-formulário de adição */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  {editingId ? 'Editar Demanda' : 'Nova Demanda'}
                </p>
                <button type="button" onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form id="demanda-form" onSubmit={handleSave}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="col-span-1 md:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Data da Demanda <span className="text-red-500">*</span></label>
                    <input
                      required type="date"
                      value={formData.data_demanda}
                      onChange={e => setFormData({ ...formData, data_demanda: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status <span className="text-red-500">*</span></label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as Demanda['status'] })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="ABERTA">Aberta</option>
                      <option value="EM ATENDIMENTO">Em Atendimento</option>
                      <option value="AGUARDANDO RETORNO">Aguardando Retorno</option>
                      <option value="CONCLUÍDA">Concluída</option>
                    </select>
                  </div>

                  {formData.status === 'AGUARDANDO RETORNO' && (
                    <div className="col-span-1 md:col-span-4">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Motivo do Retorno <span className="text-red-500">*</span></label>
                      <input
                        type="text" required
                        placeholder="Ex: Aguardando documento"
                        value={formData.motivo_retorno || ''}
                        onChange={e => setFormData({ ...formData, motivo_retorno: e.target.value })}
                        className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600/50 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}

                  <div className="col-span-1 md:col-span-12">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Descrição / Problema <span className="text-red-500">*</span></label>
                    <textarea
                      required rows={3}
                      value={formData.descricao}
                      placeholder="Descreva a demanda em detalhes..."
                      onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                  </p>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={resetForm} className="px-4 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
                    Cancelar
                  </button>
                  <button
                    form="demanda-form" type="submit" disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (editingId ? 'Salvar Alterações' : 'Cadastrar Demanda')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de demandas */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
        </div>
      ) : demandas.length === 0 && !showForm ? (
        <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
          <Layers className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma demanda registrada ainda.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            + Registrar primeira demanda
          </button>
        </div>
      ) : demandas.length > 0 ? (
        <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">Data</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Descrição</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {demandas.map((dem, idx) => (
                <tr key={dem.id} className={`border-b border-slate-100 dark:border-slate-800/40 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/10'}`}>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(dem.data_demanda)}
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-slate-800 dark:text-slate-200 line-clamp-2" title={dem.descricao}>{dem.descricao}</p>
                    {/* Exibe o status aqui no mobile caso a coluna seja escondida */}
                    <div className="md:hidden mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${STATUS_COLORS[dem.status]}`}>
                        {dem.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${STATUS_COLORS[dem.status]}`}>
                      {dem.status}
                    </span>
                    {dem.status === 'AGUARDANDO RETORNO' && dem.motivo_retorno && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1 truncate max-w-[150px]" title={dem.motivo_retorno}>
                        Motivo: {dem.motivo_retorno}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {deleteId === dem.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-slate-500">Excluir?</span>
                        <button type="button" onClick={() => handleDelete(dem.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Sim</button>
                        <button type="button" onClick={() => setDeleteId(null)} className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Não</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(dem)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded transition-colors"
                          title="Editar demanda"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteId(dem.id); setShowForm(false); setEditingId(null); }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                          title="Excluir demanda"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default DemandasSection;
