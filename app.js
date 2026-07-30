"use strict";

let quillSimples = null;
let quillControle = null;
let modeloAtual = "simples";

const UNIDADES = [
  {
    aliases: ["UPA RIACHO GRANDE"],
    nome: "UPA RIACHO GRANDE",
    endereco: "Rua Marcílio Conrado, nº 333 - Bairro Riacho Grande",
    cidade: "São Bernardo do Campo/SP",
    telefone: "(11) 4357-2356",
    cnes: "6650864"
  },
  {
    aliases: ["UPA RUDGE RAMOS"],
    nome: "UPA RUDGE RAMOS",
    endereco: "Rua Angela Tomé, nº 256 - Bairro Rudge Ramos",
    cidade: "São Bernardo do Campo/SP",
    telefone: "(11) 4368-1222",
    cnes: "7030878"
  },
  {
    aliases: ["UPA BAETA NEVES"],
    nome: "UPA BAETA NEVES",
    endereco: "Rua dos Vianas, nº 933 - Baeta Neves",
    cidade: "São Bernardo do Campo/SP",
    telefone: "(11) 4125-9139",
    cnes: "6844596"
  },
  {
    aliases: ["UPA ALVES DIAS/ASSUNÇÃO", "UPA ALVES DIAS/ASSUNCAO"],
    nome: "UPA ALVES DIAS/ASSUNÇÃO",
    endereco: "Av. Humberto de Alencar Castelo Branco, nº 4220 - Alves Dias",
    cidade: "São Bernardo do Campo/SP",
    telefone: "(11) 4104-4018",
    cnes: "7053835"
  },
  {
    aliases: ["UPA DEMARCHI/BATISTINI", "UPA UPA DEMARCHI/BATISTINI"],
    nome: "UPA DEMARCHI/BATISTINI",
    endereco: "Rua Valdomiro Luís, nº 303 - Demarchi",
    cidade: "São Bernardo do Campo/SP",
    telefone: "(11) 4368-4333",
    cnes: "6535798"
  },
  {
    aliases: ["UPA PAULICEIA/TABOAO", "UPA PAULICÉIA/TABOÃO"],
    nome: "UPA PAULICEIA/TABOAO",
    endereco: "Rua Pedro de Tolêdo, nº 326 - Paulicéia",
    cidade: "São Bernardo do Campo/SP",
    telefone: "",
    cnes: ""
  },
  {
    aliases: ["UPA SAO PEDRO", "UPA SÃO PEDRO"],
    nome: "UPA SAO PEDRO",
    endereco: "Av. Dom Pedro de Alcântara, nº 273 - Montanhão",
    cidade: "São Bernardo do Campo/SP",
    telefone: "",
    cnes: ""
  },
  {
    aliases: ["UPA SILVINA"],
    nome: "UPA SILVINA",
    endereco: "Av. Dr. José Fornari, nº 509 - Ferrazópolis",
    cidade: "São Bernardo do Campo/SP",
    telefone: "",
    cnes: ""
  },
  {
    aliases: ["UPA UNIÃO/ALVARENGA", "UPA UNIAO/ALVARENGA"],
    nome: "UPA UNIÃO/ALVARENGA",
    endereco: "Estrada dos Alvarengas, nº 5779 - Alvarenga",
    cidade: "São Bernardo do Campo/SP",
    telefone: "",
    cnes: ""
  }
];

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function obterParametro(...nomes) {
  const parametros = new URLSearchParams(window.location.search);

  for (const nome of nomes) {
    const valor = parametros.get(nome);

    if (valor !== null && valor !== "") {
      return valor;
    }
  }

  return "";
}

function definirValorSincronizado(grupo, valor) {
  document
    .querySelectorAll(`[data-sync="${grupo}"]`)
    .forEach((elemento) => {
      elemento.value = valor ?? "";
    });
}

function configurarSincronizacaoDosCampos() {
  document.addEventListener("input", (evento) => {
    const origem = evento.target.closest("[data-sync]");

    if (!origem) return;

    const grupo = origem.dataset.sync;

    document
      .querySelectorAll(`[data-sync="${grupo}"]`)
      .forEach((destino) => {
        if (destino !== origem) {
          destino.value = origem.value;
        }
      });
  });
}

function localizarUnidade(nomeInformado) {
  const chave = normalizarTexto(nomeInformado);

  const unidade = UNIDADES.find((item) =>
    item.aliases.some((alias) => normalizarTexto(alias) === chave)
  );

  return unidade || UNIDADES[0];
}

