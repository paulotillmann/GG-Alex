export interface Oficio {
  id: string;
  numero: string;
  data_emissao: string;
  destinatario_tratamento: string;
  destinatario_nome: string;
  destinatario_cargo: string;
  assunto: string;
  conteudo: string;
  assinatura_nome: string;
  assinatura_cargo: string;
  status: 'Rascunho' | 'Emitido' | 'Cancelado';
  created_at: string;
  updated_at: string;
  created_by?: string;
}
