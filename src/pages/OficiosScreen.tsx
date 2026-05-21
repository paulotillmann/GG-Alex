import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Filter, Printer, Edit2, Trash2, Calendar, Eye, AlertCircle, RefreshCw, CheckCircle, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Oficio } from '../types/oficio';
import OficioForm, { STATUS_STYLES_OFICIO } from '../components/forms/OficioForm';
import OficioPrint from '../components/print/OficioPrint';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const OficiosScreen: React.FC = () => {
  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States de filtros e busca
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // States do Formulário
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedOficio, setSelectedOficio] = useState<Oficio | null>(null);

  // State para o componente de impressão fantasma
  const [oficioToPrint, setOficioToPrint] = useState<Oficio | null>(null);

  // States de Notificação/Exclusão Customizada
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchOficios = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('oficios')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error: err } = await query;
      if (err) throw err;
      setOficios(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar ofícios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOficios();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('oficios')
        .delete()
        .eq('id', id);
      if (err) throw err;
      
      setOficios((prev) => prev.filter((o) => o.id !== id));
      setDeleteId(null);
      showSuccess('Ofício excluído com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir ofício.');
    }
  };

  const handlePrint = (oficio: Oficio) => {
    // Abre a aba/janela standalone de impressão
    const url = `${window.location.origin}${window.location.pathname}?print_oficio=${oficio.id}`;
    window.open(url, '_blank');
  };

  const handleSuccess = (msg: string) => {
    setShowForm(false);
    setSelectedOficio(null);
    fetchOficios();
    showSuccess(msg);
  };

  const generateReport = () => {
    if (filteredOficios.length === 0) {
      alert("Nenhum registro encontrado para gerar o relatório.");
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Filtros
    const filterTexts = [];
    if (search) filterTexts.push(`Busca: "${search}"`);
    if (statusFilter !== 'Todos') filterTexts.push(`Status: ${statusFilter}`);
    if (dataInicio) filterTexts.push(`Início: ${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}`);
    if (dataFim) filterTexts.push(`Fim: ${new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}`);
    const filterString = filterTexts.length > 0 ? `Filtros aplicados - ${filterTexts.join(' | ')}` : 'Nenhum filtro aplicado (Todos os registros)';
    
    // Dados da tabela
    const tableData = filteredOficios.map(o => [
      o.numero || 'Aguardando Numeração',
      new Date(o.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR'),
      `${o.destinatario_nome}${o.destinatario_cargo ? ` (${o.destinatario_cargo})` : ''}`,
      o.solicitante || '-',
      o.assunto || '',
      o.resposta || '-',
      o.status
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Número', 'Data de Emissão', 'Destinatário', 'Solicitante', 'Assunto', 'Resposta', 'Status']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 43, 88], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 32, right: 14, bottom: 20, left: 14 },
      didDrawPage: (data) => {
        // Header de cada página
        doc.setTextColor(0);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("RELAÇÃO DE OFÍCIOS EMITIDOS", 14, 15);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("GABINETE VEREADOR ALEX PEIXOTO", 14, 21);
        
        doc.setFontSize(8);
        doc.text(filterString, 14, 27);

        // Footer de cada página
        let str = `Página ${doc.internal.getNumberOfPages()}`;
        if (typeof doc.putTotalPages === 'function') {
          str = str + ' de {total_pages_count_string}';
        }
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, 14, pageHeight - 10);
      }
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages('{total_pages_count_string}');
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  // Filtragem local
  const filteredOficios = oficios.filter((o) => {
    const textToSearch = `${o.numero || ''} ${o.destinatario_nome} ${o.destinatario_cargo || ''} ${o.assunto} ${o.solicitante || ''} ${o.resposta || ''}`.toLowerCase();
    const matchesSearch = textToSearch.includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'Todos' || o.status === statusFilter;
    
    let matchesDates = true;
    if (dataInicio) {
      matchesDates = matchesDates && o.data_emissao >= dataInicio;
    }
    if (dataFim) {
      matchesDates = matchesDates && o.data_emissao <= dataFim;
    }

    return matchesSearch && matchesStatus && matchesDates;
  });

  if (showForm) {
    return (
      <div className="py-6 px-[30px] w-full max-w-none">
        <OficioForm
          mode={formMode}
          initialData={selectedOficio}
          onClose={() => {
            setShowForm(false);
            setSelectedOficio(null);
          }}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }

  return (
    <div className="py-6 px-[30px] w-full max-w-none space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            Ofícios
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Criação, controle de numeração oficial, emissão de PDF e impressão nativa em formato A4
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={generateReport}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
          >
            <FileDown className="h-4 w-4" />
            Imprimir Relatório
          </button>
          <button
            onClick={() => {
              setFormMode('create');
              setSelectedOficio(null);
              setShowForm(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E2B58] hover:bg-[#151E3F] text-white rounded-lg text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Novo Ofício
          </button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm"
          >
            <CheckCircle className="h-4 w-4 shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid de Filtros */}
      <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
          <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          FILTROS E BUSCA
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Busca por texto */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Buscar por Número, Destinatário ou Assunto
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Digite para buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Filtrar por Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="Todos">Todos os Status</option>
              <option value="ABERTA">Abertas</option>
              <option value="EM ATENDIMENTO">Em Atendimento</option>
              <option value="AGUARDANDO RETORNO">Aguardando Retorno</option>
              <option value="CONCLUÍDA">Concluídas</option>
            </select>
          </div>

          {/* Data Início */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Data de Emissão (Início)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Data Fim */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Data de Emissão (Fim)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-slate-500 text-sm">Carregando ofícios...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3 text-red-500">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchOficios}
              className="mt-2 text-xs font-semibold underline text-blue-600 dark:text-blue-400"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredOficios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 gap-2">
            <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium">Nenhum ofício encontrado.</p>
            <p className="text-xs text-slate-400">Clique em "Novo Ofício" para emitir o primeiro!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Número</th>
                  <th className="py-4 px-6">Data de Emissão</th>
                  <th className="py-4 px-6">Destinatário</th>
                  <th className="py-4 px-6">Solicitante</th>
                  <th className="py-4 px-6">Assunto</th>
                  <th className="py-4 px-6">Resposta</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                {filteredOficios.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                      {o.numero || <span className="text-xs text-amber-500 font-medium">Aguardando Numeração</span>}
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                      {new Date(o.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-900 dark:text-white">{o.destinatario_nome}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{o.destinatario_cargo}</div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900 dark:text-white">
                      {o.solicitante || '-'}
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate" title={o.assunto}>
                      {o.assunto}
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300">
                      {o.resposta || '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES_OFICIO[o.status] ?? ''}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Imprimir */}
                        <button
                          onClick={() => handlePrint(o)}
                          className="p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="Imprimir / Gerar PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {/* Editar */}
                        <button
                          onClick={() => {
                            setSelectedOficio(o);
                            setFormMode('edit');
                            setShowForm(true);
                          }}
                          className="p-1.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {/* Excluir */}
                        <button
                          onClick={() => setDeleteId(o.id)}
                          className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Renderização fantasma oculta do OficioPrint para carregar recursos caso necessário */}
      {oficioToPrint && <OficioPrint oficio={oficioToPrint} />}

      {/* Exclusão Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 text-center"
            >
              <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Excluir Ofício?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Esta ação não pode ser desfeita. Todos os dados deste ofício serão permanentemente excluídos do banco.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Sim, excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default OficiosScreen;
