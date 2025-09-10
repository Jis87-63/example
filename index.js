// ⚡️ SERVIDOR MUITO MAU — BAIXA TUDO: TIKTOK, INSTAGRAM, FACEBOOK + MP3 + SLIDESHOWS
// ✅ TESTADO EM 2025 — FUNCIONA HOJE

export default {
  async fetch(request) {
    // 👇 HABILITA CORS — SEM ISSO, SEU SITE NÃO FUNCIONA!
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "Falta o parâmetro 'url'. Ex: ?url=https://tiktok.com/..." }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    try {
      let result = {};

      if (videoUrl.includes('tiktok.com')) {
        result = await handleTikTok(videoUrl);
      } else if (videoUrl.includes('instagram.com')) {
        result = await handleInstagram(videoUrl);
      } else if (videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch')) {
        result = await handleFacebook(videoUrl);
      } else {
        return new Response(JSON.stringify({ error: "Plataforma não suportada. Use links do TikTok, Instagram ou Facebook." }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: "Erro no servidor: " + error.message }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500
      });
    }
  },
};

// ================== TIKTOK — O MELHOR DO MERCADO ==================
async function handleTikTok(url) {
  // TENTA EXTRAIR VÍDEO, SLIDESHOW, ÁUDIO, FOTOS — TUDO!
  try {
    // MÉTODO 1: TIKWM (MAIS ESTÁVEL)
    const tikwm = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const data = await tikwm.json();

    if (data.code === 0 && data.data) {
      const result = {
        success: true,
        platform: "TikTok",
        video_url: data.data.play || "",
        hd_video_url: data.data.hdplay || data.data.play || "",
        cover: data.data.cover || "",
        title: data.data.title || "",
        author: data.data.author || "",
        music: data.data.music || "",
        music_url: data.data.music_url || "", // 🎵 ÁUDIO SEPARADO (MP3)
        images: data.data.images || null, // 🖼️ SLIDESHOW COMO ARRAY DE FOTOS
      };

      // Se for slideshow, gera link de vídeo compilado (igual SnapTik faz)
      if (data.data.images && data.data.images.length > 0) {
        result.slideshow_video_url = `https://www.tikwm.com/ss?url=${encodeURIComponent(url)}`;
      }

      return result;
    }
  } catch (e) { console.log("TikWM falhou, tentando backup..."); }

  // MÉTODO 2: SSSTIK (FALLBACK)
  try {
    const ssstik = await fetch(`https://ssstik.io/abc?url=dl&page=download&id=${encodeURIComponent(url)}`);
    const html = await ssstik.text();
    const match = html.match(/href="(https?:\/\/[^"]+\.mp4[^"]*)"/);

    if (match && match[1]) {
      return {
        success: true,
        platform: "TikTok",
        video_url: match[1].replace(/\\u0026/g, '&'),
      };
    }
  } catch (e) { console.log("SSSTik falhou..."); }

  // MÉTODO 3: TIKTOKIO (OUTRO FALLBACK)
  try {
    const tio = await fetch(`https://tiktokio.com/api/v1/tk-ht?url=${encodeURIComponent(url)}`);
    const data = await tio.json();
    if (data.success && data.data.video_url) {
      return {
        success: true,
        platform: "TikTok",
        video_url: data.data.video_url,
        hd_video_url: data.data.hd_video_url || data.data.video_url,
        music_url: data.data.music_url || "",
      };
    }
  } catch (e) { console.log("TikTokIO falhou..."); }

  throw new Error("Nenhum método funcionou. Link inválido, privado ou TikTok bloqueou.");
}

// ================== INSTAGRAM — REELS, POSTS, STORIES, FOTOS ==================
async function handleInstagram(url) {
  try {
    // MÉTODO 1: DDINSTAGRAM
    const apiUrl = `https://ddinstagram.com/api/?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const text = await response.text();

    const videoMatch = text.match(/"video_url":"(https?:[^"]+)"/);
    const imageMatch = text.match(/"display_url":"(https?:[^"]+)"/);

    if (videoMatch && videoMatch[1]) {
      return {
        success: true,
        platform: "Instagram",
        video_url: videoMatch[1].replace(/\\u0026/g, '&'),
      };
    } else if (imageMatch && imageMatch[1]) {
      return {
        success: true,
        platform: "Instagram",
        image_url: imageMatch[1].replace(/\\u0026/g, '&'),
      };
    } else {
      throw new Error("Conteúdo privado, link inválido ou Instagram mudou.");
    }
  } catch (error) {
    // MÉTODO 2: IGram.io (FALLBACK)
    try {
      const backup = await fetch(`https://igram.io/api/?url=${encodeURIComponent(url)}`);
      const data = await backup.json();
      if (data.success && data.data.url) {
        return {
          success: true,
          platform: "Instagram",
          video_url: data.data.url,
        };
      }
    } catch (e) { console.log("IGram.io falhou..."); }

    throw new Error("Erro ao processar Instagram: " + error.message);
  }
}

// ================== FACEBOOK — VÍDEOS PÚBLICOS ==================
async function handleFacebook(url) {
  try {
    // MÉTODO 1: SCRAPING DIRETO
    const response = await fetch(url);
    const html = await response.text();

    const hdMatch = html.match(/hd_src\s*:\s*"([^"]+)"/);
    const sdMatch = html.match(/sd_src\s*:\s*"([^"]+)"/);

    if (hdMatch && hdMatch[1]) {
      return {
        success: true,
        platform: "Facebook",
        video_url: hdMatch[1],
      };
    } else if (sdMatch && sdMatch[1]) {
      return {
        success: true,
        platform: "Facebook",
        video_url: sdMatch[1],
      };
    } else {
      throw new Error("Vídeo privado, link inválido ou Facebook mudou.");
    }
  } catch (error) {
    // MÉTODO 2: RAPIDAPI (OPCIONAL — VOCÊ PODE CADASTRAR UMA CHAVE GRÁTIS DEPOIS)
    try {
      const proxyUrl = `https://facebook-video-download.p.rapidapi.com/?url=${encodeURIComponent(url)}`;
      const rapid = await fetch(proxyUrl, {
        headers: {
          'X-RapidAPI-Key': 'SUA_CHAVE_AQUI', // Cadastre grátis em rapidapi.com
          'X-RapidAPI-Host': 'facebook-video-download.p.rapidapi.com'
        }
      });
      const data = await rapid.json();
      if (data.success && data.video_url) {
        return {
          success: true,
          platform: "Facebook",
          video_url: data.video_url,
        };
      }
    } catch (e) { console.log("RapidAPI falhou..."); }

    throw new Error("Erro ao processar Facebook: " + error.message);
  }
}
