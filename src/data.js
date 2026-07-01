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

// -- Mock avatar data ------------------------------------------------
// 上线时替换为真实数据源（API / CMS / 本地资源）
export function getSocialAvatars() {
  return {
    vrchat: '/images/avatar-vrchat.png',
    steam: '/images/avatar-steam.png',
    github: '/images/avatar-github.png',
  }
}
