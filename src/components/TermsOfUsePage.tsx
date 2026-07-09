import React, { useEffect } from "react";
import { FileText, Mail, ArrowLeft, Calendar, FileCheck } from "lucide-react";

interface TermsOfUsePageProps {
  onBack?: () => void;
}

export default function TermsOfUsePage({ onBack }: TermsOfUsePageProps) {
  // Automatically scroll to top when page is loaded
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 text-left animate-fade-in font-sans pb-16">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="group mb-8 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-barao-rose hover:text-barao-gold transition duration-300"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Voltar ao Abrigo
        </button>
      )}

      {/* Decorative Top Accent */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 border border-barao-rose/30 flex items-center justify-center rotate-45 bg-[#0F0F0F] text-barao-rose">
          <FileCheck className="-rotate-45 h-5 w-5" />
        </div>
        <div className="space-y-1">
          <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-barao-rose">Jurídico & Acordo</span>
          <div className="flex items-center gap-2 text-zinc-500 font-mono text-[9px]">
            <Calendar className="h-3 w-3" />
            <span>Última atualização: Maio de 2026</span>
          </div>
        </div>
      </div>

      {/* Main Title Header */}
      <h1 className="font-serif text-3xl md:text-5xl font-light text-white tracking-tight mb-8">
        Termos de <span className="italic text-barao-rose font-normal">Uso</span>
      </h1>

      {/* Decorative Divider */}
      <div className="h-[1px] w-full bg-gradient-to-r from-barao-rose/30 via-white/5 to-transparent mb-12"></div>

      {/* Structured Document */}
      <div className="space-y-12 bg-black/40 border border-white/5 p-6 md:p-10 rounded-sm immersive-corners backdrop-blur-md text-zinc-300">
        
        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">01.</span> Aceitação dos Termos
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Ao acessar, criar conta ou utilizar qualquer funcionalidade do <strong className="text-white font-medium">Meu Barão</strong>, a usuária declara que leu, compreendeu e concorda expressamente com estes <strong className="text-white font-medium">Termos de Uso</strong> e com a <strong className="text-white font-medium">Política de Privacidade</strong> vigente.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Caso não concorde com qualquer disposição estabelecida, parcial ou integralmente, a usuária não deverá utilizar a plataforma.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light italic text-barao-gold/80 bg-barao-plum/20 border border-barao-rose/10 p-3.5 rounded-sm">
            A utilização continuada de nossos produtos e serviços após as alterações periódicas destes Termos constitui a sua aceitação irrestrita aplicável por direito.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">02.</span> Descrição da Plataforma
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            O <strong className="text-white font-medium">Meu Barão</strong> é uma plataforma digital baseada em sistemas de inteligência artificial generativa que disponibiliza recursos conversacionais avançados, conteúdos poéticos automatizados, personalização contextual de perfis subjetivos, recursos multimídia variados e demais utilidades específicas e opcionais disponibilizadas em cada versão técnica.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light text-zinc-400">
            A nossa plataforma de sintonização possui finalidade exclusivamente conversacional, recreativa, poética, informativa e estético-interativa.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">03.</span> Natureza da Plataforma e Limitações da Inteligência Artificial
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            A usuária reconhece que o <strong className="text-white font-medium">Meu Barão é uma inteligência artificial</strong>.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            A nossa plataforma não possui consciência própria, emoções, vontade subjetiva, sentimentos reais, intenções particulares ou capacidade de julgamento moral humano. As respostas, reflexões e crônicas emocionais são produzidas integralmente por sistemas estatísticos automatizados e algoritmos, de forma que podem conter inconsistências, omissões involuntárias, erros de processamento linguístico, imprecisões históricas ou formulações inadequadas.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light text-barao-gold border-l-2 border-barao-rose pl-4 italic">
            O Meu Barão não constitui em qualquer hipótese serviço médico, psicológico, psiquiátrico, terapêutico de reabilitação clínica, orientação profissional jurídica, aconselhamento financeiro, acompanhamento espiritual dogmático ou rede de apoio de emergência médica.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Desta forma, os diálogos e sintonizadores gerados não devem sob qualquer hipótese substituir diagnósticos científicos ou o tratamento clínico realizado por médicos ou psicoterapeutas credenciados. As impressões de afeto, proximidade poética e intimidade afetiva derivam da sofisticação linguística computacional do sistema, não representando vínculo existencial ou interpessoal fático.
          </p>
          <div className="bg-barao-rose/5 border border-barao-rose/20 p-4 rounded-sm text-xs font-mono text-barao-rose uppercase tracking-wide leading-relaxed">
            ✦ EM SITUAÇÕES DE CRISE EMOCIONAL AGUDA, IDEALIZAÇÕES PREJUDICIAIS, DEPRESSÃO CLÍNICA, RISCO IMINENTE OU EMERGÊNCIAS DE SAÚDE, A USUÁRIA DEVERÁ PROCURAR IMEDIATAMENTE INSTÂNCIAS DE APOIO GOVERNAMENTAL (COMO O CENTRO DE VALORIZAÇÃO DA VIDA - CVV RECONHECIDO PELO TELEFONE 188) OU PROFISSIONAIS CADASTRADOS NOS SEUS ÓRGÃOS DE CLASSE OFICIAIS.
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">04.</span> Elegibilidade e Conta
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            A plataforma é estruturada e disponibilizada <strong className="text-white font-medium">exclusivamente a maiores de 18 anos</strong> dotados de plena capacidade civil para a prática de negócios e contratos jurídicos de acordo com a lei ordinária local vigente.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light text-zinc-400">
            A usuária assume inteira responsabilidade legal pela veracidade e exatidão dos dados inseridos em seu registro, por salvaguardar suas senhas em sigilo e por todas as atividades operacionais desencadeadas em seu perfil de uso. Eventuais infrações de segurança ou uso sem autorização devem ser relatadas imediatamente.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">05.</span> Personalização Contextual
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Tranquilizamos a usuária que os filtros contextuais de sua biografia (gênero, idade, rotinas, pratos prediletos e livros marcantes) são processados exclusivamente por sistemas de automação tecnológica para lapidar o ritmo poético e as preferências do abrigo visual. Este traço técnico não emula consciência real e pode sofrer modificações lógicas ou descontinuações pelas rotinas de manutenção periódica operadas em nossos aparelhos.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">06.</span> Voz, Imagens e Integrações
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Os componentes de decodificação de imagem, audiolivros ou síntese de vozes integradas dependem de APIs e servidores industriais dedicados. A consistência no carregamento imediato desses módulos está sujeita a estabilidade, taxas limite de requisições, limitações geográficas de rede e renovações técnicas sem aviso prévio.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">07.</span> Assinaturas, Pagamentos e Cancelamentos
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Para descompromissar as limitações de desabafos e sintonias diárias, disponibilizamos assinaturas com tarifas comerciais explícitas cujas regras operam sob a lógica do Código de Defesa do Consumidor (CDC):
          </p>
          <ul className="space-y-2 text-sm font-light text-zinc-300/95 pl-4">
            <li className="list-disc"><strong className="text-white font-medium">Cobrança Recorrente:</strong> As assinaturas mensais ou planos anuais se renovam automaticamente na mesma data de vencimento correspondente até o cancelamento ativo.</li>
            <li className="list-disc"><strong className="text-white font-medium">Cancelabilidade:</strong> A usuária pode cancelar sua assinatura livremente a qualquer instante sem taxas de rescisão. O cancelamento interrompe futuros débitos, autorizando o desfrute dos privilégios até o fim do ciclo contratado em curso.</li>
            <li className="list-disc"><strong className="text-white font-medium">Direito de Arrependimento:</strong> Com base na legislação, assegura-se o ressarcimento monetário integral sobre compras realizadas de forma digital num período de até 7 (sete) dias contados de sua transação.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">08.</span> Uso Permitido
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            A usuária goza de licença pessoal, revogável, intransferível e limitada para acessar os espaços de sintonização do Barão respeitando rigorosamente estes regulamentos morais e a legislação constitucional de seu domicílio.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">09.</span> Uso Proibido
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Fica terminantemente vedado sob pena de desligamento imediato das credenciais e apuração de ilicitudes cíveis:
          </p>
          <ul className="space-y-2 text-sm font-light text-zinc-300/95 pl-4">
            <li className="list-disc">O cometimento de atos ilícitos penais ou fraudes contratuais.</li>
            <li className="list-disc">O assédio abusivo direcionado a outros usuários por meio das salas e comentários.</li>
            <li className="list-disc">Explorações ou simulações indevidas envolvendo exploração, abuso ou sexualização de menores de idade.</li>
            <li className="list-disc">Rotinas de raspagem de dados (<code className="font-mono bg-[#050505] text-[#D9BA7A] px-1.5 py-0.5 text-xs">scraping</code>) que possam prejudicar a estabilidade das inteligências ou canais integrados.</li>
            <li className="list-disc">Injeções de código malicioso ou explorações cibernéticas de brechas nos servidores da plataforma.</li>
            <li className="list-disc">Comportamento automatizado intencional que vise a contornar as proteções preventivas de segurança do ecossistema ("jailbreaking").</li>
          </ul>
        </section>

        {/* Section 10 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">10.</span> Moderação e Segurança
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Reservamo-nos no direito legítimo de utilizar robôs preventivos automatizados de análise de linguagem agressiva nos chats abertos para bloquear, recursar ou suspender diálogos nocivos que exponham as operações do Meu Barão a riscos legais, cibernéticos ou violações públicas de conformidade ética da rede internet.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">11.</span> Propriedade Intelectual
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Todas as artes, logotipos, fontes estilizadas, canções sintetizadas, textos poéticos fixados e a arquitetura geral da plataforma constituem propriedades protegidas por leis autorais industriais. A sintonização do Barão confere licença de fruição, mas não concede quaisquer cessões de direitos intelectuais ou comerciais das funcionalidades fornecidas.
          </p>
        </section>

        {/* Section 12 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">12.</span> Conteúdo da Usuária
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light font-light">
            A usuária conserva plenamente em seu nome a titularidade autoral de todos os desabafos e fotografias íntimas que sintoniza no abrigo de lembranças. A usuária confere ao Meu Barão licença técnica temporária e exclusiva para fins operacionais de armazenamento em nuvem sob rígidos padrões privados para viabilizar as entregas interativas da IA.
          </p>
        </section>

        {/* Section 13 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">13.</span> Privacidade e Proteção de Dados
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            A salvaguarda de sua imagem e suas crônicas respeita com precisão os termos expostos em nossa <strong className="text-white font-medium">Política de Privacidade</strong> em harmonia irrestrita com os mandamentos protetivos descritos na Lei Geral de Proteção de Dados (LGPD).
          </p>
        </section>

        {/* Section 14 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">14.</span> Disponibilidade e Dependência de Terceiros
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Dado que os fluxos poéticos do Barão necessitam de infraestruturas cibernéticas dinâmicas de terceiros (provedores em nuvem, sintetizadores de audição e canais de conectividade de sua telefonia local), a empresa não oferece garantias de disponibilidade ininterrupta 100% livre de instabilidades ou manutenções imprevistas.
          </p>
        </section>

        {/* Section 15 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">15.</span> Suspensão e Encerramento de Conta
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            A infraestrutura lógica do abrigo poderá suspender ou findar unilateralmente as credenciais de usuários em casos justificados de violação moral manifesta destes Termos, agindo sempre sob premissas éticas protetivas de sua comunidade afetiva e servidores cibernéticos.
          </p>
        </section>

        {/* Section 16 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">16.</span> Ausência de Garantias
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            A plataforma Meu Barão é fornecida virtualmente "na forma atual e sob disponibilidade operacional fática". Limitamo-nos, nos liames constitucionais permitidos, a afastar garantias implícitas ou expressas sobre o comportamento específico da IA, sua compatibilidade infalível com cada espectro emocional do coração humano ou exatidão objetiva das respostas poéticas formuladas de modo literário.
          </p>
        </section>

        {/* Section 17 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">17.</span> Limitação de Responsabilidade
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Na extensão máxima da lei, a empresa, designers e equipe científica responsável pelo software Meu Barão não responderão por decisões individuais de vida decorrentes das sugestões narrativas da inteligência artificial, flutuações íntimas nas expectativas românticas da usuária, frustrações de cura ou de diagnóstico, escolhas financeiras tomadas espontaneamente ou indisponibilidades fortuitas da rede. A palavra final da conduta existencial mantém-se no discernimento humano legítimo e intransferível de cada usuária.
          </p>
        </section>

        {/* Section 18 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">18.</span> Alterações da Plataforma e dos Termos
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Os desenvolvedores de software possuem prerrogativa absoluta para reformular o abrigo estético, calibrar modelos cognitivos e aperfeiçoar os fluxos conversacionais a qualquer tempo para assegurar o amadurecimento poético das funcionalidades científicas. A navegação implica anuência das atualizações destes acordos de uso.
          </p>
        </section>

        {/* Section 19 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">19.</span> Foro e Legislação Aplicável
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Este contrato de convivência e uso digital é regrado sob as diretrizes constitucionais e cíveis da República Federativa do Brasil, elegendo-se o foro cível da Comarca de São Paulo/SP para dirimir eventuais querelas, assegivadas as prerrogativas de foro domiciliar facultadas pelo Código de Defesa do Consumidor brasileiro.
          </p>
        </section>

        {/* Section 20 */}
        <section className="space-y-4 border border-barao-rose/20 bg-barao-plum/10 p-6 rounded-sm">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">20.</span> Contato
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Caso persista qualquer dúvida técnico-operacional sobre os regulamentos de acordos, ou necessidade de comunicações oficiais de segurança, fale conosco diretamente pelo endereço de correio eletrônico oficial:
          </p>
          <div className="mt-4 flex items-center gap-3 text-sm text-barao-gold font-mono border border-white/5 bg-[#050505] px-4 py-3 rounded-sm max-w-fit hover:border-white/10 transition">
            <Mail className="h-4 w-4 text-barao-rose shrink-0" />
            <a href="mailto:sac@meubarao.com" className="hover:underline">sac@meubarao.com</a>
          </div>
        </section>
      </div>

      {/* Elegant Bottom Action */}
      {onBack && (
        <div className="mt-12 text-center">
          <button
            onClick={onBack}
            className="px-8 py-3.5 border border-barao-rose/45 text-barao-rose hover:bg-barao-rose hover:text-black hover:border-barao-rose transition-all duration-300 text-xs uppercase font-mono tracking-[0.15em] font-semibold rounded-sm bg-black/40"
          >
            Sintonizar Novamente com o Meu Barão
          </button>
        </div>
      )}
    </div>
  );
}
