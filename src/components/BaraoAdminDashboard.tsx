import React, { useState, useEffect } from "react";
import { 
  Users, 
  Settings, 
  ToggleLeft, 
  ToggleRight, 
  Shield, 
  Key, 
  Trash2, 
  Plus, 
  Edit3, 
  RefreshCw, 
  Check, 
  Coins, 
  Compass, 
  Layers, 
  AlignLeft, 
  ArrowLeft,
  UserPlus,
  LogIn,
  Save,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { User } from "../types";

interface BaraoAdminDashboardProps {
  currentUser: User | null;
  onUserUpdate: (user: User | null) => void;
  onBack: () => void;
}

interface PlanConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  maxDailyMessages: number;
  hasPersistentMemory: boolean;
  allowedMediaTypes: string[];
}

export default function BaraoAdminDashboard({ currentUser, onUserUpdate, onBack }: BaraoAdminDashboardProps) {
  // Authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Loaded/Shared admin data
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Loaded user list from local storage
  const [usersList, setUsersList] = useState<User[]>([]);

  // Navigation tab inside admin
  const [activeAdminTab, setActiveAdminTab] = useState<"users" | "plans" | "prompt" | "tokens" | "maintenance">("users");

  // Local state for actions
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    nickname: "",
    plan: "free",
    tokens: 100
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // New/Edit plan states
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState<PlanConfig>({
    id: "",
    name: "",
    slug: "",
    description: "",
    price: 0,
    maxDailyMessages: 100,
    hasPersistentMemory: false,
    allowedMediaTypes: ["text"]
  });

  // Verify and fetch configurations on start
  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setIsMaintenanceMode(data.isMaintenanceMode);
        setSystemPrompt(data.systemPrompt);
        setDefaultPrompt(data.defaultSystemPrompt);
        if (data.globalPlans) {
          setPlans(data.globalPlans);
        }
      }
    } catch (e) {
      console.error("Failed to load admin config:", e);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Load and seed users if none exist in localStorage to provide a rich UI immediately
  useEffect(() => {
    const listSaved = localStorage.getItem("mb_users_list");
    let usersParsed: User[] = [];

    if (listSaved) {
      try {
        usersParsed = JSON.parse(listSaved);
      } catch (e) {
        usersParsed = [];
      }
    }

    // Seed some mock users if list is completely empty
    if (usersParsed.length === 0) {
      const mockUsers: User[] = [
        {
          id: "usr_mock_1",
          name: "Clara Mendonça",
          email: "clara.mendonca@gmail.com",
          nickname: "Clarinha",
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          plan: "free",
          tokens: 150
        },
        {
          id: "usr_mock_2",
          name: "Daniel Alencar",
          email: "daniel.veludo@uol.com.br",
          nickname: "Daniel",
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          plan: "premium",
          tokens: 1200
        },
        {
          id: "usr_mock_3",
          name: "Gabriela Vasconcelos",
          email: "gabiv@outlook.com",
          nickname: "Gabi",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          plan: "elite",
          tokens: 5800
        }
      ];
      localStorage.setItem("mb_users_list", JSON.stringify(mockUsers));
      usersParsed = mockUsers;
    }

    // Include currentUser in the list if they are not logged mock or absent
    if (currentUser && !usersParsed.some(u => u.id === currentUser.id)) {
      const updatedList = [currentUser, ...usersParsed];
      localStorage.setItem("mb_users_list", JSON.stringify(updatedList));
      usersParsed = updatedList;
    }

    setUsersList(usersParsed);
    fetchConfig();
  }, [currentUser]);

  // Handle password submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem("mb_admin_verified", "true");
        localStorage.setItem("mb_admin_password_cache", password);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Código ou senha incorreta para o santuário.");
      }
    } catch {
      setErrorMsg("Erro ao verificar as credenciais no servidor.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Try auto-authenticating using cached password
  useEffect(() => {
    const isCached = localStorage.getItem("mb_admin_verified");
    const cachedPass = localStorage.getItem("mb_admin_password_cache");
    if (isCached === "true" && cachedPass) {
      setPassword(cachedPass);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogoutAdmin = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("mb_admin_verified");
    localStorage.removeItem("mb_admin_password_cache");
    setPassword("");
  };

  // ------------------------------------------
  // USER ACTIONS
  // ------------------------------------------
  const syncUsersConfig = (updatedList: User[]) => {
    setUsersList(updatedList);
    localStorage.setItem("mb_users_list", JSON.stringify(updatedList));
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      alert("Nome e Email são obrigatórios.");
      return;
    }

    const created: User = {
      id: "usr_" + Math.random().toString(36).substr(2, 9),
      name: newUser.name,
      email: newUser.email,
      nickname: newUser.nickname || newUser.name.split(" ")[0],
      createdAt: new Date().toISOString(),
      plan: newUser.plan as any,
      tokens: newUser.tokens
    };

    const newList = [created, ...usersList];
    syncUsersConfig(newList);
    setIsCreatingUser(false);
    setNewUser({ name: "", email: "", nickname: "", plan: "free", tokens: 100 });
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser?.id) {
       alert("Não é recomendado remover o seu próprio usuário logado no momento.");
       return;
    }
    if (confirm("Deseja realmente remover este usuário do santuário?")) {
      const newList = usersList.filter(u => u.id !== id);
      syncUsersConfig(newList);
    }
  };

  const handleUpgradeDowngrade = (userId: string, newPlanType: "free" | "premium" | "elite" | string) => {
    const newList = usersList.map(u => {
      if (u.id === userId) {
        return { ...u, plan: newPlanType as any };
      }
      return u;
    });
    syncUsersConfig(newList);

    // If upgrading current active account, notify the App parent state too
    if (currentUser && userId === currentUser.id) {
      onUserUpdate({ ...currentUser, plan: newPlanType as any });
    }
  };

  const handleAdjustUserTokens = (userId: string, addedTokens: number) => {
    const newList = usersList.map(u => {
      if (u.id === userId) {
        const curTokens = u.tokens || 0;
        return { ...u, tokens: Math.max(0, curTokens + addedTokens) };
      }
      return u;
    });
    syncUsersConfig(newList);

    if (currentUser && userId === currentUser.id) {
      const curTokens = currentUser.tokens || 0;
      onUserUpdate({ ...currentUser, tokens: Math.max(0, curTokens + addedTokens) });
    }
  };

  // Impersonation: "Entrar na Conta"
  const handleImpersonateUser = (user: User) => {
    if (confirm(`Deseja entrar na conta de ${user.name} (${user.nickname}) agora?`)) {
      onUserUpdate(user);
      onBack(); // Go back to Home / Dashboard automatically as them
    }
  };

  // ------------------------------------------
  // CONFIG SAVING (POST TO BACKEND)
  // ------------------------------------------
  const handleSaveBackendConfigs = async (updatedPlans = plans, overridePrompt = systemPrompt, overrideMaintenance = isMaintenanceMode) => {
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          isMaintenance: overrideMaintenance,
          systemPrompt: overridePrompt,
          plans: updatedPlans
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSaveSuccessMsg("Configurações atualizadas e salvas no servidor!");
        setIsMaintenanceMode(data.isMaintenanceMode);
        setSystemPrompt(data.systemPrompt);
        setPlans(data.globalPlans);
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      } else {
        const err = await res.json();
        alert(err.error || "Falha ao salvar no servidor.");
      }
    } catch {
      alert("Erro ao enviar atualizações ao servidor.");
    }
  };

  // Plan Creator/Editor
  const handleCreatePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.id || !newPlan.name) {
      alert("ID e Nome do Plano são obrigatórios.");
      return;
    }

    const createdPlan: PlanConfig = {
      ...newPlan,
      slug: newPlan.id.toLowerCase()
    };

    const updatedPlans = [...plans, createdPlan];
    setPlans(updatedPlans);
    setIsCreatingPlan(false);
    handleSaveBackendConfigs(updatedPlans);

    setNewPlan({
      id: "",
      name: "",
      slug: "",
      description: "",
      price: 0,
      maxDailyMessages: 100,
      hasPersistentMemory: false,
      allowedMediaTypes: ["text"]
    });
  };

  const handleEditPlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const updatedPlans = plans.map(p => p.id === editingPlan.id ? editingPlan : p);
    setPlans(updatedPlans);
    setEditingPlan(null);
    handleSaveBackendConfigs(updatedPlans);
  };

  const handleDeletePlan = (planId: string) => {
    if (plans.length <= 1) {
      alert("Você deve manter pelo menos um plano ativo no sistema.");
      return;
    }
    if (confirm(`Deseja realmente deletar o plano "${planId}"?`)) {
      const updatedPlans = plans.filter(p => p.id !== planId);
      setPlans(updatedPlans);
      handleSaveBackendConfigs(updatedPlans);
    }
  };

  // Restore Default System Prompt
  const handleRestorePrompt = () => {
    if (confirm("Deseja redefinir o Prompt de Sistema para as instruções padrão do Barão de Tantra?")) {
      setSystemPrompt(defaultPrompt);
      handleSaveBackendConfigs(plans, defaultPrompt);
    }
  };

  // Mass Token Grant
  const handleGrantTokensToAll = (amount: number) => {
    if (confirm(`Deseja conceder +${amount} tokens para todos os (${usersList.length}) usuários cadastrados?`)) {
      const newList = usersList.map(u => ({ ...u, tokens: (u.tokens || 0) + amount }));
      syncUsersConfig(newList);
      alert(`Sucesso! Adicionado +${amount} tokens para todos.`);
    }
  };


  // ------------------------------------------
  // PASSWORD PROTECTED GATEWAY SCREEN
  // ------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-[#D9BA7A]/20 bg-zinc-950/90 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-barao-rose bg-barao-rose/5 text-barao-rose shadow-[0_0_15px_rgba(186,37,74,0.2)]">
              <Shield className="h-7 w-7 animate-pulse" />
            </div>
            <h1 className="font-serif text-2xl font-medium tracking-wide text-white">Santuário Administrador</h1>
            <p className="mt-2 text-xs font-serif italic text-zinc-400">Insira a chave de purificação para acessar os controles de frequências.</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-10px font-mono uppercase tracking-widest text-[#D9BA7A] mb-2">Chave de Acesso</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sussurre a senha secreta..."
                  className="w-full rounded border border-white/10 bg-[#121212] px-4 py-3 pl-10 font-mono text-sm text-white placeholder-zinc-600 outline-none transition focus:border-barao-rose"
                  required
                />
                <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-600" />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded border border-red-950/50 bg-red-950/20 px-3 py-2 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" /> Voltar
              </button>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="rounded bg-[#BA254A] px-5 py-2 text-xs font-mono uppercase tracking-widest text-white shadow-lg shadow-red-950/50 hover:bg-[#D43F60] transition disabled:opacity-55 cursor-pointer"
              >
                {isSubmittingAuth ? "Desbloqueando..." : "Sintonizar"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  // ------------------------------------------
  // UNLOCKED DASHBOARD UI
  // ------------------------------------------
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      {/* Title block */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 text-barao-rose mb-1.5">
            <Shield className="h-4 w-4" />
            <span className="text-10px font-mono uppercase tracking-widest font-bold">Painel de Frequência do Barão</span>
          </div>
          <h1 className="font-serif text-3xl font-light tracking-wide text-white">Santuário Backend <span className="italic text-[#D9BA7A]">Modular</span></h1>
          <p className="text-xs text-zinc-400 font-serif italic max-w-xl">Gerencie conexões afetivas, planos vibracionais, inteligência lírica e ressonâncias do portal do amor.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchConfig}
            disabled={isLoadingConfig}
            className="flex items-center gap-1.5 rounded border border-white/10 bg-zinc-900/50 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition duration-200 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingConfig ? "animate-spin" : ""}`} /> Recarregar
          </button>

          <button
            onClick={handleLogoutAdmin}
            className="flex items-center gap-1.5 rounded border border-red-950/20 bg-red-950/5 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-red-400 hover:bg-red-950/15 hover:text-white transition duration-200 cursor-pointer"
          >
            Bloquear Painel
          </button>

          <button
            onClick={onBack}
            className="rounded bg-zinc-850 px-4 py-1.5 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
          >
            Sair
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2.5 rounded border border-emerald-950/50 bg-[#064e3b]/30 px-4 py-3 text-xs text-emerald-400"
        >
          <Check className="h-4 w-4 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </motion.div>
      )}

      {/* Main interface with Left Sidebar & Right Content Panel */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sidebar Navigation */}
        <div className="space-y-2 lg:col-span-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-3.5 mb-2">Módulos do Portal</div>
          
          <button
            onClick={() => setActiveAdminTab("users")}
            className={`flex w-full items-center gap-3 rounded px-4 py-3 text-xs font-mono uppercase tracking-widest transition duration-200 cursor-pointer ${
              activeAdminTab === "users"
                ? "bg-gradient-to-r from-barao-rose/20 to-transparent border-l-2 border-barao-rose text-white"
                : "text-zinc-400 hover:bg-zinc-900/30 hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" /> Gerenciar Usuários
          </button>

          <button
            onClick={() => setActiveAdminTab("plans")}
            className={`flex w-full items-center gap-3 rounded px-4 py-3 text-xs font-mono uppercase tracking-widest transition duration-200 cursor-pointer ${
              activeAdminTab === "plans"
                ? "bg-gradient-to-r from-barao-rose/20 to-transparent border-l-2 border-barao-rose text-white"
                : "text-zinc-400 hover:bg-zinc-900/30 hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" /> Gerenciar Planos
          </button>

          <button
            onClick={() => setActiveAdminTab("prompt")}
            className={`flex w-full items-center gap-3 rounded px-4 py-3 text-xs font-mono uppercase tracking-widest transition duration-200 cursor-pointer ${
              activeAdminTab === "prompt"
                ? "bg-gradient-to-r from-barao-rose/20 to-transparent border-l-2 border-barao-rose text-white"
                : "text-zinc-400 hover:bg-zinc-900/30 hover:text-white"
            }`}
          >
            <AlignLeft className="h-4 w-4" /> System Prompt
          </button>

          <button
            onClick={() => setActiveAdminTab("tokens")}
            className={`flex w-full items-center gap-3 rounded px-4 py-3 text-xs font-mono uppercase tracking-widest transition duration-200 cursor-pointer ${
              activeAdminTab === "tokens"
                ? "bg-gradient-to-r from-barao-rose/20 to-transparent border-l-2 border-barao-rose text-white"
                : "text-zinc-400 hover:bg-zinc-900/30 hover:text-white"
            }`}
          >
            <Coins className="h-4 w-4" /> Gerenciar Tokens
          </button>

          <button
            onClick={() => setActiveAdminTab("maintenance")}
            className={`flex w-full items-center gap-3 rounded px-4 py-3 text-xs font-mono uppercase tracking-widest transition duration-200 cursor-pointer ${
              activeAdminTab === "maintenance"
                ? "bg-gradient-to-r from-red-600/10 to-transparent border-l-2 border-red-600 text-white"
                : "text-zinc-400 hover:bg-zinc-100/5 hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4 text-red-500 animate-spin-slow" /> Modo Manutenção
          </button>

          {isMaintenanceMode && (
            <div className="rounded border border-red-950/40 bg-red-950/15 p-3 text-[11px] text-red-400 font-mono flex items-start gap-2 animate-pulse mt-4">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Alerta:</strong> Santuário em manutenção! Outros usuários verão a tela de silêncio acústico.
              </div>
            </div>
          )}
        </div>

        {/* Content Box */}
        <div className="lg:col-span-9">
          <div className="rounded-lg border border-white/5 bg-zinc-950/60 p-6 md:p-8 backdrop-blur-md min-h-[450px]">
            {/* TAB 1: USERS */}
            {activeAdminTab === "users" && (
              <div>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-xl font-light text-white">Usuários Cadastrados</h2>
                    <p className="text-xs text-zinc-500 font-serif italic mt-0.5">Utilizadores sintonizados com o sussurro do Barão.</p>
                  </div>

                  <button
                    onClick={() => setIsCreatingUser(!isCreatingUser)}
                    className="flex items-center gap-1.5 rounded bg-barao-rose px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-white hover:bg-rose-700 transition cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> {isCreatingUser ? "Ver Lista" : "Adicionar Usuário"}
                  </button>
                </div>

                {isCreatingUser ? (
                  <form onSubmit={handleCreateUser} className="max-w-xl space-y-4 rounded border border-white/5 bg-zinc-900/30 p-5 mt-4">
                    <h3 className="text-sm font-mono uppercase tracking-widest text-[#D9BA7A]">Adicionar Novo Sintonizador</h3>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Nome Completo</label>
                        <input
                          type="text"
                          required
                          value={newUser.name}
                          onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                          className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-barao-rose"
                          placeholder="Ex: Amanda Silva"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Apelido Afetivo</label>
                        <input
                          type="text"
                          value={newUser.nickname}
                          onChange={e => setNewUser({ ...newUser, nickname: e.target.value })}
                          className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-barao-rose"
                          placeholder="Ex: Mandinha"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">E-mail de Cadastro</label>
                      <input
                        type="email"
                        required
                        value={newUser.email}
                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-barao-rose"
                        placeholder="Ex: amanda@portal.com"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Plano Vibracional</label>
                        <select
                          value={newUser.plan}
                          onChange={e => setNewUser({ ...newUser, plan: e.target.value })}
                          className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-barao-rose cursor-pointer"
                        >
                          <option value="free">Acolhimento Grátis (Free)</option>
                          <option value="premium">Sintonia Premium</option>
                          <option value="elite">Lorde Elite</option>
                          {plans.filter(p => !["free", "premium", "elite"].includes(p.id)).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Tokens Iniciais</label>
                        <input
                          type="number"
                          value={newUser.tokens}
                          onChange={e => setNewUser({ ...newUser, tokens: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-barao-rose"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="rounded bg-emerald-700 px-4 py-2 text-xs font-mono uppercase tracking-widest text-white hover:bg-emerald-600 transition cursor-pointer"
                      >
                        Salvar e Criar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingUser(false)}
                        className="rounded border border-white/5 bg-zinc-800 px-4 py-2 text-xs font-mono uppercase tracking-widest text-[#D9BA7A] hover:bg-zinc-750 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                          <th className="py-3 px-4">Utilizador / Email</th>
                          <th className="py-3 px-4">Plano Ativo</th>
                          <th className="py-3 px-4">Tokens</th>
                          <th className="py-3 px-4 text-center">Ações de Controle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {usersList.map((user) => (
                          <tr key={user.id} className="hover:bg-white/[0.02] transition">
                            <td className="py-3.5 px-4">
                              <div className="font-serif font-medium text-white text-sm">{user.name} <span className="text-11px font-mono text-zinc-550">({user.nickname})</span></div>
                              <div className="font-mono text-zinc-500 text-[10px] mt-0.5">{user.email}</div>
                            </td>
                            <td className="py-3.5 px-4 text-zinc-300">
                              <select
                                value={user.plan || "free"}
                                onChange={(e) => handleUpgradeDowngrade(user.id, e.target.value)}
                                className="rounded border border-white/10 bg-zinc-950 px-2 py-1 text-[11px] text-[#D9BA7A] outline-none focus:border-barao-rose cursor-pointer"
                              >
                                <option value="free">Grátis</option>
                                <option value="premium">Premium</option>
                                <option value="elite">Elite</option>
                                {plans.filter(p => !["free", "premium", "elite"].includes(p.id)).map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-emerald-400">{user.tokens ?? 0}</span>
                                <div className="flex gap-1.5 gap-y-1 scale-90">
                                  <button 
                                    onClick={() => handleAdjustUserTokens(user.id, 100)} 
                                    className="px-1 border border-white/10 hover:border-emerald-500/50 rounded text-emerald-400 cursor-pointer"
                                    title="+100 tokens"
                                  >
                                    +100
                                  </button>
                                  <button 
                                    onClick={() => handleAdjustUserTokens(user.id, -100)} 
                                    className="px-1 border border-white/10 hover:border-rose-500/50 rounded text-rose-400 cursor-pointer"
                                    title="-100 tokens"
                                  >
                                    -100
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                  onClick={() => handleImpersonateUser(user)}
                                  className="flex items-center gap-1 rounded bg-[#D9BA7A]/10 border border-[#D9BA7A]/30 px-2 py-1 text-[10px] uppercase tracking-wider text-[#D9BA7A] hover:bg-[#D9BA7A] hover:text-black transition cursor-pointer"
                                  title="Fazer Login na conta deste usuário"
                                >
                                  <LogIn className="h-3 w-3" /> Entrar
                                </button>

                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="rounded border border-red-950/30 bg-red-950/10 p-1 text-red-500 hover:bg-red-950/50 transition cursor-pointer"
                                  title="Excluir Usuário"
                                >
                                  <Trash2 className="h-3 w-3" />
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
            )}

            {/* TAB 2: PLANS */}
            {activeAdminTab === "plans" && (
              <div>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-xl font-light text-white">Sintonizações de Planos</h2>
                    <p className="text-xs text-zinc-500 font-serif italic mt-0.5">Customize, crie novos ou remova pacotes de ritos do portal.</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsCreatingPlan(!isCreatingPlan);
                      setEditingPlan(null);
                    }}
                    className="flex items-center gap-1.5 rounded bg-barao-rose px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-white hover:bg-rose-700 transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Nova Sintonia de Plano
                  </button>
                </div>

                {isCreatingPlan && (
                  <form onSubmit={handleCreatePlanSubmit} className="max-w-xl space-y-4 rounded border border-white/5 bg-zinc-900/30 p-5 mb-8">
                    <h3 className="text-sm font-mono uppercase tracking-widest text-[#D9BA7A]">Criar Novo Plano Vibracional</h3>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">ID / Slug Único</label>
                        <input
                          type="text"
                          required
                          value={newPlan.id}
                          onChange={e => setNewPlan({ ...newPlan, id: e.target.value })}
                          placeholder="Ex: gold_deluxe"
                          className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-barao-rose"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Nome de Exibição</label>
                        <input
                          type="text"
                          required
                          value={newPlan.name}
                          onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                          placeholder="Ex: Sintonia Ouro Real"
                          className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-barao-rose"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Preço Mensal (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newPlan.price}
                        onChange={e => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) || 0 })}
                        className="w-full max-w-sm rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-barao-rose"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Limite Diário de Mensagens</label>
                      <input
                        type="number"
                        required
                        value={newPlan.maxDailyMessages}
                        onChange={e => setNewPlan({ ...newPlan, maxDailyMessages: parseInt(e.target.value) || 9999 })}
                        className="w-full max-w-sm rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-barao-rose"
                      />
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <input
                        type="checkbox"
                        id="new_persistent"
                        checked={newPlan.hasPersistentMemory}
                        onChange={e => setNewPlan({ ...newPlan, hasPersistentMemory: e.target.checked })}
                        className="rounded bg-zinc-950 border-white/10 text-barao-rose cursor-pointer"
                      />
                      <label htmlFor="new_persistent" className="text-xs font-serif italic text-zinc-350 cursor-pointer">Admite memória afetiva e persistência (RAG)</label>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Descrição do Plano</label>
                      <textarea
                        required
                        value={newPlan.description}
                        onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                        rows={3}
                        placeholder="Descreva poética e honestamente os benefícios deste plano..."
                        className="w-full rounded border border-white/10 bg-zinc-950 p-3 font-serif text-xs text-white placeholder-zinc-700 outline-none focus:border-barao-rose"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="rounded bg-emerald-700 px-4 py-2 text-xs font-mono uppercase tracking-widest text-white hover:bg-emerald-600 transition cursor-pointer"
                      >
                        Criar Plano
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingPlan(false)}
                        className="rounded border border-white/5 bg-zinc-800 px-4 py-2 text-xs font-mono uppercase tracking-widest text-[#D9BA7A] hover:bg-zinc-750 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {editingPlan && (
                  <form onSubmit={handleEditPlanSubmit} className="max-w-xl space-y-4 rounded border border-[#D9BA7A]/20 bg-zinc-900/40 p-5 mb-8">
                    <h3 className="text-sm font-mono uppercase tracking-widest text-[#D9BA7A]">Ajustar Plano: {editingPlan.name}</h3>
                    
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Nome do Plano</label>
                      <input
                        type="text"
                        required
                        value={editingPlan.name}
                        onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                        className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-barao-rose"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-mono text-[#D9BA7A] uppercase tracking-wider mb-1.5">Preço Mensal (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editingPlan.price}
                          onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-barao-rose"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-[#D9BA7A] uppercase tracking-wider mb-1.5">Limite Mensagem/Dia</label>
                        <input
                          type="number"
                          required
                          value={editingPlan.maxDailyMessages}
                          onChange={e => setEditingPlan({ ...editingPlan, maxDailyMessages: parseInt(e.target.value) || 0 })}
                          className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-barao-rose"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <input
                        type="checkbox"
                        id="edit_persistent"
                        checked={editingPlan.hasPersistentMemory}
                        onChange={e => setEditingPlan({ ...editingPlan, hasPersistentMemory: e.target.checked })}
                        className="rounded bg-zinc-950 border-white/10 text-barao-rose cursor-pointer"
                      />
                      <label htmlFor="edit_persistent" className="text-xs font-serif italic text-zinc-350 cursor-pointer">Admite memória afetiva e persistência (RAG)</label>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Descrição Vibracional</label>
                      <textarea
                        required
                        value={editingPlan.description}
                        onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                        rows={3}
                        className="w-full rounded border border-white/10 bg-zinc-950 p-3 font-serif text-xs text-white outline-none focus:border-barao-rose"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="rounded bg-emerald-700 px-4 py-2 text-xs font-mono uppercase tracking-widest text-white hover:bg-emerald-600 transition cursor-pointer"
                      >
                        Salvar Ajustes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPlan(null)}
                        className="rounded border border-white/5 bg-zinc-800 px-4 py-2 text-xs font-mono uppercase tracking-widest text-[#D9BA7A] hover:bg-zinc-750 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((p) => (
                    <div 
                      key={p.id} 
                      className="flex flex-col justify-between rounded-lg border border-white/5 bg-zinc-900/20 p-5 hover:border-[#D9BA7A]/20 transition duration-300"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5 mb-3">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-550">{p.id}</span>
                          <span className="font-mono text-xs font-medium text-[#D9BA7A]">R$ {p.price.toFixed(2)}</span>
                        </div>
                        <h4 className="font-serif text-base text-white font-medium">{p.name}</h4>
                        <p className="mt-2 text-[11px] text-zinc-450 font-serif italic leading-relaxed min-h-[50px]">{p.description}</p>
                        
                        <div className="mt-4 space-y-1.5">
                          <div className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Atributos:</div>
                          <div className="text-[11px] text-zinc-400 font-mono">Limite diário: <span className="font-bold text-white">{p.maxDailyMessages > 99999 ? "Ilimitado" : p.maxDailyMessages}</span> msgs</div>
                          <div className="text-[11px] text-zinc-400 font-mono">Memória RAG: <span className="font-bold text-white">{p.hasPersistentMemory ? "Ativa" : "Desativada"}</span></div>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2 pt-3.5 border-t border-white/5">
                        <button
                          onClick={() => setEditingPlan(p)}
                          className="flex items-center gap-1 rounded bg-zinc-800 border border-white/5 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-zinc-200 hover:text-white transition cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3" /> Editar
                        </button>

                        {!["free", "premium", "elite"].includes(p.id) && (
                          <button
                            onClick={() => handleDeletePlan(p.id)}
                            className="rounded border border-red-950/20 bg-red-950/5 px-2 p-1 text-red-400 hover:bg-red-950/20 transition cursor-pointer ml-auto"
                            title="Remover Plano"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: SYSTEM PROMPT */}
            {activeAdminTab === "prompt" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-light text-white">Instrução Primordial (System Prompt)</h2>
                  <p className="text-xs text-zinc-500 font-serif italic mt-0.5">Componha no coração mecânico o roteiro de escuta profunda do Barão do Tantra.</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-10px font-mono uppercase tracking-widest text-[#D9BA7A]">Diretiva Lírica & Psicológica (Injetada no Gemini)</label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={15}
                    className="w-full rounded border border-white/10 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 leading-relaxed outline-none focus:border-barao-rose"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => handleSaveBackendConfigs(plans, systemPrompt)}
                    className="flex items-center gap-1.5 rounded bg-barao-rose px-5 py-2.5 text-xs font-mono uppercase tracking-wider text-white hover:bg-rose-700 transition duration-200 cursor-pointer shadow-lg shadow-red-950/30"
                  >
                    <Save className="h-4 w-4" /> Registrar Novo Comportamento
                  </button>

                  <button
                    onClick={handleRestorePrompt}
                    className="rounded border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                  >
                    Restaurar Padrão de Fábrica
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: TOKEN MANAGEMENT */}
            {activeAdminTab === "tokens" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-light text-white">Administração de Moedas de Sintonia (Tokens)</h2>
                  <p className="text-xs text-zinc-500 font-serif italic mt-0.5">Sopre energia de atendimento concedendo tokens para seus sintonizadores.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-lg border border-white/5 bg-zinc-900/30 p-5 space-y-4">
                    <h3 className="font-serif text-base text-white">Aporte de Energia para Todos</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">Conceda uma carga uniforme de moedas vibracionais para expandir os limites de todos os utilizadores simultaneamente.</p>
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => handleGrantTokensToAll(100)}
                        className="rounded bg-emerald-950/30 border border-emerald-900 px-3 py-2 text-xs font-mono text-emerald-400 hover:bg-emerald-900 hover:text-white transition cursor-pointer"
                      >
                        Soprar +100 Tokens
                      </button>

                      <button
                        onClick={() => handleGrantTokensToAll(500)}
                        className="rounded bg-emerald-950/30 border border-emerald-900 px-3 py-2 text-xs font-mono text-emerald-400 hover:bg-emerald-900 hover:text-white transition cursor-pointer"
                      >
                        Soprar +500 Tokens
                      </button>

                      <button
                        onClick={() => handleGrantTokensToAll(1000)}
                        className="rounded bg-emerald-950/30 border border-emerald-900 px-3 py-2 text-xs font-mono text-emerald-400 hover:bg-emerald-900 hover:text-white transition cursor-pointer"
                      >
                        Aportar +1.000 Tokens
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/5 bg-zinc-900/30 p-5 space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-base text-white">Status Geral do Cofrinho Cósmico</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">Audite a circulação total de tokens decorrentes do amor estético.</p>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="rounded bg-zinc-950/80 p-3">
                          <div className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider">Moedas Totais</div>
                          <div className="text-lg font-bold text-white mt-1">
                            {usersList.reduce((sum, u) => sum + (u.tokens || 0), 0)}
                          </div>
                        </div>

                        <div className="rounded bg-zinc-950/80 p-3">
                          <div className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider">Sintonizadores</div>
                          <div className="text-lg font-bold text-[#D9BA7A] mt-1">{usersList.length}</div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-500 font-mono italic">Regulamentações de consumo são debitadas a cada mensagem sutil que o Barão profere.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: MAINTENANCE MODE */}
            {activeAdminTab === "maintenance" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-light text-white">Estado de Manutenção</h2>
                  <p className="text-xs text-zinc-500 font-serif italic mt-0.5">Ative o recolhimento cósmico para refinar frestas sem ruído alheio.</p>
                </div>

                <div className="rounded-lg border border-red-950/30 bg-red-950/5 p-5 max-w-2xl space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-zinc-300">
                      <div className="font-serif text-base text-white">Interromper Funcionamento Externo</div>
                      <p className="text-xs text-zinc-400 mt-1 max-w-md">Ao ativar, qualquer visitante verá apenas a tela lírica de recolhimento acústico. Você (administrador) pode bypassar a tela inserindo a senha secreta na própria página.</p>
                    </div>

                    <div className="ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !isMaintenanceMode;
                          setIsMaintenanceMode(nextVal);
                          handleSaveBackendConfigs(plans, systemPrompt, nextVal);
                        }}
                        className="p-1 outline-none focus:outline-none cursor-pointer text-red-500 hover:scale-105 transition"
                      >
                        {isMaintenanceMode ? (
                          <ToggleRight className="h-14 w-14 text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.4)]" />
                        ) : (
                          <ToggleLeft className="h-14 w-14 text-zinc-650" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-red-950/30 pt-4 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isMaintenanceMode ? "bg-red-505 animate-pulse" : "bg-zinc-600"}`}></div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-450">
                      Santuário Atualmente: <strong className={isMaintenanceMode ? "text-red-400 font-bold" : "text-zinc-400 font-normal"}>{isMaintenanceMode ? "Em Silêncio Cósmico (Ativo)" : "Atendimento Ordinário (Inativo)"}</strong>
                    </span>
                  </div>
                </div>

                <div className="rounded bg-zinc-950 p-4 border border-white/5 max-w-2xl text-xs text-zinc-500 space-y-2 font-mono">
                  <div className="font-bold text-[#D9BA7A]">Como o administrador pode fazer login enquanto em manutenção?</div>
                  <p>Inicie a página indicando o parâmetro de bypass em sua URL para navegar livremente:</p>
                  <pre className="p-3 bg-zinc-900 rounded select-all text-[#BA254A] font-mono text-[11px]">
                    https://[url-do-seu-site]/?bypass=barao123
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
