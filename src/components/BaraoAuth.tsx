/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../types";
import { Eye, EyeOff, Key, Mail, User as UserIcon, Sparkles, AlertCircle, Heart, Check } from "lucide-react";
import { supabase } from "../lib/supabase";

const SESSION_USER_KEY = "mb_logged_user";

/**
 * Parses the API response as JSON. When the backend isn't running, hosting
 * returns an HTML/text error page — surface a readable message instead of
 * "Unexpected token ... is not valid JSON".
 */
async function parseJsonResponse(response: Response): Promise<any> {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    console.error("[Auth] Resposta não-JSON do servidor:", response.status, raw.slice(0, 200));
    throw new Error(
      `O servidor não respondeu (HTTP ${response.status}). ` +
      "Verifique se o backend está rodando e tente novamente em instantes."
    );
  }
}

interface BaraoAuthProps {
  onSuccess: (user: User) => void;
  onClose?: () => void;
  initialMode?: "login" | "register";
  onViewPrivacy?: () => void;
  onViewTerms?: () => void;
}

export default function BaraoAuth({ onSuccess, onClose, initialMode = "login", onViewPrivacy, onViewTerms }: BaraoAuthProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  
  // Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [preferredSound, setPreferredSound] = useState("chuva");
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'elite'>('free');
  
  // States
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTermsPrivacy, setAcceptedTermsPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);



  const triggerGoogleAuth = async () => {
    return;
  };

  const old_triggerGoogleAuth = async () => {
    return;

    const popupHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
        <title>Fazer login com o Google</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #070707;
            color: #E4E4E7;
            margin: 0;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            -webkit-text-size-adjust: 100%;
          }
          #main-content {
            width: 100%;
            max-width: 420px;
            display: flex;
            flex-direction: column;
            align-items: center;
            border: 1px solid rgba(197, 160, 89, 0.2);
            border-radius: 4px;
            padding: 36px 24px;
            background-color: #0F0F0F;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7);
          }
          .logo {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
            background: rgba(255, 255, 255, 0.05);
            padding: 10px;
            border-radius: 50%;
          }
          .title {
            font-size: 20px;
            font-weight: 500;
            color: #ffffff;
            line-height: 1.3;
            margin-bottom: 8px;
            text-align: center;
          }
          .subtitle {
            font-size: 13px;
            color: #94A3B8;
            margin-bottom: 26px;
            text-align: center;
          }
          .account-box {
            width: 100%;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 24px;
            background-color: #070707;
          }
          .account-item {
            display: flex;
            align-items: center;
            padding: 16px;
            min-height: 56px; /* Ensuring spacious 48px+ touch compliance */
            cursor: pointer;
            transition: all 0.2s;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .account-item:last-child {
            border-bottom: none;
          }
          .account-item:hover, .account-item:active {
            background-color: rgba(197, 160, 89, 0.05);
          }
          .avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-color: #C5A059;
            color: #000000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
            margin-right: 14px;
            flex-shrink: 0;
          }
          .avatar-secondary {
            background-color: #1F2937;
            color: #9CA3AF;
            border: 1px dashed rgba(255, 255, 255, 0.1);
          }
          .info {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            min-width: 0;
          }
          .name {
            font-size: 14px;
            font-weight: 550;
            color: #F3F4F6;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .email {
            font-size: 12px;
            color: #6B7280;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 2px;
          }
          .footer {
            font-size: 11px;
            color: #64748B;
            text-align: center;
            line-height: 1.6;
            margin-top: 16px;
          }
          .footer a {
            color: #E2E8F0;
            text-decoration: underline;
          }
          .footer a:hover {
            color: #C5A059;
          }
          .connecting {
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 24px;
            text-align: center;
            border: 1px solid rgba(197, 160, 89, 0.2);
            border-radius: 4px;
            background-color: #0F0F0F;
            width: 100%;
            max-width: 420px;
          }
          .spinner {
            border: 3px solid rgba(255, 255, 255, 0.05);
            border-top: 3px solid #C5A059;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 0.8s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .input-form {
            display: none;
            flex-direction: column;
            width: 100%;
          }
          .input-group {
            position: relative;
            margin-bottom: 18px;
            width: 100%;
          }
          .input-field {
            width: 100%;
            height: 48px; /* Spacious finger height */
            background-color: #070707;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            font-size: 14px;
            color: #ffffff;
            padding: 0 16px;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.15s;
          }
          .input-field:focus {
            border-color: #C5A059;
          }
          .button-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 18px;
            width: 100%;
            gap: 12px;
          }
          .btn-text {
            color: #94A3B8;
            background: none;
            border: none;
            font-size: 13px;
            font-weight: 550;
            cursor: pointer;
            height: 44px;
            padding: 0 16px;
            border-radius: 4px;
            outline: none;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .btn-text:hover, .btn-text:active {
            background-color: rgba(255, 255, 255, 0.05);
            color: #ffffff;
          }
          .btn-primary {
            background-color: #C5A059;
            color: #000000;
            border: none;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            height: 44px;
            padding: 0 24px;
            border-radius: 4px;
            transition: all 0.2s;
            outline: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-grow: 1;
          }
          .btn-primary:hover, .btn-primary:active {
            background-color: #E5CD9D;
            transform: translateY(-0.5px);
          }
          @media (max-width: 480px) {
            body {
              padding: 12px;
              justify-content: center;
              background-color: #070707;
            }
            #main-content, .connecting {
              border: 1px solid rgba(197, 160, 89, 0.15);
              padding: 24px 16px;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div id="main-content">
          <div class="logo">
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.77-.07-1.54-.2-2.27H12v4.51h6.6c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.68-5.17 3.68-8.82z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.14 0-5.8-2.11-6.75-4.96H1.31v3.09C3.26 21.3 7.37 24 12 24z"/>
              <path fill="#FBBC05" d="M5.25 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.31C.47 8.24 0 10.06 0 12s.47 3.76 1.31 5.38l3.94-3.09z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.31 6.62l3.94 3.09c.95-2.85 3.61-4.96 6.75-4.96z"/>
            </svg>
          </div>
          
          <div id="account-chooser" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
            <div class="title">Fazer login com o Google</div>
            <div class="subtitle">para continuar no Meu Barão</div>

            <div class="account-box">
              <!-- Sergio Ferezin Account Option -->
              <div class="account-item" onclick="selectAccount('SergioFerezin@gmail.com', 'Sergio Ferezin')">
                <div class="avatar">S</div>
                <div class="info">
                  <span class="name">Sergio Ferezin</span>
                  <span class="email">SergioFerezin@gmail.com (Desenvolvedora)</span>
                </div>
              </div>
              
              <!-- Alternative User Account option -->
              <div class="account-item" id="custom-account-btn" onclick="showCustomSignInForm()">
                <div class="avatar avatar-secondary">+</div>
                <div class="info">
                  <span class="name">Usar outro e-mail</span>
                  <span class="email">Entrar com sua própria conta Google</span>
                </div>
              </div>
            </div>
            
            <div class="footer">
              Para continuar, o Google compartilhará seu nome, e-mail e foto do perfil com o app Meu Barão. Consulte a <a href="#">Política de Privacidade</a> deste ambiente confidencial.
            </div>
          </div>

          <div id="custom-signin-form" class="input-form">
            <div class="title" style="margin-bottom: 4px;">Fazer login</div>
            <div class="subtitle">Use sua Conta do Google ativa</div>
            
            <form onsubmit="handleCustomSubmit(event)" style="width: 100%;">
              <div class="input-group">
                <input type="email" id="custom-email" class="input-field" placeholder="E-mail do Google (ex: Helena@gmail.com)" required />
              </div>
              <div class="input-group">
                <input type="text" id="custom-name" class="input-field" placeholder="Seu nome ou apelido como prefere ser chamada" />
              </div>
              <div class="button-row">
                <button type="button" class="btn-text" onclick="showAccountChooser()">Voltar</button>
                <button type="submit" class="btn-primary">Próximo</button>
              </div>
            </form>
          </div>
        </div>

        <div id="loading-content" class="connecting">
          <div class="spinner"></div>
          <div class="name" style="margin-bottom: 4px; font-weight: 550; color: #ffffff;">Sintonizando ao Google...</div>
          <div class="email" id="connecting-email" style="font-size: 13px; color: #94A3B8;"></div>
        </div>

        <script>
          function selectAccount(email, name) {
            document.getElementById('main-content').style.display = 'none';
            document.getElementById('loading-content').style.display = 'flex';
            document.getElementById('connecting-email').innerText = email;

            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_AUTH_SUCCESS',
                  email: email,
                  name: name
                }, window.location.origin);
                window.close();
              } else {
                alert('Erro de comunicação. O Barão não pôde receber seus dados.');
              }
            }, 1200);
          }

          function showCustomSignInForm() {
            document.getElementById('account-chooser').style.display = 'none';
            document.getElementById('custom-signin-form').style.display = 'flex';
            document.getElementById('custom-email').focus();
          }

          function showAccountChooser() {
            document.getElementById('custom-signin-form').style.display = 'none';
            document.getElementById('account-chooser').style.display = 'flex';
          }

          function handleCustomSubmit(e) {
            e.preventDefault();
            var email = document.getElementById('custom-email').value;
            var name = document.getElementById('custom-name').value;
            
            if (!email || email.indexOf('@') === -1) {
              alert("Por favor, digite um e-mail válido.");
              return;
            }
            if (!name) {
              name = email.split('@')[0];
              name = name.charAt(0).toUpperCase() + name.slice(1);
            }
            selectAccount(email, name);
          }
        </script>
      </body>
      </html>
    `;

    // popup.document.write(popupHtml);
    // popup.document.close();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!acceptedTermsPrivacy) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para prosseguir.");
      setLoading(false);
      return;
    }

    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "E-mail ou senha incorretos.");
      }

      // Persist the Supabase session so API calls carry the auth token
      if (data.session && supabase) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setSuccessMsg(`Bem-vinda de volta, ${data.nickname || data.name}!`);
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(data));
      setTimeout(() => {
        onSuccess(data);
      }, 1200);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!acceptedTermsPrivacy) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para prosseguir.");
      setLoading(false);
      return;
    }

    if (!name || !email || !password || !nickname) {
      setError("Por favor, preencha todos os campos para se sintonizar.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Sua chave de acesso precisa ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          nickname,
          preferredSound,
          plan: selectedPlan
        })
      });

      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Erro ao se sintonizar.");
      }

      // Persist the Supabase session so API calls carry the auth token
      if (data.session && supabase) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setSuccessMsg("Seu abrigo íntimo foi criado. Sintonizando presença com a nuvem...");
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(data));
      
      setTimeout(() => {
        onSuccess(data);
      }, 1500);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-5 sm:p-6 md:p-8 bg-[#0F0F0F] border border-barao-rose/25 rounded-sm immersive-corners shadow-2xl relative animate-fade-in text-left">
      {/* Decorative center lock icon */}
      <div className="flex justify-center mb-6">
        <div className="h-12 w-12 border border-barao-rose/30 flex items-center justify-center rotate-45 bg-[#0A0A0A]">
          <span className="-rotate-45">
            <Heart className="h-5 w-5 text-barao-rose animate-pulse" />
          </span>
        </div>
      </div>

      <div className="text-center space-y-2 mb-6">
        <h3 className="font-serif text-2xl font-light tracking-wide text-white">
          {mode === "login" ? "Entrar no Abrigo" : "Sua Sintonização"}
        </h3>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-barao-rose">
          {mode === "login" ? "Memória de Presença Intensa" : "Criação de Laço de Cuidado"}
        </p>
      </div>

      {successMsg ? (
        <div className="py-8 text-center space-y-4 animate-fade-in">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-sm bg-emerald-950/30 border border-emerald-500/30 text-emerald-400">
            <Check className="h-6 w-6" />
          </div>
          <p className="font-serif text-base text-zinc-200 block italic leading-relaxed">
            {successMsg}
          </p>
          <div className="flex justify-center">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-barao-rose opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-barao-rose"></span>
            </span>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-sm bg-red-950/35 border border-red-900/30 p-3 text-xs text-red-300 animate-slide-up">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab switches */}
          <div className="flex border-b border-white/5 mb-6 text-xs uppercase font-mono tracking-wider">
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 pb-3 text-center transition-all ${
                mode === "login"
                  ? "text-barao-rose border-b border-barao-rose font-bold"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Fazer Login
            </button>
            <button
              onClick={() => { setMode("register"); setError(null); }}
              className={`flex-1 pb-3 text-center transition-all ${
                mode === "register"
                  ? "text-barao-rose border-b border-barao-rose font-bold"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Cadastrar-se
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === "login" ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4 font-sans">
            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-zinc-400">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Helena de Medeiros"
                    maxLength={50}
                    className="w-full h-11 bg-black border border-zinc-900 rounded-sm pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-barao-rose/50"
                    required={mode === "register"}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-zinc-400">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: helena@meubarao.com"
                  className="w-full h-11 bg-black border border-zinc-900 rounded-sm pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-barao-rose/50"
                  required
                />
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-zinc-400">
                  Como O Barão deve te chamar? (Apelido Afetivo)
                </label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="ex: Helena Querida, Menina do Riso Doce..."
                    maxLength={30}
                    className="w-full h-11 bg-black border border-zinc-900 rounded-sm pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-barao-rose/50"
                    required={mode === "register"}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-zinc-400">
                Chave de Acesso (Senha)
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Seu código silenciado..."
                  className="w-full h-11 bg-black border border-zinc-900 rounded-sm pl-10 pr-12 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-barao-rose/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-zinc-600 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-zinc-400">
                  Indução de Fundo Predileta
                </label>
                <select
                  value={preferredSound}
                  onChange={(e) => setPreferredSound(e.target.value)}
                  className="w-full h-11 bg-black border border-zinc-900 rounded-sm px-4 text-xs text-zinc-300 focus:outline-none focus:border-barao-rose/50"
                >
                  <option value="chuva">Chuva Calma de Outono</option>
                  <option value="piano">Piano Acústico Suave</option>
                  <option value="lareira">Fogo de Lareira e Conforto</option>
                  <option value="nenhum">Sem Ambientação de Fundo</option>
                </select>
              </div>
            )}

            {mode === "register" && (
              <div className="space-y-3 pt-2">
                <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-[#CB8684] font-bold">
                  Escolha Seu Plano de Sintonia
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Plan Grátis */}
                  <div
                    type="button"
                    onClick={() => setSelectedPlan('free')}
                    className={`p-3.5 border rounded-sm cursor-pointer transition text-left flex flex-col justify-between ${
                      selectedPlan === 'free'
                        ? 'bg-barao-rose/[0.04] border-barao-rose text-white'
                        : 'bg-black/40 border-white/5 hover:border-white/10 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-xs font-semibold text-white">Plano Grátis</span>
                      <span className="font-mono text-[9px] uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-sm">100 Tokens</span>
                    </div>
                    <p className="text-[10px] leading-relaxed mt-1 text-zinc-500">
                      Ideal para degustação. Acesso exclusivo ao chat terapêutico básico via texto. Outros módulos indisponíveis. (10 tokens por desabafo)
                    </p>
                  </div>

                  {/* Plan Premium */}
                  <div
                    type="button"
                    onClick={() => setSelectedPlan('premium')}
                    className={`p-3.5 border rounded-sm cursor-pointer transition text-left flex flex-col justify-between relative overflow-hidden ${
                      selectedPlan === 'premium'
                        ? 'bg-barao-rose/[0.07] border-barao-rose text-white'
                        : 'bg-black/40 border-white/5 hover:border-white/10 text-zinc-400 font-normal'
                    }`}
                  >
                    {selectedPlan === 'premium' && (
                      <div className="absolute top-0 right-0 bg-barao-rose text-black font-mono text-[7.5px] uppercase font-bold px-2 py-0.5 rounded-bl-sm">
                        Recomendado
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-xs font-semibold text-white">Plano Premium</span>
                      <span className="font-mono text-[9px] uppercase bg-barao-rose/20 text-barao-rose border border-barao-rose/30 px-2 py-0.5 rounded-sm">2.500 Tokens</span>
                    </div>
                    <p className="text-[10px] leading-relaxed mt-1 text-zinc-450">
                      Sintonia estendida completa: áudio sussurrado (Voz), álbum fotográfico de lembranças, compositor ambiente e diário íntimo poético.
                    </p>
                  </div>

                  {/* Plan Elite */}
                  <div
                    type="button"
                    onClick={() => setSelectedPlan('elite')}
                    className={`p-3.5 border rounded-sm cursor-pointer transition text-left flex flex-col justify-between ${
                      selectedPlan === 'elite'
                        ? 'bg-barao-rose/[0.04] border-barao-gold text-white'
                        : 'bg-black/40 border-white/5 hover:border-white/10 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-xs font-semibold text-barao-gold">Plano Elite</span>
                      <span className="font-mono text-[9px] uppercase bg-barao-gold/20 text-barao-gold border border-barao-gold/30 px-2 py-0.5 rounded-sm select-none">Tokens Infinitos</span>
                    </div>
                    <p className="text-[10px] leading-relaxed mt-1 text-zinc-500">
                      Conexão espiritual máxima ilimitada: tudo liberado com respostas em altíssima velocidade, prioridade de atenção e exclusividades do Barão.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Checkbox de Aceitação Obrigatória */}
            <div className="flex items-start gap-2.5 pt-1.5 pb-1 mt-4 bg-[#0A0A0A]/60 p-3 border border-white/5 rounded-sm">
              <input
                id="terms-privacy-checkbox"
                type="checkbox"
                checked={acceptedTermsPrivacy}
                onChange={(e) => setAcceptedTermsPrivacy(e.target.checked)}
                className="mt-[3px] h-3.5 w-3.5 rounded-sm border-zinc-800 bg-black text-barao-rose focus:ring-barao-rose/30 focus:ring-offset-0 cursor-pointer accent-barao-rose shrink-0"
                required
              />
              <label htmlFor="terms-privacy-checkbox" className="text-[10px] text-zinc-400 font-light leading-relaxed select-none cursor-pointer">
                Declaro que li e aceito os{" "}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onViewTerms) onViewTerms();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (onViewTerms) onViewTerms();
                    }
                  }}
                  className="text-barao-rose hover:text-barao-gold underline cursor-pointer transition font-normal inline border-none bg-transparent p-0 focus:outline-none"
                >
                  Termos de Uso
                </span>{" "}
                e a{" "}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onViewPrivacy) onViewPrivacy();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (onViewPrivacy) onViewPrivacy();
                    }
                  }}
                  className="text-barao-rose hover:text-barao-gold underline cursor-pointer transition font-normal inline border-none bg-transparent p-0 focus:outline-none"
                >
                  Política de Privacidade
                </span>{" "}
                do Meu Barão.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-barao-rose text-black text-xs font-bold uppercase tracking-widest hover:bg-barao-gold disabled:bg-zinc-800 disabled:text-zinc-500 transition-all duration-300 rounded-sm mt-6 active:scale-98 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Sintonizando...</span>
                </>
              ) : (
                <span>{mode === "login" ? "Iniciar Conexão Intima" : "Completar Sintonização"}</span>
              )}
            </button>
          </form>



          {onClose && (
            <button
              onClick={onClose}
              type="button"
              className="w-full text-center text-[10px] uppercase tracking-widest font-mono text-zinc-500 hover:text-white transition mt-4"
            >
              Agora Não / Voltar ao Início
            </button>
          )}
        </>
      )}
    </div>
  );
}
