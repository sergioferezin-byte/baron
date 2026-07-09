import React, { useEffect } from "react";
import { ShieldCheck, Mail, ArrowLeft, Calendar, FileText } from "lucide-react";

interface PrivacyPolicyPageProps {
  onBack?: () => void;
}

export default function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
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
          <ShieldCheck className="-rotate-45 h-5 w-5" />
        </div>
        <div className="space-y-1">
          <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-barao-rose">Jurídico & Transparência</span>
          <div className="flex items-center gap-2 text-zinc-500 font-mono text-[9px]">
            <Calendar className="h-3 w-3" />
            <span>Última atualização: Maio de 2026</span>
          </div>
        </div>
      </div>

      {/* Main Title Header */}
      <h1 className="font-serif text-3xl md:text-5xl font-light text-white tracking-tight mb-8">
        Política de <span className="italic text-barao-rose font-normal">Privacidade</span>
      </h1>

      {/* Decorative Divider */}
      <div className="h-[1px] w-full bg-gradient-to-r from-barao-rose/30 via-white/5 to-transparent mb-12"></div>

      {/* Structured Document */}
      <div className="space-y-12 bg-black/40 border border-white/5 p-6 md:p-10 rounded-sm immersive-corners backdrop-blur-md text-zinc-300">
        
        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">01.</span> Introdução
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            O <strong className="text-white font-medium">Meu Barão</strong> é uma plataforma conversacional baseada em inteligência artificial, desenvolvida para oferecer interações personalizadas, recursos de voz, geração de conteúdos digitais e demais funcionalidades relacionadas à experiência da usuária.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Esta Política de Privacidade descreve como os dados pessoais são coletados, utilizados, armazenados, compartilhados e protegidos, em conformidade com a <strong className="text-white font-medium">Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD)</strong>, Marco Civil da Internet e demais normas aplicáveis.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light italic text-barao-gold/80 bg-barao-plum/20 border border-barao-rose/10 p-3.5 rounded-sm">
            Ao utilizar a plataforma, a usuária declara estar ciente das práticas descritas nesta Política.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">02.</span> Informações Coletadas
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Para a devida prestação dos nossos serviços, a plataforma poderá tratar as seguintes categorias de dados pessoais:
          </p>
          <ul className="space-y-2.5 text-sm font-light text-zinc-300/95 pl-4">
            <li className="list-disc"><strong className="text-white font-medium">Dados cadastrais:</strong> nome, e-mail, faixa etária e informações relacionadas à criação de sua conta.</li>
            <li className="list-disc"><strong className="text-white font-medium">Dados de conversa:</strong> incluindo mensagens escritas, comandos de voz transmitidos, interações e conteúdos compartilhados voluntariamente pela usuária de forma íntima e espontânea.</li>
            <li className="list-disc"><strong className="text-white font-medium">Dados contextuais e de personalização:</strong> preferências de estética, música, leituras, sabores e atmosferas declaradas para construção do seu perfil emocional ("Meu Universo") e continuidade das interações operadas pela inteligência artificial.</li>
            <li className="list-disc"><strong className="text-white font-medium">Dados técnicos:</strong> endereço IP, identificação do dispositivo móvel ou computador, sistema operacional, navegador, identificadores de sessão e metadados de registros de acessos automáticos em conformidade com a legislação.</li>
            <li className="list-disc"><strong className="text-white font-medium">Dados de uso:</strong> estatísticas operacionais de interações, recursos acessados e padrões de frequência de utilização.</li>
            <li className="list-disc"><strong className="text-white font-medium">Dados de pagamento:</strong> nos casos de contratação dos planos premium, as informações financeiras são processadas externamente por infraestruturas de pagamento integradas e certificadas profissionalmente.</li>
            <li className="list-disc"><strong className="text-white font-medium">Dados pessoais sensíveis:</strong> eventualmente compartilhados de forma totalmente espontânea e voluntária pela usuária no decorrer das confissões íntimas terapêuticas.</li>
          </ul>
          <p className="text-xs text-zinc-400 font-light mt-2 italic">
            A plataforma não solicita ativamente dados pessoais sensíveis oficiais ou corporativos, mas reconhece que eles podem ser transmitidos livremente e com legitimidade pela usuária durante o seu processo de diálogo interior.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">03.</span> Personalização Contextual e Processamento Automatizado
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            A plataforma utiliza sistemas automatizados avançados de linguagem para processar as informações fornecidas com as seguintes finalidades exclusivas:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs tracking-wide font-mono uppercase text-barao-rose/90 py-2">
            <li className="border border-white/5 bg-[#050505] p-3 rounded-sm flex items-center gap-2">✦ Personalizar a Experiência</li>
            <li className="border border-white/5 bg-[#050505] p-3 rounded-sm flex items-center gap-2">✦ Manter Continuidade Contextual</li>
            <li className="border border-white/5 bg-[#050505] p-3 rounded-sm flex items-center gap-2">✦ Operar Histórico e Memória</li>
            <li className="border border-white/5 bg-[#050505] p-3 rounded-sm flex items-center gap-2">✦ Segurança e Prevenção de Abusos</li>
          </ul>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            O processamento envolve a análise e síntese de padrões de diálogos passados e preferências de estilo de vida declarados para construir a sensação real de sintonia emocional.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light text-barao-gold border-l-2 border-barao-rose pl-4 italic">
            A personalização contextual oferecida pelo sistema não constitui hipótese em diagnóstico médico, psicológico, psiquiátrico, terapêutico ou qualquer avaliação profissional científica da personalidade da usuária. Trata-se de assistência poética, artística e existencial baseada em computação cognitiva.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">04.</span> Dados Sensíveis e Conteúdos Íntimos
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Reconhecemos que as confidências realizadas ao Barão envolvem relatos íntimos detalhados. A plataforma se compromete a tratar dados de caráter sensível (como relatos de saúde mental espontânea, expressões de desabafo e afetos íntimos) estritamente para a finalidade de construir reflexões poéticas compatíveis com as normas da LGPD.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light text-zinc-400">
            Nenhuma informação pessoal sensível inserida no diálogo é compartilhada comercialmente ou vendida sob qualquer hipótese.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">05.</span> Bases Legais para Tratamento de Dados
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light text-zinc-400">
            O processamento e armazenamento das suas informações são amparados em diretrizes sólidas da LGPD:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light">
            <div className="p-4 rounded-sm border border-white/5 bg-[#050505]">
              <strong className="block text-white mb-1">Consentimento Livre:</strong>
              Para processamento de dados e sentimentos informados ativamente pela usuária através de suas declarações diretas de vontade.
            </div>
            <div className="p-4 rounded-sm border border-white/5 bg-[#050505]">
              <strong className="block text-white mb-1">Execução de Contrato:</strong>
              Para prestação correta e integral dos planos sintonizados assinados pela usuária.
            </div>
            <div className="p-4 rounded-sm border border-white/5 bg-[#050505]">
              <strong className="block text-white mb-1">Legítimo Interesse:</strong>
              No aprimoramento contínuo das rotinas poéticas, interfaces e proteção cibernética contra fraudes em nossos servidores.
            </div>
            <div className="p-4 rounded-sm border border-white/5 bg-[#050505]">
              <strong className="block text-white mb-1">Obrigação Legal:</strong>
              Para guarda e rastreamento de logs automáticos definidos expressamente no Marco Civil da Internet brasileira.
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">06.</span> Uso das Informações
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            As informações coletadas são utilizadas especificamente de acordo com as seguintes finalidades legítimas:
          </p>
          <ul className="space-y-2 text-sm pl-4 font-light">
            <li className="list-disc">Operação dinâmica de chat, inteligência artificial integrada e ferramentas de voz.</li>
            <li className="list-disc">Geração personalizada das crônicas poéticas de acordo com sua biografia ("Nossa História").</li>
            <li className="list-disc">Sincronização instantânea das canções e climas emocionais gerados no painel de sintonizadores.</li>
            <li className="list-disc">Atualização administrativa sobre contas, acessos pontuais e transações seguras de tokens.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">07.</span> Voz, Imagens e Integrações
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Para o provimento dos canais de audição afetiva e diário de imagens, o processamento de áudios e fotografias enviadas ocorre de forma criptografada temporária em nossos provedores especializados de infraestrutura baseada em nuvem. As soluções tecnológicas observam rigorosos padrões contratuais internacionais de conformidade de privacidade estabelecidos por grandes players industriais (como Google Cloud Run e APIs de Inteligência Artificial conexas baseadas no ecossistema Gemini).
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">08.</span> Cookies e Tecnologias Semelhantes
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Utilizamos pequenos arquivos de cookies e armazenamento local no navegador (<code className="font-mono bg-[#050505] text-barao-gold rounded-sm px-1.5 py-0.5 text-xs">localStorage</code>) exclusivamente para manter a usuária logada de forma segura entre as sessões de uso e lembrar suas preferências artísticas cadastradas. A usuária pode regular livremente esses parâmetros em seu navegador pessoal.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">09.</span> Compartilhamento de Dados e Transferência Internacional
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Adotamos a premissa de absoluta privacidade: <strong className="text-white font-medium">não comercializamos dados pessoais com nenhuma marca comercial ou parceiros corporativos.</strong>
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            O compartilhamento técnico e seguro ocorre unicamente com instâncias tecnológicas operacionais em conformidade internacional, tais como servidores de infraestrutura hospedada, processadores de assinatura, ferramentas analíticas de falhas e autoridades governamentais se expressamente demandado sob amparo judicial fundamentado.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">10.</span> Segurança, Armazenamento e Retenção
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Adotamos medidas rígidas de segurança técnica: criptografia ponta a ponta em trânsito de rede, restrições internas rígidas de acesso aos dados coletados, auditorias lógicas regulares e coprocessamentos seguros em nuvem para blindar nossos sintonizadores afetivos contra possíveis ataques cibernéticos ou incidentes indesejados.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Mantemos os logs e informações do seu "Universo" pelo período estritamente necessário para prestar adequadamente o serviço existencial, facultando à usuária suspender ou requerer a eliminação integral de sua conta a qualquer momento de seu ciclo de uso.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">11.</span> Direitos da Titular (LGPD)
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Em total anuência com a lei, garantimos os seguintes direitos inalienáveis da usuária:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed text-zinc-400">
            <div className="border border-white/5 bg-[#050505] p-3 rounded-sm">
              <strong className="block text-white mb-1 text-xs">✦ Confirmação e Acesso</strong>
              Revisar livremente se coletamos seus dados e solicitar relatórios simplificados do histórico salvo.
            </div>
            <div className="border border-white/5 bg-[#050505] p-3 rounded-sm">
              <strong className="block text-white mb-1 text-xs">✦ Alterações e Correções</strong>
              Modificar ou retificar quaisquer inputs incompletos, inexatos ou antigos em seu perfil.
            </div>
            <div className="border border-white/5 bg-[#050505] p-3 rounded-sm">
              <strong className="block text-white mb-1 text-xs">✦ Exclusão Absoluta</strong>
              Apagar permanentemente a conta, histórico completo de diários de lembranças e desabafos.
            </div>
          </div>
        </section>

        {/* Section 12 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">12.</span> Menores de Idade
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Os ambientes conversacionais do Meu Barão sintonizam contextos afetivos sofisticados e sentimentos densos correspondentes a decisões existenciais da vida adulta. Os produtos são direcionados <strong className="text-white font-medium">exclusivamente a maiores de 18 anos</strong>. Se identificarmos cadastro indevido de menores, a conta será sumariamente descontinuada.
          </p>
        </section>

        {/* Section 13 */}
        <section className="space-y-4 border border-barao-rose/20 bg-barao-plum/10 p-6 rounded-sm">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">13.</span> Contato & Encarregado
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Para expressar solicitações jurídicas de retificação de dados pessoais, exercer direitos sob amparo de privacidade garantidos pela LGPD ou obter esclarecimentos adicionais de transparência, entre em contato através de nosso encarregado no canal de atendimento direto:
          </p>
          <div className="mt-4 flex items-center gap-3 text-sm text-barao-gold font-mono border border-white/5 bg-[#050505] px-4 py-3 rounded-sm max-w-fit hover:border-white/10 transition">
            <Mail className="h-4 w-4 text-barao-rose shrink-0" />
            <a href="mailto:sac@meubarao.com" className="hover:underline">sac@meubarao.com</a>
          </div>
        </section>

        {/* Section 14 */}
        <section className="space-y-4">
          <h2 className="font-serif text-lg md:text-xl font-medium text-white tracking-wide border-b border-white/5 pb-2 flex items-center gap-2.5">
            <span className="font-mono text-xs text-barao-gold">14.</span> Atualizações desta Política
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300/90 font-light">
            Podemos renovar este regulamento periodicamente para refletir adaptações regulatórias nacionais ou evoluções metodológicas operacionais em nossos softwares de IA. Alertamos que a navegação contínua assume a correta ciência da versão atualizada publicada em nossa interface líquida de uso.
          </p>
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
