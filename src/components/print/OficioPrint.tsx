import React from 'react';
import { Oficio } from '../../types/oficio';

interface OficioPrintProps {
  oficio: Oficio | null;
}

const OficioPrint: React.FC<OficioPrintProps> = ({ oficio }) => {
  if (!oficio) return null;

  // Função auxiliar para formatar a data por extenso (Ex: "8 de abril de 2026")
  const formatarDataExtenso = (dataStr: string) => {
    if (!dataStr) return '';
    const data = new Date(dataStr + 'T12:00:00'); // Evita timezone offset
    const dia = data.getDate();
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear();
    return `${dia} de ${mes} de ${ano}`;
  };

  return (
    <div id="printable-oficio" className="hidden print:block bg-white text-black p-10 font-serif max-w-[21cm] mx-auto min-h-[29.7cm] print:min-h-0 print:m-0 print:p-0">

      {/* Número do Ofício */}
      <div className="mb-6 font-bold text-lg uppercase">
        {oficio.numero}
      </div>

      {/* Local e Data */}
      <div className="text-right mb-12">
        Araguari, {formatarDataExtenso(oficio.data_emissao)}.
      </div>

      {/* Destinatário */}
      <div className="mb-10 leading-snug">
        <p>{oficio.destinatario_tratamento}</p>
        <p className="font-bold">{oficio.destinatario_nome}</p>
        <p>{oficio.destinatario_cargo}</p>
      </div>

      {/* Assunto */}
      <div className="mb-10 font-bold">
        Assunto: {oficio.assunto}
      </div>

      {/* Corpo do Ofício */}
      <div 
        className="mb-16 text-justify leading-relaxed quill-print-content whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: (oficio.conteudo || '').replace(/&nbsp;/g, ' ') }}
      />

      {/* Fechamento */}
      <div className="mb-20 text-center sm:text-left ml-0 sm:ml-[10%]">
        Atenciosamente,
      </div>

      {/* Assinatura */}
      <div className="flex flex-col items-center text-center mt-20">
        <div className="w-64 border-t border-black mb-2"></div>
        <p className="font-bold uppercase">{oficio.assinatura_nome}</p>
        <p>{oficio.assinatura_cargo}</p>
      </div>

      <style>{`
        @media print {
          /* Para a impressão nativa, usamos o @page para definir as margens físicas do papel */
          @page {
            margin: 2cm 2cm 2cm 2cm;
          }
          
          html, body {
            background-color: white !important;
          }

          /* Ajustes de estilo pro texto rico do Quill na impressão */
          .quill-print-content p { margin: 0 0 0.35em 0; line-height: 1.45; }
          .quill-print-content h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
          .quill-print-content h2 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
          .quill-print-content h3 { font-size: 1.17em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
          .quill-print-content h4 { font-size: 1em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
          .quill-print-content h5 { font-size: 0.83em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
          .quill-print-content h6 { font-size: 0.67em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
          .quill-print-content strong { font-weight: bold; }
          .quill-print-content em { font-style: italic; }
          .quill-print-content u { text-decoration: underline; }
          .quill-print-content ol { list-style-type: decimal; padding-left: 2em; margin: 0 0 0.35em 0; }
          .quill-print-content ul { list-style-type: disc; padding-left: 2em; margin: 0 0 0.35em 0; }
          
          /* Alinhamentos do Quill */
          .quill-print-content .ql-align-center { text-align: center !important; }
          .quill-print-content .ql-align-right { text-align: right !important; }
          .quill-print-content .ql-align-justify { text-align: justify !important; }
          
          /* Indentações do Quill */
          .quill-print-content .ql-indent-1 { padding-left: 3em !important; }
          .quill-print-content .ql-indent-2 { padding-left: 6em !important; }
          .quill-print-content .ql-indent-3 { padding-left: 9em !important; }
          .quill-print-content .ql-indent-4 { padding-left: 12em !important; }
          .quill-print-content .ql-indent-5 { padding-left: 15em !important; }
          .quill-print-content .ql-indent-6 { padding-left: 18em !important; }
          .quill-print-content .ql-indent-7 { padding-left: 21em !important; }
          .quill-print-content .ql-indent-8 { padding-left: 24em !important; }
          
          /* Tamanhos de Fonte do Quill */
          .quill-print-content .ql-size-small { font-size: 0.75em !important; }
          .quill-print-content .ql-size-large { font-size: 1.5em !important; }
          .quill-print-content .ql-size-huge { font-size: 2.5em !important; }
        }
        
        /* Adicionar as regras também fora do @media print para funcionar na aba nova (view normal) */
        .quill-print-content p { margin: 0 0 0.35em 0; line-height: 1.45; }
        .quill-print-content h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
        .quill-print-content h2 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
        .quill-print-content h3 { font-size: 1.17em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
        .quill-print-content h4 { font-size: 1em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
        .quill-print-content h5 { font-size: 0.83em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
        .quill-print-content h6 { font-size: 0.67em; font-weight: bold; margin: 0.5em 0 0.35em 0; }
        .quill-print-content strong { font-weight: bold; }
        .quill-print-content em { font-style: italic; }
        .quill-print-content u { text-decoration: underline; }
        .quill-print-content ol { list-style-type: decimal; padding-left: 2em; margin: 0 0 0.35em 0; }
        .quill-print-content ul { list-style-type: disc; padding-left: 2em; margin: 0 0 0.35em 0; }
        .quill-print-content .ql-align-center { text-align: center !important; }
        .quill-print-content .ql-align-right { text-align: right !important; }
        .quill-print-content .ql-align-justify { text-align: justify !important; }

        .quill-print-content .ql-indent-1 { padding-left: 3em !important; }
        .quill-print-content .ql-indent-2 { padding-left: 6em !important; }
        .quill-print-content .ql-indent-3 { padding-left: 9em !important; }
        .quill-print-content .ql-indent-4 { padding-left: 12em !important; }
        .quill-print-content .ql-indent-5 { padding-left: 15em !important; }
        .quill-print-content .ql-indent-6 { padding-left: 18em !important; }
        .quill-print-content .ql-indent-7 { padding-left: 21em !important; }
        .quill-print-content .ql-indent-8 { padding-left: 24em !important; }
        
        .quill-print-content .ql-size-small { font-size: 0.75em !important; }
        .quill-print-content .ql-size-large { font-size: 1.5em !important; }
        .quill-print-content .ql-size-huge { font-size: 2.5em !important; }
      `}</style>
    </div>
  );
};

export default OficioPrint;