function determinarModeloPeloGet() {
  const modelo = normalizarTexto(
    obterParametro("modelo", "tipo_receita", "receita")
  );

  const vias = normalizarTexto(
    obterParametro("vias", "numero_vias")
  );

  if (
    modelo === "CONTROLE" ||
    modelo === "CONTROLE ESPECIAL" ||
    modelo === "CONTROLE-ESPECIAL" ||
    modelo === "2 VIAS" ||
    modelo === "2VIAS" ||
    vias === "2"
  ) {
    return "controle-especial";
  }

  return "simples";
}

function dataAtualISO() {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo"
  });
}

function registrarFormatosQuill() {
  const Font = Quill.import("formats/font");

  Font.whitelist = [
    "sans-serif",
    "serif",
    "monospace",
    "verdana"
  ];

  Quill.register(Font, true);

  /*
   * Quebra suave real:
   * gera <br class="ql-soft-break"> dentro do mesmo bloco ou <li>.
   */
  const Embed = Quill.import("blots/embed");

  class SoftBreakBlot extends Embed {
    static blotName = "softbreak";
    static tagName = "BR";
    static className = "ql-soft-break";
  }

  Quill.register(SoftBreakBlot, true);
}

function inserirQuebraSuave(quill, range) {
  if (!quill || !range) return;

  /*
   * Se houver texto selecionado, substitui a seleção pela quebra.
   */
  if (range.length > 0) {
    quill.deleteText(
      range.index,
      range.length,
      Quill.sources.USER
    );
  }

  quill.insertEmbed(
    range.index,
    "softbreak",
    true,
    Quill.sources.USER
  );

  quill.setSelection(
    range.index + 1,
    0,
    Quill.sources.SILENT
  );
}

/*
 * O listener usa a fase de captura para impedir que o Enter padrão
 * do Quill seja executado antes da quebra suave.
 *
 * Assim, Shift+Enter não cria um novo <li>.
 */
function instalarShiftEnter(quill) {
  quill.root.addEventListener(
    "keydown",
    (evento) => {
      const teclaEnter =
        evento.key === "Enter" ||
        evento.keyCode === 13;

      if (
        !teclaEnter ||
        !evento.shiftKey ||
        evento.ctrlKey ||
        evento.altKey ||
        evento.metaKey ||
        evento.isComposing
      ) {
        return;
      }

      evento.preventDefault();
      evento.stopPropagation();
      evento.stopImmediatePropagation();

      const range = quill.getSelection(true);

      inserirQuebraSuave(
        quill,
        range
      );
    },
    true
  );
}

function criarEditor(seletorEditor, seletorToolbar) {
  const quill = new Quill(seletorEditor, {
    theme: "snow",
    placeholder: "Clique ou toque aqui para inserir o texto.",
    modules: {
      toolbar: seletorToolbar,

      /*
       * Também registra o atalho no módulo Keyboard durante
       * a inicialização. O listener de captura acima funciona como
       * garantia adicional nos navegadores em que o Enter padrão
       * tem precedência.
       */
      keyboard: {
        bindings: {
          softBreak: {
            key: 13,
            shiftKey: true,
            handler(range) {
              inserirQuebraSuave(
                this.quill,
                range
              );

              return false;
            }
          }
        }
      }
    }
  });

  instalarShiftEnter(quill);

  return quill;
}

function editorAtual() {
  return modeloAtual === "controle-especial"
    ? quillControle
    : quillSimples;
}

function obterMedicamentos() {
  try {
    const salvo = localStorage.getItem("medicamentos");

    if (salvo) {
      const listaLocal = JSON.parse(salvo);

      if (Array.isArray(listaLocal) && listaLocal.length > 0) {
        return listaLocal;
      }
    }
  } catch (erro) {
    console.warn(
      "localStorage.medicamentos inválido. Usando medicamentos.json.",
      erro
    );
  }

  return Array.isArray(window.medicamentos)
    ? window.medicamentos
    : [];
}

