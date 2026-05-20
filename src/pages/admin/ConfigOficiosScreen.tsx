import React, { useState, useEffect } from 'react';
import {
  Settings, Loader2, Save, ArrowLeft, RefreshCw, AlertCircle, Plus, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SequenceRow {
  ano: number;
  ultimo_numero: number;
}

const ConfigOficiosScreen: React.FC = () => {
  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // States para novo sequenciador
  const [novoAno, setNovoAno] = useState(new Date().getFullYear());
  const [novoValor, setNovoValor] = useState(0);
  const [adding, setAdding] = useState(false);

  const fetchSequences = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('oficios_seq')
        .select('*')
        .order('ano', { ascending: false });

      if (err) throw err;
      setSequences(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar sequências de ofícios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSequences();
  }, []);

  const handleUpdateSequence = async (ano: number, valor: number) => {
    setSaving(ano);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('oficios_seq')
        .update({ ultimo_numero: valor, updated_at: new Date().toISOString() })
        .eq('ano', ano);

      if (err) throw err;
      alert(`Sequenciador de ${ano} atualizado com sucesso!`);
      fetchSequences();
    } catch (err: any) {
      setError(err.message || `Erro ao salvar o sequenciador de ${ano}.`);
    } finally {
      setSaving(null);
    }
  };

  const handleAddSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);

    // Validação
    if (sequences.some((s) => s.ano === novoAno)) {
      setError(`O sequenciador para o ano ${novoAno} já está cadastrado.`);
      setAdding(false);
      return;
    }

    try {
      const { error: err } = await supabase
        .from('oficios_seq')
        .insert({ ano: novoAno, ultimo_numero: novoValor });

      if (err) throw err;
      
      alert(`Sequenciador de ${novoAno} adicionado com sucesso!`);
      setNovoAno(new Date().getFullYear());
      setNovoValor(0);
      fetchSequences();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar novo sequenciador.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSequence = async (ano: number) => {
    if (!window.confirm(`Tem certeza de que deseja excluir permanentemente o sequenciador de ${ano}?`)) return;

    setError(null);
    try {
      const { error: err } = await supabase
        .from('oficios_seq')
        .delete()
        .eq('ano', ano);

      if (err) throw err;
      alert(`Sequenciador de ${ano} excluído com sucesso!`);
      fetchSequences();
    } catch (err: any) {
      setError(err.message || `Erro ao excluir o sequenciador de ${ano}.`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          Configuração de Numeração de Ofícios
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie e reinicie os contadores numéricos de ofícios emitidos por ano de exercício
        </p>
      </div>

      {/* Erro Geral */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Coluna 1: Cadastrar Novo Sequenciador (1/3) */}
        <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 h-fit">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-blue-500" />
            Novo Contador Anual
          </h3>

          <form onSubmit={handleAddSequence} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Ano de Exercício
              </label>
              <input
                type="number"
                required
                value={novoAno}
                onChange={(e) => setNovoAno(parseInt(e.target.value))}
                placeholder="Ex: 2026"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Último Número Emitido
              </label>
              <input
                type="number"
                required
                min={0}
                value={novoValor}
                onChange={(e) => setNovoValor(parseInt(e.target.value))}
                placeholder="Ex: 0"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                O próximo ofício criado neste ano será o número subsequente (último + 1).
              </p>
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1E2B58] hover:bg-[#151E3F] disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar Sequenciador
            </button>
          </form>
        </div>

        {/* Coluna 2: Lista de Sequenciadores (2/3) */}
        <div className="md:col-span-2 bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Contadores Cadastrados
            </h3>
            <button
              onClick={fetchSequences}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Recarregar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-slate-500 text-sm">Carregando dados...</p>
            </div>
          ) : sequences.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              Nenhum contador anual cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {sequences.map((seq) => (
                <div key={seq.ano} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white mr-2">Ano {seq.ano}</span>
                    <span className="text-xs text-slate-400 font-medium">
                      Controlador de numeração para o exercício de {seq.ano}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Último número:</span>
                      <input
                        type="number"
                        min={0}
                        defaultValue={seq.ultimo_numero}
                        id={`input-seq-${seq.ano}`}
                        className="w-20 px-2 py-1 text-center border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                      />
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          const inputEl = document.getElementById(`input-seq-${seq.ano}`) as HTMLInputElement;
                          if (inputEl) {
                            handleUpdateSequence(seq.ano, parseInt(inputEl.value));
                          }
                        }}
                        disabled={saving === seq.ano}
                        className="p-2 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        title="Salvar"
                      >
                        {saving === seq.ano ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteSequence(seq.ano)}
                        className="p-2 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        title="Excluir Sequenciador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default ConfigOficiosScreen;
