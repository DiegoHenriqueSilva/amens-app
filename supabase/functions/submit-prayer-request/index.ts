import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ModerationPolicy = {
  code: string;
  label: string;
  severity: "low" | "medium" | "high";
};

type ModerationResult = {
  decision: "approved" | "needs_review";
  riskScore: number;
  policies: ModerationPolicy[];
  normalizedContent: string;
};

const POLICY_WEIGHTS: Record<ModerationPolicy["severity"], number> = {
  low: 1,
  medium: 3,
  high: 5,
};

const addPolicy = (
  policies: ModerationPolicy[],
  seen: Set<string>,
  policy: ModerationPolicy,
) => {
  if (seen.has(policy.code)) return;
  seen.add(policy.code);
  policies.push(policy);
};

const normalizeText = (value: string) => {
  const leetMap: Record<string, string> = {
    "@": "a",
    "4": "a",
    "0": "o",
    "1": "i",
    "!": "i",
    "3": "e",
    "$": "s",
    "5": "s",
    "7": "t",
  };

  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[@401!3$57]/g, (char) => leetMap[char] ?? char)
    .replace(/([a-z])[._-]+(?=[a-z])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
};

const COMMON_FIRST_NAMES = new Set([
  "ana",
  "antonio",
  "bruno",
  "carlos",
  "daniel",
  "danilo",
  "eduardo",
  "fernanda",
  "fernando",
  "gabriel",
  "joao",
  "jose",
  "juliana",
  "lucas",
  "luiz",
  "maria",
  "marcos",
  "mateus",
  "miguel",
  "paulo",
  "pedro",
  "rafael",
  "roberto",
  "vinicius",
]);

const COMMON_SURNAMES = new Set([
  "almeida",
  "alves",
  "barbosa",
  "costa",
  "dias",
  "ferreira",
  "gomes",
  "lima",
  "martins",
  "oliveira",
  "pereira",
  "rocha",
  "santos",
  "silva",
  "souza",
]);

const NAME_STOPWORDS = new Set([
  "aos",
  "com",
  "das",
  "dos",
  "ela",
  "ele",
  "estou",
  "filha",
  "filho",
  "irma",
  "irmao",
  "meu",
  "minha",
  "para",
  "pela",
  "pelo",
  "por",
  "que",
  "rezem",
  "uma",
]);

const hasFullName = (text: string) => {
  const words = text.match(/\b[a-z]{3,}\b/g) || [];

  for (let index = 0; index < words.length - 1; index += 1) {
    const first = words[index];
    const second = words[index + 1];
    const third = words[index + 2];

    if (NAME_STOPWORDS.has(first) || NAME_STOPWORDS.has(second)) continue;

    if (
      COMMON_FIRST_NAMES.has(first) &&
      (COMMON_FIRST_NAMES.has(second) || COMMON_SURNAMES.has(second))
    ) {
      return true;
    }

    if (
      third &&
      !NAME_STOPWORDS.has(third) &&
      COMMON_FIRST_NAMES.has(first)
    ) {
      return true;
    }
  }

  return false;
};