function preencherSelectMedicamentos() {
  const select = document.getElementById("medicamentos");
  const medicamentos = obterMedicamentos();

  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "ADICIONAR MEDICAMENTO";
  placeholder.selected = true;
  select.appendChild(placeholder);

  medicamentos.forEach((medicamento, indice) => {
    const option = document.createElement("option");

    option.value = String(indice);

    option.textContent =
      medicamento.nome ||
      medicamento.descricao ||
      `Medicamento ${indice + 1}`;

    option.dataset.descricao =
      medicamento.descricao ||
      medicamento.nome ||
      "";

    option.dataset.posologia =
      medicamento.posologia ||
      "";

    select.appendChild(option);
  });

  const status = document.getElementById("status_medicamentos");

  if (medicamentos.length > 0) {
    select.disabled = false;
    status.textContent =
      `${medicamentos.length} medicamento(s) carregado(s).`;
  } else {
    select.disabled = true;
    status.textContent =
      "Nenhum medicamento foi encontrado em medicamentos.json.";
  }
}

function adicionarMedicamento() {
  const select = document.getElementById("medicamentos");
  const option = select.selectedOptions[0];

  if (!option || option.value === "") return;

  const descricao = option.dataset.descricao?.trim() || "";
  const posologia = option.dataset.posologia?.trim() || "";
  const quill = editorAtual();

  if (!quill || !descricao) {
    select.value = "";
    select.focus();
    return;
  }

  const Delta = Quill.import("delta");
  const indice = Math.max(0, quill.getLength() - 1);

  let delta = new Delta()
    .retain(indice)
    .insert(descricao, { bold: true });

  if (posologia) {
    /*
     * Um único <br> depois da descrição.
     * A posologia permanece no mesmo <li>.
     */
    delta = delta
      .insert({ softbreak: true })
      .insert(posologia);
  }

  delta = delta.insert(
    "\n",
    { list: "ordered" }
  );

  quill.updateContents(
    delta,
    Quill.sources.USER
  );

  quill.setSelection(
    Math.max(0, quill.getLength() - 1),
    0,
    Quill.sources.SILENT
  );

  select.value = "";
  select.focus();
}

function limparPrescricao() {
  const quill = editorAtual();

  if (quill) {
    quill.setContents([]);
  }

  document.getElementById("medicamentos").focus();
}

function alterarModelo() {
  modeloAtual =
    document.getElementById("modelo_receita").value;

  const simples =
    document.getElementById("modelo_simples");

  const controle =
    document.getElementById("modelo_controle");

  if (modeloAtual === "controle-especial") {
    simples.hidden = true;
    controle.hidden = false;
  } else {
    simples.hidden = false;
    controle.hidden = true;
  }
}

function preencherDadosPeloGet() {
  const unidadeInformada =
    obterParametro("unidade", "unidade_nome");

  const unidade =
    localizarUnidade(
      unidadeInformada || "UPA RIACHO GRANDE"
    );

  const nomeUnidade =
    obterParametro("unidade_nome") ||
    unidade.nome;

  const enderecoUnidade =
    obterParametro(
      "unidade_endereco",
      "endereco_unidade"
    ) ||
    unidade.endereco;

  const cidadeUnidade =
    obterParametro(
      "unidade_cidade",
      "cidade_unidade"
    ) ||
    unidade.cidade;

  const telefoneUnidade =
    obterParametro(
      "unidade_telefone",
      "telefone_unidade"
    ) ||
    unidade.telefone;

  const cnes =
    obterParametro("cnes", "unidade_cnes") ||
    unidade.cnes;

  const data =
    obterParametro("data", "data_emissao") ||
    dataAtualISO();

  definirValorSincronizado(
    "paciente-nome",
    obterParametro(
      "nome",
      "nome_paciente",
      "paciente"
    )
  );

  definirValorSincronizado(
    "paciente-id",
    obterParametro(
      "id",
      "hygia",
      "id_paciente"
    )
  );

  definirValorSincronizado(
    "paciente-cpf",
    obterParametro(
      "cpf",
      "cpf_paciente"
    )
  );

  definirValorSincronizado(
    "paciente-endereco",
    obterParametro(
      "endereco",
      "endereco_paciente",
      "paciente_endereco"
    )
  );

  definirValorSincronizado(
    "emitente-nome",
    obterParametro(
      "medico",
      "prescritor",
      "emitente",
      "nome_medico",
      "emitente_nome"
    )
  );

  definirValorSincronizado(
    "emitente-crm",
    obterParametro(
      "crm",
      "crm_uf",
      "emitente_crm"
    )
  );

  definirValorSincronizado(
    "unidade-endereco",
    enderecoUnidade
  );

  definirValorSincronizado(
    "unidade-cidade",
    cidadeUnidade
  );

  definirValorSincronizado(
    "unidade-telefone",
    telefoneUnidade
  );

  definirValorSincronizado(
    "data-emissao",
    data
  );

  definirValorSincronizado(
    "comprador-nome",
    obterParametro("comprador_nome")
  );

  definirValorSincronizado(
    "comprador-cpf",
    obterParametro("comprador_cpf")
  );

  definirValorSincronizado(
    "comprador-endereco",
    obterParametro("comprador_endereco")
  );

  definirValorSincronizado(
    "comprador-cidade",
    obterParametro("comprador_cidade")
  );

  definirValorSincronizado(
    "comprador-telefone",
    obterParametro("comprador_telefone")
  );

  definirValorSincronizado(
    "dispensador-nome",
    obterParametro("dispensador_nome")
  );

  definirValorSincronizado(
    "dispensador-documento",
    obterParametro(
      "dispensador_documento",
      "dispensador_cnes"
    )
  );

  definirValorSincronizado(
    "dispensador-data",
    obterParametro("dispensador_data")
  );

  definirValorSincronizado(
    "dispensador-assinatura",
    obterParametro("dispensador_assinatura")
  );

  document.getElementById(
    "unidade_nome"
  ).textContent = nomeUnidade;

  document.getElementById(
    "unidade_endereco"
  ).textContent = enderecoUnidade;

  document.getElementById(
    "controle_unidade_nome"
  ).textContent = nomeUnidade;

  document.getElementById(
    "controle_unidade_endereco"
  ).textContent = enderecoUnidade;

  document.getElementById(
    "controle_cnes"
  ).textContent = cnes;
}

