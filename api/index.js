// api/index.js
// 增强版：使用 cloudsearch 接口 + 伪造 Cookie

export default async function handler(request, response) {
  const { keyword } = request.query;

  // 1. 如果没有关键词，返回提示
  if (!keyword) {
    return response.status(200).json({ code: 404, msg: "请在网址后面加上 ?keyword=歌名", data: [] });
  }

  try {
    // 2. 换用 cloudsearch 接口，这个接口比之前的更稳定
    const targetUrl = `http://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(keyword)}&type=1&offset=0&limit=5`;
    
    const res = await fetch(targetUrl, {
      method: 'POST', // 改用 POST 方式，甚至不需要 body，有时能骗过防火墙
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'http://music.163.com/',
        'Cookie': 'os=pc; osver=Microsoft-Windows-10-Professional-build-10586-64bit; appver=2.0.3.131777; channel=netease;'
      }
    });
    
    const data = await res.json();

    // 3. 检查结果
    if (!data.result || !data.result.songs) {
      // 如果还是空的，尝试打印一下具体原因（调试用）
      console.log("网易云返回数据异常:", JSON.stringify(data));
      return response.status(200).json({ code: 200, msg: "No songs found (IP可能是被限制了，请稍后再试)", data: [] });
    }

    // 4. 清洗数据
    const cleanList = data.result.songs.map(song => {
      return {
        name: song.name,
        singer: song.ar ? song.ar.map(a => a.name).join('/') : "未知歌手",
        pic: song.al ? song.al.picUrl : "",
        // MP3 直链
        url: `http://music.163.com/song/media/outer/url?id=${song.id}.mp3`,
        lrc: ""
      };
    });

    response.status(200).json({
      code: 200,
      msg: "Success",
      data: cleanList
    });

  } catch (error) {
    response.status(500).json({ error: "服务器内部错误: " + error.message });
  }
}
