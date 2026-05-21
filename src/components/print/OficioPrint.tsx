import React from 'react';
import { Oficio } from '../../types/oficio';
import logoCamara from '../../assets/logos/logo_camaramunicipal-oficial.png';

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

      {/* Cabeçalho Oficial */}
      <div className="flex flex-col items-center text-center mb-10">
        <img 
          src={logoCamara} 
          alt="Brasão Câmara Municipal" 
          className="h-28 w-auto object-contain mb-3" 
        />
        <h2 className="text-base font-bold tracking-wide text-black uppercase font-serif">
          Câmara Municipal de Araguari
        </h2>
        <p className="text-xs font-bold tracking-widest text-black uppercase font-serif mt-0.5">
          Minas Gerais
        </p>
      </div>

      {/* Local e Data */}
      <div className="text-right mb-8 text-sm">
        Araguari, {formatarDataExtenso(oficio.data_emissao)}
      </div>

      {/* Informações de Controle (Ofício, Assunto, Órgão) */}
      <div className="mb-10 text-sm leading-relaxed">
        <p><strong>Ofício:</strong> {oficio.numero || '___/___'}</p>
        <p><strong>Assunto:</strong> {oficio.assunto}</p>
        <p><strong>Órgão:</strong> Gabinete do Vereador Alex Peixoto</p>
      </div>

      {/* Destinatário */}
      {(oficio.destinatario_nome || oficio.destinatario_cargo) && (
        <div className="mb-8 leading-snug text-sm">
          <p className="font-bold">{oficio.destinatario_nome}</p>
          <p>{oficio.destinatario_cargo}</p>
        </div>
      )}

      {oficio.destinatario_tratamento && (
        <div className="mb-8 text-sm">
          <p>{oficio.destinatario_tratamento},</p>
        </div>
      )}

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