function copiarValoresDosCampos(origem, destino) {
  const camposOrigem =
    origem.querySelectorAll("input, textarea, select");

  const camposDestino =
    destino.querySelectorAll("input, textarea, select");

  camposOrigem.forEach((campo, indice) => {
    const campoClonado = camposDestino[indice];

    if (!campoClonado) return;

    if (
      campo.type === "checkbox" ||
      campo.type === "radio"
    ) {
      campoClonado.checked = campo.checked;
    } else {
      campoClonado.value = campo.value;
    }
  });
}

function removerSegundaVia() {
  document
    .getElementById("controle_page2")
    ?.remove();
}

function prepararImpressao() {
  removerSegundaVia();

  if (modeloAtual !== "controle-especial") {
    return;
  }

  const pagina1 =
    document.getElementById("controle_page1");

  const pagina2 =
    pagina1.cloneNode(true);

  pagina2.id = "controle_page2";

  const via1 =
    pagina1.querySelector(".identificacao-via");

  const via2 =
    pagina2.querySelector(".identificacao-via");

  if (via1) {
    via1.textContent = "1ª VIA FARMÁCIA";
  }

  if (via2) {
    via2.textContent = "2ª VIA PACIENTE";
  }

  copiarValoresDosCampos(
    pagina1,
    pagina2
  );

  const editorOriginal =
    pagina1.querySelector(".ql-editor");

  const editorClonado =
    pagina2.querySelector(".ql-editor");

  if (editorOriginal && editorClonado) {
    editorClonado.innerHTML =
      editorOriginal.innerHTML;
  }

  document
    .getElementById("modelo_controle")
    .appendChild(pagina2);
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (typeof Quill === "undefined") {
      document.getElementById(
        "status_medicamentos"
      ).textContent =
        "Não foi possível carregar o Quill. Verifique a conexão com a internet.";

      return;
    }

    registrarFormatosQuill();

    quillSimples = criarEditor(
      "#texto_simples",
      "#toolbar_simples"
    );

    quillControle = criarEditor(
      "#texto_controle",
      "#toolbar_controle"
    );

    configurarSincronizacaoDosCampos();
    preencherDadosPeloGet();
    preencherSelectMedicamentos();

    modeloAtual =
      determinarModeloPeloGet();

    document.getElementById(
      "modelo_receita"
    ).value = modeloAtual;

    alterarModelo();

    document
      .getElementById("modelo_receita")
      .addEventListener(
        "change",
        alterarModelo
      );

    document
      .getElementById("medicamentos")
      .addEventListener(
        "change",
        adicionarMedicamento
      );

    document
      .getElementById("btn_limpar")
      .addEventListener(
        "click",
        limparPrescricao
      );

    document
      .getElementById("btn_imprimir")
      .addEventListener(
        "click",
        () => window.print()
      );

    window.addEventListener(
      "beforeprint",
      prepararImpressao
    );

    window.addEventListener(
      "afterprint",
      removerSegundaVia
    );
  }
);