const moderateContent = (title: string, content: string, isAnonymous: boolean): ModerationResult => {
  const normalizedContent = normalizeText(`${title} ${content}`);
  const compact = normalizedContent.replace(/\D/g, "");
  const policies: ModerationPolicy[] = [];
  const seen = new Set<string>();

  if (/\b[\w.-]+@[\w.-]+\.[a-z]{2,}\b/.test(content.toLowerCase())) {
    addPolicy(policies, seen, {
      code: "email",
      label: "e-mail ou contato pessoal",
      severity: "medium",
    });
  }

  if (/(https?:\/\/|www\.|\.com\b|\.com\.br\b|\.net\b|\.org\b)/i.test(content)) {
    addPolicy(policies, seen, {
      code: "external_link",
      label: "link externo",
      severity: "medium",
    });
  }

  if (/(cpf|rg|documento|identidade)\b/.test(normalizedContent) || /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(content)) {
    addPolicy(policies, seen, {
      code: "document",
      label: "documento pessoal",
      severity: "high",
    });
  }

  if (/(pix|chave pix|banco|agencia|conta bancaria|dados bancarios)/.test(normalizedContent)) {
    addPolicy(policies, seen, {
      code: "financial_data",
      label: "dados financeiros ou chave PIX",
      severity: "high",
    });
  }

  if (/(doacao|doar|vaquinha|transferencia|deposito|dinheiro|pagar boleto|ajuda financeira)/.test(normalizedContent)) {
    addPolicy(policies, seen, {
      code: "financial_request",
      label: "pedido financeiro",
      severity: "high",
    });
  }

  if (compact.length >= 10 && /(?:\d[\s().-]*){10,}/.test(content)) {
    addPolicy(policies, seen, {
      code: "phone",
      label: "telefone ou contato pessoal",
      severity: "high",
    });
  }

  if (/(rua|avenida|av\.|travessa|alameda|rodovia|numero|nº|apto|apartamento|bloco)\s+[a-z0-9]/.test(normalizedContent)) {
    addPolicy(policies, seen, {
      code: "address",
      label: "endereço ou localização específica",
      severity: "high",
    });
  }

  if (hasFullName(normalizedContent)) {
    addPolicy(policies, seen, {
      code: "full_name",
      label: "nome completo ou identificação pessoal",
      severity: "medium",
    });
  }

  if (/(idiota|imbecil|burro|maldito|desgracado|lixo|vagabundo)/.test(normalizedContent)) {
    addPolicy(policies, seen, {
      code: "offense",
      label: "ofensa ou linguagem agressiva",
      severity: "medium",
    });
  }

  if (/(matar|morte a|espancar|agredir|ameacar|vinganca|vou acabar com)/.test(normalizedContent)) {
    addPolicy(policies, seen, {
      code: "violence",
      label: "ameaça ou violência explícita",
      severity: "high",
    });
  }

  if (/(racista|nazista|preto sujo|viado|bicha|traveco|macaco|judeu sujo)/.test(normalizedContent)) {
    addPolicy(policies, seen, {
      code: "hate",
      label: "discurso de ódio ou preconceito",
      severity: "high",
    });
  }

  if (/(sexo explicito|pornografia|nudez|abuso sexual|estupro|menor de idade)/.test(normalizedContent)) {
    addPolicy(policies, seen, {
      code: "sexual_content",
      label: "conteúdo sexual explícito",
      severity: "high",
    });
  }

  if (/(vou me matar|quero me matar|tirar minha vida|suicidio|automutilacao|me cortar)/.test(normalizedContent)) {
    addPolicy(policies, seen, {
      code: "self_harm",
      label: "automutilação explícita",
      severity: "high",
    });
  }

  if (isAnonymous && /(assinado|me chamo|meu nome e|sou de|moro em)/.test(normalizedContent)) {
    addPolicy(policies, seen, {
      code: "anonymous_identity",
      label: "informação que pode revelar sua identidade",
      severity: "medium",
    });
  }

  const riskScore = policies.reduce((score, policy) => score + POLICY_WEIGHTS[policy.severity], 0);

  return {
    decision: riskScore >= 3 ? "needs_review" : "approved",
    riskScore,
    policies,
    normalizedContent,
  };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const {
      title = "",
      content = "",
      location = "",
      is_anonymous = false,
      confirm_review = false,
    } = await req.json();

    const cleanTitle = String(title).trim();
    const cleanContent = String(content).trim();
    const cleanLocation = String(location).trim();
    const isAnonymous = Boolean(is_anonymous);

    if (cleanTitle.length < 5) {
      return jsonResponse({ error: "Title must have at least 5 characters" }, 400);
    }

    if (!cleanContent) {
      return jsonResponse({ error: "Content is required" }, 400);
    }

    if (cleanContent.length > 1000) {
      return jsonResponse({ error: "Content is too long" }, 400);
    }

    const moderation = moderateContent(cleanTitle, cleanContent, isAnonymous);
    if (moderation.decision === "needs_review" && !confirm_review) {
      return jsonResponse({
        status: "needs_review",
        policies: moderation.policies,
        risk_score: moderation.riskScore,
      });
    }

    const metadata = userData.user.user_metadata ?? {};
    const fullName = typeof metadata.full_name === "string" ? metadata.full_name : "";
    const firstName = fullName.split(" ")[0] || "Anônimo";
    const requestStatus = moderation.decision === "needs_review" ? "pending_review" : "active";

    const { data: prayerRequest, error: insertError } = await serviceClient
      .from("prayer_requests")
      .insert({
        title: cleanTitle,
        content: cleanContent,
        location: isAnonymous ? null : cleanLocation || null,
        prayer_count: 0,
        user_id: userData.user.id,
        author_name: isAnonymous ? null : firstName,
        is_anonymous: isAnonymous,
        status: requestStatus,
      })
      .select("id, title, status, is_anonymous")
      .single();

    if (insertError) throw insertError;

    await serviceClient.from("prayer_moderation_reviews").insert({
      prayer_request_id: prayerRequest.id,
      user_id: userData.user.id,
      original_title: cleanTitle,
      original_content: cleanContent,
      normalized_content: moderation.normalizedContent,
      detected_policies: moderation.policies,
      risk_score: moderation.riskScore,
      decision: requestStatus,
    });

    return jsonResponse({
      status: requestStatus === "active" ? "approved" : "pending_review",
      prayer_request: prayerRequest,
      policies: moderation.policies,
      risk_score: moderation.riskScore,
    });
  } catch (error) {
    console.error("submit-prayer-request error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
