export default {
  async fetch(request) {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "Envie um link: ?url=LINK_DO_VIDEO" }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      let result;

      if (videoUrl.includes('tiktok.com')) {
        result = await downloadTikTok(videoUrl);
      } else if (videoUrl.includes('instagram.com')) {
        result = await downloadInstagram(videoUrl);
      } else if (videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch')) {
        result = await downloadFacebook(videoUrl);
      } else {
        return new Response(JSON.stringify({ error: "Só aceito links do TikTok, Instagram ou Facebook." }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: "Erro no servidor: " + error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  },
};

// ================== TIKTOK ==================
async function downloadTikTok(url) {
  try {
    const tikwm = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const data = await tikwm.json();
    if (data.code === 0 && data.data) {
      return {
        success: true,
        platform: "TikTok",
        video_url: data.data.play || "",
        hd_video_url: data.data.hdplay || data.data.play || "",
        cover: data.data.cover || "",
        title: data.data.title || "",
        author: data.data.author || "",
        music: data.data.music || "",
        images: data.data.images || null,
      };
    }
  } catch (e) { console.log("TikWM falhou, tentando backup..."); }

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

  throw new Error("Nenhum método funcionou. Link inválido ou TikTok bloqueou.");
}

// ================== INSTAGRAM ==================
async function downloadInstagram(url) {
  try {
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
    throw new Error("Erro ao processar Instagram: " + error.message);
  }
}

// ================== FACEBOOK ==================
async function downloadFacebook(url) {
  try {
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
    throw new Error("Erro ao processar Facebook: " + error.message);
  }
}
