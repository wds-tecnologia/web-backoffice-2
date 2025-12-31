// Este arquivo é usado para configurar o Handsontable no lado do cliente
// Ele será importado dinamicamente apenas quando necessário

import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";

// Registra todos os módulos do Handsontable
registerAllModules();

export default function setupHandsontable() {
  // Função auxiliar para configuração adicional se necessário
  return true;
}
