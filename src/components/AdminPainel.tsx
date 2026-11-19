import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, BarChart3, Users, Crown, CreditCard, Cpu, Settings, Receipt, Loader2,
  Plus, Trash2, Pencil, Check, X, KeyRound, ShieldCheck, RefreshCw, LogOut
} from "lucide-react";
import { User } from "../types";
import { apiFetch } from "../utils/supabaseSync";

/**
 * Área admin do Meu Barão.
 *
 * Entra quem estiver logado com um e-mail de ADMIN_EMAILS (variável da
 * Vercel) ou quem souber a ADMIN_PASSWORD. A senha fica só nesta aba do
 * navegador (sessionStorage) e some ao fechar.
 */

type Aba = "resumo" | "usuarias" | "planos" | "pagamento" | "ia" | "geral" | "assinaturas";

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  periodoDias: number;
  tokens: number;
  mensagensPorDia: number;
  nivel: "free" | "premium" | "elite";
  beneficios: string[];
  destaque: boolean;
  ativo: boolean;
  ordem: number;
}

interface ConfigPainel {
  manutencao: boolean;
  mensagemManutencao: string;
  promptSistema: string | null;
  promptPadrao: string;
  planos: Plano[];
  pagamento: {
    ativo: boolean;
    modo: "teste" | "producao";
    publicKey: string;
    nomeNaFatura: string;
    accessToken: string | null;
    webhookSecretConfigurado: boolean;
  };
  ia: {
    chaves: Record<string, { origem: "painel" | "ambiente" | "nenhuma"; mascara: string | null }>;
    ajustes: Record<string, { painel: string; ambiente: string }>;
  };
  limites: { chat: number; voz: number; imagem: number; musica: number; upload: number };
  suporte: { email: string; whatsapp: string };
  atualizadoEm: string | null;
  atualizadoPor: string | null;
  ambiente: { configSecret: boolean; adminEmails: number; appUrl: string | null };
}

const NOMES_CHAVES: Record<string, { nome: string; uso: string }> = {
  DEEPSEEK_API_KEY: { nome: "DeepSeek", uso: "Conversa do Barão, legendas e prompts das fotos" },
  GEMINI_API_KEY: { nome: "Google Gemini", uso: "Diário, meditação, letras de música e visão das fotos" },
  ELEVENLABS_API_KEY: { nome: "ElevenLabs", uso: "Voz do Barão" },
  KIE_API_KEY: { nome: "kie.ai", uso: "Fotos (nano-banana) e canções (Suno)" },
  AZURE_SPEECH_KEY: { nome: "Azure Speech", uso: "Voz reserva (não usada no chat hoje)" }
};

const NOMES_AJUSTES: Record<string, string> = {
  DEEPSEEK_MODEL: "Modelo DeepSeek (ex.: deepseek-chat)",
  ELEVENLABS_VOICE_ID: "ID da voz do Barão na ElevenLabs",
  ELEVENLABS_MODEL: "Modelo ElevenLabs (ex.: eleven_multilingual_v2)",
  SUNO_MODEL: "Modelo Suno (ex.: V5)",
  VISION_MODEL: "Modelo de visão Gemini",
  AZURE_SPEECH_REGION: "Região Azure",
  AZURE_TTS_VOICE: "Voz Azure"
};

const SENHA_KEY = "mb_admin_senha_sessao";

function lerSenha(): string {
  try {
    return sessionStorage.getItem(SENHA_KEY) || "";
  } catch {
    return "";
  }
}

async function chamar(caminho: string, init: RequestInit = {}) {
  const senha = lerSenha();
  const res = await apiFetch(caminho, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), ...(senha ? { "x-admin-senha": senha } : {}) }
  });
  const dados = await res.json().catch(() => null);
  if (!res.ok) throw new Error(dados?.error || `Erro ${res.status}`);
  return dados;
}

const campo =
  "w-full bg-black/60 border border-white/10 rounded-sm px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-barao-gold/60 focus:outline-none";
const rotulo = "block font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-1";
const botao =
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-sm font-mono text-xs uppercase tracking-wider transition disabled:opacity-50";
const botaoPrimario = `${botao} bg-barao-gold text-black font-bold hover:bg-barao-rose`;
const botaoSecundario = `${botao} border border-white/15 text-zinc-200 hover:border-barao-gold/60 hover:text-white`;
const cartao = "bg-[#0b0a0a]/90 border border-white/10 rounded-sm p-5";

function precoBR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  currentUser: User | null;
  onPromptAuth: () => void;
  onBack: () => void;
}

