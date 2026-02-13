// api/index.js
// 这是一个运行在 Vercel 上的无服务器函数

export default async function handler(request, response) {
  // 获取 URL 里的关键词，例如 ?keyword=稻香
  const { keyword } = request.query;

  // 如果没给关键词，就返回空
  if (!keyword) {
    return response.status(200).json({ code: 404, msg: "No keyword", data: [] });
  }

  try {
    // 1. 伪装成浏览器，去请求网易云的老版搜索接口 (这个接口非常稳定且不需要 Key)
    // type=1 表示搜单曲，limit=5 表示只取前5个结果（防止机器狗内存溢出）
    const targetUrl = `http://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=5`;
    
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://music.163.com/'
      }
    });
    
    const data = await res.json();

    // 2. 检查有没有搜到歌
    if (!data.result || !data.result.songs) {
      return response.status(200).json({ code: 200, msg: "No songs found", data: [] });
    }

    // 3. 【关键步骤】清洗数据
    // 我们把复杂的数据重新组装成机器狗喜欢的简单格式
    const cleanList = data.result.songs.map(song => {
      return {
        // 歌名
        name: song.name,
        // 歌手 (如果有多个歌手，用 / 连起来)
        singer: song.artists.map(a => a.name).join('/'),
        // 专辑封面
        pic: song.album.picUrl,
        // 【核心】利用网易云的隐藏规则，直接通过 ID 拼出 MP3 链接
        // 这种链接是 HTTP 的，对 ESP32 这种单片机非常友好（解码压力小）
        url: `http://music.163.com/song/media/outer/url?id=${song.id}.mp3`,
        // 歌词暂空，反正狗也显示不了
        lrc: ""
      };
    });

    // 4. 返回清洗后的数据
    response.status(200).json({
      code: 200,
      msg: "Success",
      data: cleanList
    });

  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}