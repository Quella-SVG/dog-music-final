// api/index.js
// 最终版：切换至咪咕音乐 (Migu)
// 优势：周杰伦的歌在咪咕很多是免费的，不需要 VIP 也能拿链接

export default async function handler(request, response) {
  const { keyword } = request.query;

  if (!keyword) {
    return response.status(200).json({ code: 404, msg: "No keyword", data: [] });
  }

  try {
    // 1. 请求咪咕的公开搜索接口
    const searchUrl = `https://m.music.migu.cn/migu/remoting/scr_search_tag?rows=10&type=2&keyword=${encodeURIComponent(keyword)}&pgc=1`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'Referer': 'https://m.music.migu.cn/',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
      }
    });
    
    const json = await res.json();

    // 2. 检查结果
    if (!json.musics) {
      return response.status(200).json({ code: 200, msg: "Migu: No songs found", data: [] });
    }

    // 3. 清洗数据 (咪咕直接返回 mp3 链接，非常爽)
    const cleanList = json.musics.map(song => {
      // 只有当有 mp3 链接时才返回
      if (song.mp3) {
        return {
          name: song.songName,
          singer: song.singerName,
          pic: song.cover,
          url: song.mp3, // 咪咕直接送了 mp3 链接
          lrc: ""        // 咪咕歌词格式比较复杂，先置空
        };
      }
      return null;
    }).filter(item => item !== null); // 过滤掉无效的

    response.status(200).json({
      code: 200,
      msg: "Success (Migu)",
      data: cleanList
    });

  } catch (error) {
    response.status(500).json({ error: "Server Error: " + error.message });
  }
}