export default function AdminPainel({ currentUser, onPromptAuth, onBack }: Props) {
  const [sessao, setSessao] = useState<{ admin: boolean; configurado: boolean; email: string | null } | null>(null);
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("resumo");
  const [config, setConfig] = useState<ConfigPainel | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const conferirSessao = useCallback(async () => {
    try {
      const s = await chamar("/api/admin/sessao");
      setSessao(s);
      return s;
    } catch {
      setSessao({ admin: false, configurado: true, email: null });
      return null;
    }
  }, []);

  const carregarConfig = useCallback(async () => {
    try {
      setConfig(await chamar("/api/admin/config"));
    } catch (e: any) {
      setAviso({ tipo: "erro", texto: e.message });
    }
  }, []);

  useEffect(() => {
    conferirSessao();
  }, [conferirSessao, currentUser?.id]);

  useEffect(() => {
    if (sessao?.admin) carregarConfig();
  }, [sessao?.admin, carregarConfig]);

  const mostrar = (tipo: "ok" | "erro", texto: string) => {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(null), 5000);
  };

  // Salva uma parte da configuração e recarrega o painel com a resposta
  const salvar = async (caminho: string, corpo: unknown, metodo = "PUT", mensagem = "Salvo.") => {
    setSalvando(true);
    try {
      const dados = await chamar(caminho, { method: metodo, body: JSON.stringify(corpo) });
      if (dados?.planos) setConfig(dados);
      mostrar("ok", dados?.assinantesAtivos ? `${mensagem} ${dados.assinantesAtivos} assinante(s) seguem com acesso até o fim do período.` : mensagem);
      return true;
    } catch (e: any) {
      mostrar("erro", e.message);
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const entrarComSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin(null);
    try {
      sessionStorage.setItem(SENHA_KEY, senha);
    } catch {}
    const s = await conferirSessao();
    if (!s?.admin) {
      try {
        sessionStorage.removeItem(SENHA_KEY);
      } catch {}
      setErroLogin("Senha incorreta.");
    }
    setSenha("");
  };

  const sair = () => {
    try {
      sessionStorage.removeItem(SENHA_KEY);
    } catch {}
    setConfig(null);
    conferirSessao();
  };

  // ---------- Telas de acesso ----------

  if (!sessao) {
    return (
      <div className="flex justify-center py-24 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!sessao.admin) {
    return (
      <div className="max-w-md mx-auto py-12 text-left space-y-6">
        <button onClick={onBack} className={botaoSecundario}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </button>
        <div className={`${cartao} space-y-5`}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-barao-gold" />
            <h1 className="font-serif text-2xl text-white">Área admin</h1>
          </div>
          {!sessao.configurado ? (
            <p className="text-sm text-zinc-300 leading-relaxed">
              A área admin está desligada. Na Vercel, cadastre a variável <code className="text-barao-gold">ADMIN_EMAILS</code> com
              o seu e-mail (e, se quiser, <code className="text-barao-gold">ADMIN_PASSWORD</code> com 12 caracteres ou mais) e
              publique de novo.
            </p>
          ) : (
            <>
              <p className="text-sm text-zinc-300">
                {currentUser
                  ? `Você está logada como ${currentUser.email}, que não está na lista de administradores.`
                  : "Entre com a sua conta de administradora."}
              </p>
              {!currentUser && (
                <button onClick={onPromptAuth} className={`${botaoPrimario} w-full`}>
                  Entrar com a conta
                </button>
              )}
              <form onSubmit={entrarComSenha} className="space-y-3 pt-2 border-t border-white/5">
                <label className={rotulo} htmlFor="admin-senha">
                  Ou use a senha de administrador
                </label>
                <input
                  id="admin-senha"
                  type="password"
                  autoComplete="current-password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className={campo}
                />
                {erroLogin && <p className="text-sm text-red-300">{erroLogin}</p>}
                <button type="submit" disabled={!senha} className={`${botaoSecundario} w-full`}>
                  <KeyRound className="h-4 w-4" /> Entrar com senha
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- Painel ----------

  const abas: { id: Aba; nome: string; icone: React.ReactNode }[] = [
    { id: "resumo", nome: "Resumo", icone: <BarChart3 className="h-4 w-4" /> },
    { id: "usuarias", nome: "Usuárias", icone: <Users className="h-4 w-4" /> },
    { id: "planos", nome: "Planos", icone: <Crown className="h-4 w-4" /> },
    { id: "pagamento", nome: "Mercado Pago", icone: <CreditCard className="h-4 w-4" /> },
    { id: "ia", nome: "Serviços de IA", icone: <Cpu className="h-4 w-4" /> },
    { id: "geral", nome: "Geral", icone: <Settings className="h-4 w-4" /> },
    { id: "assinaturas", nome: "Assinaturas", icone: <Receipt className="h-4 w-4" /> }
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 text-left space-y-6 px-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-white">Painel do Meu Barão</h1>
          <p className="font-mono text-[11px] text-zinc-400 mt-1">
            {sessao.email === "senha-admin" ? "Entrou com a senha de admin" : `Admin: ${sessao.email}`}
            {config?.atualizadoEm &&
              ` · última alteração ${new Date(config.atualizadoEm).toLocaleString("pt-BR")} por ${config.atualizadoPor}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className={botaoSecundario}>
            <ArrowLeft className="h-4 w-4" /> Site
          </button>
          {sessao.email === "senha-admin" && (
            <button onClick={sair} className={botaoSecundario}>
              <LogOut className="h-4 w-4" /> Sair
            </button>
          )}
        </div>
      </div>

      {config && !config.ambiente.configSecret && (
        <div className="border border-amber-400/40 bg-amber-400/5 text-amber-200 text-sm rounded-sm p-3">
          Recomendado: cadastre <code>CONFIG_SECRET</code> na Vercel (um texto aleatório longo). Sem ela, os segredos salvos aqui são
          cifrados com a chave do Supabase e precisam ser cadastrados de novo se essa chave mudar.
        </div>
      )}

      {aviso && (
        <div
          role="status"
          className={`text-sm rounded-sm p-3 border ${
            aviso.tipo === "ok" ? "border-barao-gold/50 text-barao-gold bg-barao-gold/5" : "border-red-400/50 text-red-300 bg-red-400/5"
          }`}
        >
          {aviso.texto}
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Seções do painel">
        {abas.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`${botao} shrink-0 ${
              aba === a.id ? "bg-barao-rose text-black font-bold" : "border border-white/10 text-zinc-300 hover:text-white"
            }`}
          >
            {a.icone}
            {a.nome}
          </button>
        ))}
      </nav>

      {!config ? (
        <div className="flex justify-center py-16 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {aba === "resumo" && <AbaResumo />}
          {aba === "usuarias" && <AbaUsuarias planos={config.planos} mostrar={mostrar} />}
          {aba === "planos" && <AbaPlanos planos={config.planos} salvar={salvar} salvando={salvando} />}
          {aba === "pagamento" && <AbaPagamento config={config} salvar={salvar} salvando={salvando} mostrar={mostrar} />}
          {aba === "ia" && <AbaIa config={config} salvar={salvar} salvando={salvando} />}
          {aba === "geral" && <AbaGeral config={config} salvar={salvar} salvando={salvando} />}
          {aba === "assinaturas" && <AbaAssinaturas />}
        </>
      )}
    </div>
  );
}

// ---------- Resumo ----------

function AbaResumo() {
  const [dados, setDados] = useState<any>(null);
  const [saude, setSaude] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    chamar("/api/admin/resumo").then(setDados).catch(e => setErro(e.message));
    chamar("/api/admin/saude").then(setSaude).catch(() => {});
  }, []);

  if (erro) return <p className="text-red-300">{erro}</p>;
  if (!dados) return <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />;

  const itens = [
    ["Usuárias", dados.totalUsuarios],
    ["Novas (7 dias)", dados.novos7d],
    ["Assinaturas ativas", dados.assinantes],
    ["Conversas", dados.totalConversas],
    ["Mensagens", dados.totalMensagens],
    ["Canções", dados.totalCancoes]
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {itens.map(([nome, valor]) => (
          <div key={nome} className={cartao}>
            <span className={rotulo}>{nome}</span>
            <span className="font-serif text-3xl text-barao-gold">{Number(valor).toLocaleString("pt-BR")}</span>
          </div>
        ))}
      </div>
      {saude && (
        <div className={cartao}>
          <h2 className="font-serif text-lg text-white mb-3">Saúde dos serviços</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              ["Banco de dados", saude.database === "ok"],
              ["Autenticação Supabase", saude.supabaseAuth === "ok"],
              ["DeepSeek", saude.deepseekKeyConfigured],
              ["Gemini", saude.geminiKeyConfigured],
              ["ElevenLabs", saude.elevenLabsKeyConfigured],
              ["kie.ai", saude.kieKeyConfigured]
            ].map(([nome, ok]) => (
              <li key={String(nome)} className="flex items-center gap-2 text-zinc-300">
                {ok ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-red-400" />}
                {nome}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------- Usuárias ----------

function AbaUsuarias({ planos, mostrar }: { planos: Plano[]; mostrar: (t: "ok" | "erro", m: string) => void }) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<any[] | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [planoEscolhido, setPlanoEscolhido] = useState("premium");
  const [dias, setDias] = useState(30);

  const carregar = useCallback(async () => {
    setLista(null);
    try {
      const dados = await chamar(`/api/admin/usuarios?pagina=${pagina}&busca=${encodeURIComponent(busca)}`);
      setLista(dados.usuarios);
    } catch (e: any) {
      mostrar("erro", e.message);
      setLista([]);
    }
  }, [pagina, busca, mostrar]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  const concederPlano = async (id: number) => {
    try {
      await chamar(`/api/admin/usuarios/${id}/plano`, { method: "POST", body: JSON.stringify({ planoId: planoEscolhido, dias }) });
      mostrar("ok", planoEscolhido === "free" ? "Plano cancelado." : "Plano concedido.");
      setEditando(null);
      carregar();
    } catch (e: any) {
      mostrar("erro", e.message);
    }
  };

  const nomeDoPlano = (id: string) => planos.find(p => p.id === id)?.nome || id;

  return (
    <div className="space-y-4">
      <form
        onSubmit={e => {
          e.preventDefault();
          setPagina(1);
          carregar();
        }}
        className="flex gap-2"
      >
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail"
          className={campo}
          aria-label="Buscar usuária"
        />
        <button type="submit" className={botaoSecundario}>
          Buscar
        </button>
      </form>

      {!lista ? (
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      ) : lista.length === 0 ? (
        <p className="text-zinc-400 text-sm">Ninguém encontrado.</p>
      ) : (
        <div className="space-y-2">
          {lista.map(u => (
            <div key={u.id} className={`${cartao} !p-4 space-y-3`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-white">{u.nome}</p>
                  <p className="text-xs text-zinc-400">
                    {u.email} · desde {u.criadoEm ? new Date(u.criadoEm).toLocaleDateString("pt-BR") : "?"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-barao-gold">
                    {nomeDoPlano(u.plano.planoId)}
                    {u.plano.ate && ` até ${new Date(u.plano.ate).toLocaleDateString("pt-BR")}`}
                  </p>
                  <p className="font-mono text-[11px] text-zinc-500">
                    {u.plano.origem === "mp" ? "pago no Mercado Pago" : u.plano.origem === "manual" ? "concedido no painel" : "grátis"} ·{" "}
                    {(u.tokens ?? 0).toLocaleString("pt-BR")} créditos
                  </p>
                </div>
                <button onClick={() => setEditando(editando === u.id ? null : u.id)} className={botaoSecundario}>
                  <Pencil className="h-4 w-4" /> Plano
                </button>
              </div>
              {editando === u.id && (
                <div className="flex flex-wrap items-end gap-3 border-t border-white/5 pt-3">
                  <div>
                    <label className={rotulo}>Plano</label>
                    <select value={planoEscolhido} onChange={e => setPlanoEscolhido(e.target.value)} className={campo}>
                      {planos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                          {p.id === "free" ? " (cancela o atual)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {planoEscolhido !== "free" && (
                    <div>
                      <label className={rotulo}>Dias</label>
                      <input type="number" min={1} value={dias} onChange={e => setDias(Number(e.target.value))} className={`${campo} w-24`} />
                    </div>
                  )}
                  <button onClick={() => concederPlano(u.id)} className={botaoPrimario}>
                    Confirmar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)} className={botaoSecundario}>
          Anterior
        </button>
        <span className="font-mono text-xs text-zinc-400 self-center">Página {pagina}</span>
        <button disabled={(lista?.length || 0) < 25} onClick={() => setPagina(p => p + 1)} className={botaoSecundario}>
          Próxima
        </button>
      </div>
    </div>
  );
}

// ---------- Planos ----------

const PLANO_VAZIO: Plano = {
  id: "",
  nome: "",
  descricao: "",
  preco: 0,
  periodoDias: 30,
  tokens: 1000,
  mensagensPorDia: 50,
  nivel: "premium",
  beneficios: [],
  destaque: false,
  ativo: true,
  ordem: 10
};

function AbaPlanos({
  planos,
  salvar,
  salvando
}: {
  planos: Plano[];
  salvar: (c: string, b: unknown, m?: string, msg?: string) => Promise<boolean>;
  salvando: boolean;
}) {
  const [editando, setEditando] = useState<{ plano: Plano; novo: boolean } | null>(null);

  const apagar = async (p: Plano) => {
    if (!window.confirm(`Apagar o plano "${p.nome}"? Quem já pagou continua com acesso até o fim do período.`)) return;
    await salvar(`/api/admin/planos/${p.id}`, {}, "DELETE", "Plano apagado.");
  };

  if (editando) {
    return (
      <FormPlano
        inicial={editando.plano}
        novo={editando.novo}
        salvando={salvando}
        onCancelar={() => setEditando(null)}
        onSalvar={async plano => {
          const ok = editando.novo
            ? await salvar("/api/admin/planos", plano, "POST", "Plano criado.")
            : await salvar(`/api/admin/planos/${plano.id}`, plano, "PUT", "Plano atualizado.");
          if (ok) setEditando(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-400">Os planos ativos aparecem na tela Evolução. O preço vale para novas compras.</p>
        <button onClick={() => setEditando({ plano: { ...PLANO_VAZIO }, novo: true })} className={botaoPrimario}>
          <Plus className="h-4 w-4" /> Novo plano
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {planos.map(p => (
          <div key={p.id} className={`${cartao} space-y-2 ${p.ativo ? "" : "opacity-60"}`}>
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg text-white">
                  {p.nome} {p.destaque && <span className="text-barao-rose text-xs">★ destaque</span>}
                </h3>
                <p className="font-mono text-[11px] text-zinc-500">
                  código {p.id} · nível {p.nivel} {p.ativo ? "" : "· oculto"}
                </p>
              </div>
              <span className="font-serif text-xl text-barao-gold">{p.preco === 0 ? "Grátis" : precoBR(p.preco)}</span>
            </div>
            <p className="text-sm text-zinc-400">{p.descricao}</p>
            <p className="font-mono text-[11px] text-zinc-400">
              {p.periodoDias ? `${p.periodoDias} dias` : "sem prazo"} · {p.tokens.toLocaleString("pt-BR")} créditos ·{" "}
              {p.mensagensPorDia ? `${p.mensagensPorDia} msg/dia` : "msg sem limite"}
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditando({ plano: { ...p, beneficios: [...p.beneficios] }, novo: false })} className={botaoSecundario}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
              {p.id !== "free" && (
                <button onClick={() => apagar(p)} disabled={salvando} className={`${botaoSecundario} hover:!border-red-400 hover:!text-red-300`}>
                  <Trash2 className="h-4 w-4" /> Apagar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormPlano({
  inicial,
  novo,
  salvando,
  onCancelar,
  onSalvar
}: {
  inicial: Plano;
  novo: boolean;
  salvando: boolean;
  onCancelar: () => void;
  onSalvar: (p: Plano) => void;
}) {
  const [p, setP] = useState<Plano>(inicial);
  const [beneficiosTexto, setBeneficiosTexto] = useState(inicial.beneficios.join("\n"));
  const muda = (campoNome: keyof Plano, valor: unknown) => setP(prev => ({ ...prev, [campoNome]: valor }));
  const gratis = p.id === "free";

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSalvar({ ...p, beneficios: beneficiosTexto.split("\n").map(s => s.trim()).filter(Boolean) });
      }}
      className={`${cartao} space-y-4`}
    >
      <h2 className="font-serif text-xl text-white">{novo ? "Novo plano" : `Editar ${inicial.nome}`}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={rotulo}>Código (não muda depois)</label>
          <input
            value={p.id}
            disabled={!novo}
            onChange={e => muda("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="ex.: premium-anual"
            className={campo}
            required
          />
        </div>
        <div>
          <label className={rotulo}>Nome</label>
          <input value={p.nome} onChange={e => muda("nome", e.target.value)} className={campo} required />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo}>Descrição</label>
          <input value={p.descricao} onChange={e => muda("descricao", e.target.value)} className={campo} />
        </div>
        <div>
          <label className={rotulo}>Preço (R$)</label>
          <input type="number" step="0.01" min={0} disabled={gratis} value={p.preco} onChange={e => muda("preco", Number(e.target.value))} className={campo} />
        </div>
        <div>
          <label className={rotulo}>Duração (dias; 30 = mensal, 365 = anual)</label>
          <input type="number" min={0} value={p.periodoDias} onChange={e => muda("periodoDias", Number(e.target.value))} className={campo} />
        </div>
        <div>
          <label className={rotulo}>Créditos liberados</label>
          <input type="number" min={0} value={p.tokens} onChange={e => muda("tokens", Number(e.target.value))} className={campo} />
        </div>
        <div>
          <label className={rotulo}>Mensagens por dia (0 = sem limite)</label>
          <input type="number" min={0} value={p.mensagensPorDia} onChange={e => muda("mensagensPorDia", Number(e.target.value))} className={campo} />
        </div>
        <div>
          <label className={rotulo}>Nível de acesso</label>
          <select value={p.nivel} disabled={gratis} onChange={e => muda("nivel", e.target.value)} className={campo}>
            <option value="free">free: só conversa</option>
            <option value="premium">premium: Diário, Meditação, Ateliê, Studio</option>
            <option value="elite">elite: tudo, sem limites</option>
          </select>
        </div>
        <div>
          <label className={rotulo}>Ordem na tela</label>
          <input type="number" min={0} value={p.ordem} onChange={e => muda("ordem", Number(e.target.value))} className={campo} />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo}>Benefícios (um por linha)</label>
          <textarea rows={4} value={beneficiosTexto} onChange={e => setBeneficiosTexto(e.target.value)} className={campo} />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={p.destaque} onChange={e => muda("destaque", e.target.checked)} /> Destacar como recomendado
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={p.ativo} disabled={gratis} onChange={e => muda("ativo", e.target.checked)} /> Visível para compra
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
        </button>
        <button type="button" onClick={onCancelar} className={botaoSecundario}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ---------- Mercado Pago ----------

function AbaPagamento({
  config,
  salvar,
  salvando,
  mostrar
}: {
  config: ConfigPainel;
  salvar: (c: string, b: unknown, m?: string, msg?: string) => Promise<boolean>;
  salvando: boolean;
  mostrar: (t: "ok" | "erro", m: string) => void;
}) {
  const pg = config.pagamento;
  const [modo, setModo] = useState(pg.modo);
  const [publicKey, setPublicKey] = useState(pg.publicKey);
  const [nomeNaFatura, setNomeNaFatura] = useState(pg.nomeNaFatura);
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [testando, setTestando] = useState(false);
  const webhook = `${config.ambiente.appUrl || window.location.origin}/api/pagamentos/webhook`;

  const testar = async () => {
    setTestando(true);
    try {
      const r = await chamar("/api/admin/config/pagamento/testar", { method: "POST" });
      mostrar(r.ok ? "ok" : "erro", r.ok ? `Mercado Pago respondeu: ${r.detalhe}` : `Falhou: ${r.detalhe}`);
    } finally {
      setTestando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${cartao} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <p className="text-white">
            Pagamentos {pg.ativo ? <span className="text-emerald-400">ligados</span> : <span className="text-zinc-400">desligados</span>}
          </p>
          <p className="text-xs text-zinc-400">
            Com os pagamentos desligados, a tela Evolução mostra "Assinaturas abrem em breve".
          </p>
        </div>
        <button
          disabled={salvando}
          onClick={() => salvar("/api/admin/config/pagamento", { ativo: !pg.ativo }, "PUT", pg.ativo ? "Pagamentos desligados." : "Pagamentos ligados.")}
          className={pg.ativo ? botaoSecundario : botaoPrimario}
        >
          {pg.ativo ? "Desligar" : "Ligar pagamentos"}
        </button>
      </div>

      <form
        onSubmit={async e => {
          e.preventDefault();
          const ok = await salvar(
            "/api/admin/config/pagamento",
            { modo, publicKey, nomeNaFatura, accessToken, webhookSecret },
            "PUT",
            "Dados do Mercado Pago salvos."
          );
          if (ok) {
            setAccessToken("");
            setWebhookSecret("");
          }
        }}
        className={`${cartao} space-y-4`}
      >
        <h2 className="font-serif text-xl text-white">Credenciais do Mercado Pago</h2>
        <p className="text-sm text-zinc-400">
          Pegue em mercadopago.com.br/developers › Suas integrações › Credenciais. Use as de <b>teste</b> para experimentar e as de{" "}
          <b>produção</b> para cobrar de verdade.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={rotulo}>Modo</label>
            <select value={modo} onChange={e => setModo(e.target.value as "teste" | "producao")} className={campo}>
              <option value="teste">Teste (sandbox)</option>
              <option value="producao">Produção (cobrança real)</option>
            </select>
          </div>
          <div>
            <label className={rotulo}>Nome na fatura (até 22 letras)</label>
            <input value={nomeNaFatura} maxLength={22} onChange={e => setNomeNaFatura(e.target.value)} className={campo} />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo}>Public Key</label>
            <input value={publicKey} onChange={e => setPublicKey(e.target.value)} placeholder="APP_USR-... ou TEST-..." className={campo} />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo}>Access Token {pg.accessToken && `(atual: ${pg.accessToken})`}</label>
            <input
              type="password"
              autoComplete="off"
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              placeholder={pg.accessToken ? "Deixe em branco para manter o atual" : "APP_USR-... ou TEST-..."}
              className={campo}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo}>
              Chave secreta do webhook {pg.webhookSecretConfigurado ? "(cadastrada)" : "(recomendado)"}
            </label>
            <input
              type="password"
              autoComplete="off"
              value={webhookSecret}
              onChange={e => setWebhookSecret(e.target.value)}
              placeholder={pg.webhookSecretConfigurado ? "Deixe em branco para manter" : "Em Suas integrações › Webhooks"}
              className={campo}
            />
          </div>
        </div>
        <div className="text-sm text-zinc-400 bg-black/40 border border-white/5 rounded-sm p-3 space-y-1">
          <p>
            No painel do Mercado Pago, em <b>Webhooks</b>, cadastre esta URL com o evento <b>Pagamentos</b>:
          </p>
          <code className="block text-barao-gold break-all">{webhook}</code>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={salvando} className={botaoPrimario}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
          </button>
          <button type="button" onClick={testar} disabled={testando || !pg.accessToken} className={botaoSecundario}>
            {testando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Testar conexão
          </button>
          {pg.accessToken && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Apagar o Access Token? Os pagamentos serão desligados.")) {
                  salvar("/api/admin/config/pagamento", { accessToken: null, ativo: false }, "PUT", "Access Token apagado.");
                }
              }}
              className={`${botaoSecundario} hover:!border-red-400 hover:!text-red-300`}
            >
              <Trash2 className="h-4 w-4" /> Apagar token
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ---------- Serviços de IA ----------

function AbaIa({
  config,
  salvar,
  salvando
}: {
  config: ConfigPainel;
  salvar: (c: string, b: unknown, m?: string, msg?: string) => Promise<boolean>;
  salvando: boolean;
}) {
  const [novasChaves, setNovasChaves] = useState<Record<string, string>>({});
  const [ajustes, setAjustes] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(config.ia.ajustes).map(([k, v]) => [k, v.painel]))
  );
  const [testes, setTestes] = useState<Record<string, { ok: boolean; detalhe: string } | "testando">>({});

  const testar = async (nome: string) => {
    setTestes(t => ({ ...t, [nome]: "testando" }));
    try {
      const r = await chamar("/api/admin/config/ia/testar", { method: "POST", body: JSON.stringify({ servico: nome }) });
      setTestes(t => ({ ...t, [nome]: r }));
    } catch (e: any) {
      setTestes(t => ({ ...t, [nome]: { ok: false, detalhe: e.message } }));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Uma chave salva aqui vale no lugar da que está na Vercel, sem precisar publicar de novo (leva até 30 segundos). Apagar a
        chave daqui volta a usar a da Vercel.
      </p>
      <div className="space-y-3">
        {Object.entries(NOMES_CHAVES).map(([nome, info]) => {
          const estado = config.ia.chaves[nome];
          const teste = testes[nome];
          return (
            <div key={nome} className={`${cartao} space-y-3`}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-white">{info.nome}</p>
                  <p className="text-xs text-zinc-400">{info.uso}</p>
                </div>
                <p className="font-mono text-[11px] text-zinc-400">
                  {estado?.origem === "painel"
                    ? `usando a do painel ${estado.mascara}`
                    : estado?.origem === "ambiente"
                      ? `usando a da Vercel ${estado.mascara}`
                      : "sem chave"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="password"
                  autoComplete="off"
                  aria-label={`Nova chave ${info.nome}`}
                  value={novasChaves[nome] || ""}
                  onChange={e => setNovasChaves(c => ({ ...c, [nome]: e.target.value }))}
                  placeholder="Colar nova chave"
                  className={`${campo} flex-1 min-w-[200px]`}
                />
                <button
                  disabled={salvando || !novasChaves[nome]}
                  onClick={async () => {
                    if (await salvar("/api/admin/config/ia", { chaves: { [nome]: novasChaves[nome] } }, "PUT", `${info.nome}: chave salva.`)) {
                      setNovasChaves(c => ({ ...c, [nome]: "" }));
                    }
                  }}
                  className={botaoPrimario}
                >
                  Salvar
                </button>
                <button onClick={() => testar(nome)} disabled={teste === "testando"} className={botaoSecundario}>
                  {teste === "testando" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Testar
                </button>
                {estado?.origem === "painel" && (
                  <button
                    onClick={() => salvar("/api/admin/config/ia", { chaves: { [nome]: null } }, "PUT", `${info.nome}: voltou a usar a chave da Vercel.`)}
                    className={`${botaoSecundario} hover:!border-red-400 hover:!text-red-300`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {teste && teste !== "testando" && (
                <p className={`text-sm ${teste.ok ? "text-emerald-400" : "text-red-300"}`}>
                  {teste.ok ? "✓" : "✗"} {teste.detalhe}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          salvar("/api/admin/config/ia", { ajustes }, "PUT", "Ajustes de IA salvos.");
        }}
        className={`${cartao} space-y-4`}
      >
        <h2 className="font-serif text-xl text-white">Modelos e voz</h2>
        <p className="text-sm text-zinc-400">Em branco = usa o valor da Vercel (mostrado no campo).</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {Object.entries(NOMES_AJUSTES).map(([nome, descricao]) => (
            <div key={nome}>
              <label className={rotulo}>{descricao}</label>
              <input
                value={ajustes[nome] || ""}
                onChange={e => setAjustes(a => ({ ...a, [nome]: e.target.value }))}
                placeholder={config.ia.ajustes[nome]?.ambiente || "padrão do sistema"}
                className={campo}
              />
            </div>
          ))}
        </div>
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          <Check className="h-4 w-4" /> Salvar ajustes
        </button>
      </form>
    </div>
  );
}

// ---------- Geral ----------

function AbaGeral({
  config,
  salvar,
  salvando
}: {
  config: ConfigPainel;
  salvar: (c: string, b: unknown, m?: string, msg?: string) => Promise<boolean>;
  salvando: boolean;
}) {
  const [manutencao, setManutencao] = useState(config.manutencao);
  const [mensagem, setMensagem] = useState(config.mensagemManutencao);
  const [prompt, setPrompt] = useState(config.promptSistema || config.promptPadrao);
  const [limites, setLimites] = useState(config.limites);
  const [suporte, setSuporte] = useState(config.suporte);

  const nomesLimites: Record<keyof ConfigPainel["limites"], string> = {
    chat: "Mensagens e textos de IA",
    voz: "Leituras em voz",
    imagem: "Fotos geradas",
    musica: "Canções gravadas",
    upload: "Envios de fotos e vídeos"
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={e => {
          e.preventDefault();
          salvar("/api/admin/config/geral", { manutencao, mensagemManutencao: mensagem, limites, suporte }, "PUT", "Configurações salvas.");
        }}
        className={`${cartao} space-y-4`}
      >
        <h2 className="font-serif text-xl text-white">Site</h2>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={manutencao} onChange={e => setManutencao(e.target.checked)} />
          Modo manutenção (o site mostra só a mensagem abaixo; Privacidade, Termos e Admin continuam abertos)
        </label>
        <div>
          <label className={rotulo}>Mensagem de manutenção</label>
          <input value={mensagem} onChange={e => setMensagem(e.target.value)} className={campo} />
        </div>

        <h3 className="font-serif text-lg text-white pt-2">Limites por pessoa (a cada 10 minutos)</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {(Object.keys(nomesLimites) as (keyof typeof nomesLimites)[]).map(nome => (
            <div key={nome}>
              <label className={rotulo}>{nomesLimites[nome]}</label>
              <input
                type="number"
                min={1}
                value={limites[nome]}
                onChange={e => setLimites(l => ({ ...l, [nome]: Number(e.target.value) }))}
                className={campo}
              />
            </div>
          ))}
        </div>

        <h3 className="font-serif text-lg text-white pt-2">Contato de suporte</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={rotulo}>E-mail</label>
            <input type="email" value={suporte.email} onChange={e => setSuporte(s => ({ ...s, email: e.target.value }))} className={campo} />
          </div>
          <div>
            <label className={rotulo}>WhatsApp</label>
            <input value={suporte.whatsapp} onChange={e => setSuporte(s => ({ ...s, whatsapp: e.target.value }))} className={campo} />
          </div>
        </div>
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          <Check className="h-4 w-4" /> Salvar
        </button>
      </form>

      <form
        onSubmit={e => {
          e.preventDefault();
          salvar("/api/admin/config/geral", { promptSistema: prompt }, "PUT", "Personalidade do Barão salva.");
        }}
        className={`${cartao} space-y-3`}
      >
        <h2 className="font-serif text-xl text-white">Personalidade do Barão (prompt do sistema)</h2>
        <p className="text-sm text-zinc-400">
          É o texto que orienta todas as conversas. {config.promptSistema ? "Está usando uma versão editada." : "Está usando o texto original."}
        </p>
        <textarea rows={16} value={prompt} onChange={e => setPrompt(e.target.value)} className={`${campo} font-mono text-xs`} />
        <div className="flex gap-2">
          <button type="submit" disabled={salvando} className={botaoPrimario}>
            <Check className="h-4 w-4" /> Salvar
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Voltar ao texto original do Barão?")) {
                setPrompt(config.promptPadrao);
                salvar("/api/admin/config/geral", { promptSistema: null }, "PUT", "Texto original restaurado.");
              }
            }}
            className={botaoSecundario}
          >
            Restaurar original
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Assinaturas ----------

function AbaAssinaturas() {
  const [linhas, setLinhas] = useState<any[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    chamar("/api/admin/assinaturas")
      .then(d => setLinhas(d.assinaturas))
      .catch(e => setErro(e.message));
  }, []);

  if (erro) return <p className="text-red-300">{erro}</p>;
  if (!linhas) return <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />;
  if (!linhas.length) return <p className="text-zinc-400 text-sm">Nenhuma assinatura ainda.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="py-2 pr-3">Quem</th>
            <th className="py-2 pr-3">Plano</th>
            <th className="py-2 pr-3">Situação</th>
            <th className="py-2 pr-3">Início</th>
            <th className="py-2 pr-3">Fim</th>
            <th className="py-2">Origem</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => (
            <tr key={l.id} className="border-t border-white/5 text-zinc-300">
              <td className="py-2 pr-3">
                {l.nome}
                <span className="block text-xs text-zinc-500">{l.email}</span>
              </td>
              <td className="py-2 pr-3">{l.planoId}</td>
              <td className="py-2 pr-3">{l.status}</td>
              <td className="py-2 pr-3">{l.inicio ? new Date(l.inicio).toLocaleDateString("pt-BR") : "-"}</td>
              <td className="py-2 pr-3">{l.fim ? new Date(l.fim).toLocaleDateString("pt-BR") : "-"}</td>
              <td className="py-2 font-mono text-xs">{String(l.referencia || "").startsWith("mp:") ? `Mercado Pago ${String(l.referencia).slice(3)}` : "painel"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
