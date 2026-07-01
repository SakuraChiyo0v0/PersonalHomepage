export const projects = [
  { no: '01', title: 'Quiet Index', type: 'Little Archive', text: '把散落的灵感、书签和随手记下的句子，整理成可以慢慢生长的数字花园。', tags: ['NOTES', 'COLLECTION', 'WEB'], tone: 'pink' },
  { no: '02', title: 'World Hopper', type: 'Travel Notes', text: '记录去过的世界、一起散步的人、沿途拍下的照片，以及下次见面的约定。', tags: ['WORLDS', 'PHOTOS', 'MEMORY'], tone: 'mint' },
  { no: '03', title: 'Night Radio', type: 'Midnight Mood', text: '一个适合深夜独处的环境电台，让界面、声音和时间一起缓慢流动。', tags: ['MUSIC', 'MIDNIGHT', 'AMBIENT'], tone: 'blue' },
]

export const logs = [
  { time: 'NOW', title: 'Building this little corner', text: '正在给自己的互联网小房间装灯、贴贴纸、整理第一批收藏。' },
  { time: 'LATE NIGHT', title: 'Getting pleasantly lost', text: '偶尔在陌生的世界里散步，也很喜欢认识温柔又有趣的人。' },
  { time: 'ALWAYS', title: 'Learning by making', text: '偏爱把刚学会的东西，变成看得见、摸得着、会回应的小玩意。' },
]

// -- Avatar 数据，Steam 头像优先用社区 API 返回的 URL ---------------------
// Steam: https://avatars.fastly.steamstatic.com/18ef0d03b4f3cce930e247680dfb868128c34d17.jpg
// GitHub: 由 API 动态获取
// VRChat: 暂缺（需认证），使用占位
export function getSocialAvatars() {
  return {
    vrchat: '/images/avatar-vrchat.png',
    steam: '/images/avatar-steam.png',
    github: '/images/avatar-github.jpg',
  }
}
