import { useEffect, useRef, useState } from 'react'; import Cms from './Cms'
import { ArrowDownRight, ArrowUpRight, ExternalLink, Gamepad2, Github, Mail, Map, Pause, Play, SkipBack, SkipForward, Sparkles, Terminal, Users, Volume2 } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { getSocialAvatars, logs, projects } from './data'
import { tracks } from './music.generated'
import { steamProfile as staticSteam } from './steam.generated'
import { fetchGitHubContributions } from './api'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const nav = [['about', 'ABOUT'], ['work', 'WORK'], ['moments', 'MOMENTS'], ['contact', 'CONTACT']]

function Header() {
  return <header className="site-header">
    <a className="brand" href="#top" aria-label="返回首页"><span className="brand-dot" />SAKURA.LOG</a>
    <nav aria-label="主导航">{nav.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
    <div className="header-status"><span /> OPEN TO NEW WORLDS</div>
  </header>
}

function SocialCardStack() {
  const avatars = getSocialAvatars()
  const [github, setGithub] = useState({ avatar: '', repos: '—', followers: '—', latest: 'loading…' })
  const [steamProfile] = useState(staticSteam)
  const [contribDots, setContribDots] = useState([1,2,3,2,4,1,3,4,2,3,1,4])
  const [order, setOrder] = useState(['vrchat', 'steam', 'github'])
  const stackRef = useRef(null)
  const cardRefs = useRef({})
  const animating = useRef(false)

  const positions = [
    { x: 75, y: 180, scale: 1.2, rotation: -1, zIndex: 5 },
    { x: 60, y: 0, scale: .88, rotation: 2.5, zIndex: 2 },
    { x: 65, y: 370, scale: .88, rotation: -7, zIndex: 1 },
  ]

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch(`https://api.github.com/users/${'SakuraChiyo0v0'}`, { signal: controller.signal }).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`https://api.github.com/users/${'SakuraChiyo0v0'}/repos?sort=updated&per_page=1`, { signal: controller.signal }).then(r => r.ok ? r.json() : Promise.reject()),
    ]).then(([user, repos]) => setGithub({ avatar: user.avatar_url, repos: user.public_repos, followers: user.followers, latest: repos[0]?.name || 'quietly building' })).catch(() => {})
    // 真实贡献数据
    fetchGitHubContributions().then((dots) => dots.length && setContribDots(dots))
    return () => controller.abort()
  }, [])

  useGSAP(() => {
    order.forEach((id, index) => gsap.set(cardRefs.current[id], positions[index]))
  }, { scope: stackRef })

  const activateCard = (id) => {
    const index = order.indexOf(id)
    if (index <= 0 || animating.current) return
    const nextOrder = [id, ...order.slice(index + 1), ...order.slice(0, index)]
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth <= 720) {
      nextOrder.forEach((cardId, position) => gsap.set(cardRefs.current[cardId], positions[position]))
      setOrder(nextOrder)
      return
    }
    animating.current = true
    const selected = cardRefs.current[id]
    const sideX = index === 1 ? -80 : 200
    const sideRotation = index === 1 ? -8 : 8
    const tl = gsap.timeline({ onComplete: () => { setOrder(nextOrder); animating.current = false } })
    // 侧向抽出
    tl.to(selected, { x: sideX, y: 140, scale: .95, rotation: sideRotation, duration: .22, ease: 'power2.in' })
      .set(selected, { zIndex: 7 })
    // 所有卡片弧线归位
    nextOrder.forEach((cardId, position) => tl.to(cardRefs.current[cardId], { ...positions[position], duration: .43, ease: 'power3.out' }, position === 0 ? '>-0.03' : '<'))
  }

  const onCardKeyDown = (event, id) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateCard(id) }
  }

  const cardProps = (id) => ({
    ref: (node) => { cardRefs.current[id] = node },
    role: 'button', tabIndex: 0,
    'aria-label': `${id} 信息卡${order[0] === id ? '，当前位于最前' : '，按回车切换到最前'}`,
    'data-position': order.indexOf(id),
    onClick: () => activateCard(id),
    onKeyDown: (event) => onCardKeyDown(event, id),
  })

  return <div ref={stackRef} className="social-stack is-deck" aria-label="我的社交平台卡组">
    <article className="social-card vrc-social" {...cardProps('vrchat')}>
      <div className="social-card-head"><span><Sparkles size={14}/> VRCHAT</span><small>PROFILE_01</small></div>
      <div className="social-main"><img className="platform-avatar" src={avatars.vrchat} alt="VRChat avatar" /><div><strong>SakuraChiyo</strong><p><i className="status-dot"/> wandering somewhere quiet</p></div></div>
      <div className="social-stats"><span><small>MOOD</small>Take it easy</span><span><small>WORLD</small>Private / Ask me</span></div>
      <a className="social-visit" href="https://vrchat.com/home/user/usr_be86c970-b8be-4953-8d06-b34be669e566" target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} aria-label="访问VRChat主页"><ExternalLink size={16}/></a>
    </article>
    <article className="social-card steam-social" {...cardProps('steam')}>
      <div className="social-card-head"><span><Gamepad2 size={14}/> STEAM</span><small>{steamProfile?.memberSince ? `SINCE ${steamProfile.memberSince.split(',')[1]?.trim() || steamProfile.memberSince}` : 'PLAYER_02'}</small></div>
      <div className="social-main">
        <img className="game-cover" src={avatars.steam} alt="Steam avatar"
          onError={(e) => { e.target.src = avatars.steam }} />
        <div><strong>SakuraChiyo</strong><p>
          <i className="status-dot"/>
          Online
        </p></div>
      </div>
      <div className="social-stats">
        <span><small>RECENTLY</small>{steamProfile?.games?.[0] ? `${steamProfile.games[0].name} · ${steamProfile.games[0].hoursTotal.toFixed(0)}h` : 'Waiting to sync'}</span>
        <span><small>ALSO</small>{steamProfile?.games?.[1] ? `${steamProfile.games[1].name} · ${steamProfile.games[1].hoursTotal.toFixed(0)}h` : 'Static preview'}</span>
      </div>
      <a className="social-visit" href="https://steamcommunity.com/profiles/76561199038682501/" target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} aria-label="访问Steam主页"><ExternalLink size={16}/></a>
    </article>
    <article className="social-card github-social" {...cardProps('github')}>
      <div className="social-card-head"><span><Github size={14}/> GITHUB</span><small>PUBLIC_API</small></div>
      <div className="social-main"><img className="platform-avatar" src={avatars.github} alt="SakuraChiyo0v0 GitHub avatar" /><div><strong>SakuraChiyo0v0</strong><p>latest / {github.latest}</p></div></div>
      <div className="social-stats"><span><small>REPOS</small>{github.repos}</span><span><small>FOLLOWERS</small>{github.followers}</span><div className="commit-dots" aria-label="近12周GitHub贡献热度">{contribDots.map((n,i)=><i key={i} data-level={n}/>)}</div></div>
      <a className="social-visit" href="https://github.com/SakuraChiyo0v0" target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} aria-label="访问GitHub主页"><ExternalLink size={16}/></a>
    </article>
  </div>
}

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function MusicPlayer() {
  const audioRef = useRef(null)
  const playerRef = useRef(null)
  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(.72)
  const track = tracks[trackIndex] || { src: '', title: 'No music yet', artist: 'Add MP3 files to public/music', cover: '' }
  const meta = { title: track.title, artist: track.artist, cover: track.cover }

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) { try { await audio.play() } catch { setPlaying(false) } }
    else audio.pause()
  }
  const changeTrack = (direction) => {
    const wasPlaying = playing
    setTrackIndex((index) => (index + direction + tracks.length) % tracks.length)
    setCurrentTime(0)
    requestAnimationFrame(() => { if (wasPlaying) audioRef.current?.play().catch(() => setPlaying(false)) })
  }

  return <aside ref={playerRef} className={`edge-player ${open ? 'is-open' : ''}`} aria-label="音乐播放器"
    onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
    onFocusCapture={() => setOpen(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
    <audio ref={audioRef} src={track.src} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onEnded={() => changeTrack(1)} />
    <button className="player-peek" onClick={() => setOpen(value => !value)} aria-label={open ? '收起播放器' : '展开播放器'} aria-expanded={open}>
      <span className={`peek-record ${playing ? 'is-spinning' : ''}`} style={meta.cover ? { backgroundImage: `url("${meta.cover}")` } : undefined}><i /></span>
      <span className="peek-status">{playing ? 'PLAYING' : 'PAUSED'}</span>
    </button>
    <div className="player-panel">
      <div className="player-heading"><span><i /> ROOM RADIO</span><small>{String(trackIndex + 1).padStart(2, '0')} / {String(tracks.length).padStart(2, '0')}</small></div>
      <div className="player-album">
        <div className={`player-record ${playing ? 'is-spinning' : ''}`} style={meta.cover ? { backgroundImage: `url("${meta.cover}")` } : undefined}><span /></div>
        <div className="player-meta"><strong title={meta.title}>{meta.title}</strong><span>{meta.artist}</span></div>
      </div>
      <input className="player-progress" type="range" min="0" max={duration || 0} step=".1" value={currentTime}
        onChange={(e) => { const time = Number(e.target.value); audioRef.current.currentTime = time; setCurrentTime(time) }} aria-label="播放进度" />
      <div className="player-time"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
      <div className="player-controls">
        <button onClick={() => changeTrack(-1)} aria-label="上一首"><SkipBack /></button>
        <button className="play-button" onClick={togglePlay} aria-label={playing ? '暂停' : '播放'}>{playing ? <Pause /> : <Play />}</button>
        <button onClick={() => changeTrack(1)} aria-label="下一首"><SkipForward /></button>
        <label className="volume-control"><Volume2 size={16}/><input type="range" min="0" max="1" step=".01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="音量" /></label>
      </div>
    </div>
  </aside>
}

function Hero() {
  return <section className="hero" id="top">
    <div className="hero-grid" aria-hidden="true" />
    <div className="petal petal-a" aria-hidden="true" /><div className="petal petal-b" aria-hidden="true" />
    <div className="hero-copy">
      <div className="eyebrow hero-reveal"><span>PERSONAL SPACE</span><span>EST. 2026</span></div>
      <p className="kicker hero-reveal">A SMALL CORNER OF THE INTERNET</p>
      <h1 className="hero-reveal">Hi, I'm<br/><span>Sakura</span>Chiyo.</h1>
      <p className="hero-intro hero-reveal">欢迎来到我的小小角落。<br/>这里有最近在做的东西、喜欢的风景，还有一些舍不得忘记的普通日子。</p>
      <div className="hero-actions hero-reveal">
        <a className="button button-dark magnetic" href="#about">ENTER MY SPACE <ArrowDownRight size={17}/></a>
        <a className="text-link" href="#work">VIEW MY WORK <ArrowUpRight size={15}/></a>
      </div>
    </div>
    <div className="hero-visual hero-reveal"><SocialCardStack/></div>
    <div className="terminal-bar hero-reveal"><span className="terminal-avatar">SC</span><span className="prompt">sakura@home:~$</span><span className="typed">take it easy --stay curious</span><span className="cursor" aria-hidden="true"/></div>
    <div className="scroll-note">SCROLL TO EXPLORE <ArrowDownRight size={14}/></div>
  </section>
}

function SectionTitle({ index, label, title, text }) {
  return <div className="section-title reveal"><div className="section-index">/ {index}</div><div><p className="eyebrow single">{label}</p><h2>{title}</h2>{text && <p className="section-lead">{text}</p>}</div></div>
}

function Identity() {
  return <section className="section identity" id="about">
    <SectionTitle index="01" label="A LITTLE ABOUT ME" title={<>Things that<br/>feel like home.</>} text="我喜欢安静地做点东西，也喜欢和有趣的人一起消磨时间。好奇心把这些看似无关的碎片，慢慢连成了现在的我。" />
    <div className="identity-cards">
      <article className="identity-card dev-card reveal-card"><div className="card-top"><Terminal/><span>01 / MAKING</span></div><div className="identity-number">✦</div><h3>Making small<br/>ideas tangible.</h3><p>享受把脑海里的小想法慢慢做出来。比起炫技，我更喜欢那些好用、好看，又有一点点生命力的东西。</p><div className="tag-row"><span>DESIGN</span><span>BUILDING</span><span>CURIOSITY</span></div></article>
      <article className="identity-card vr-card reveal-card"><div className="card-top"><Map/><span>02 / WANDERING</span></div><div className="identity-number">∞</div><h3>Going where<br/>the mood takes me.</h3><p>偶尔去陌生的地方散步，拍些照片，认识新朋友。比起抵达哪里，我更在意和谁一起看过风景。</p><div className="tag-row"><span>WORLDS</span><span>PHOTOS</span><span>FRIENDS</span></div></article>
    </div>
  </section>
}

function Projects() {
  return <section className="section projects" id="work">
    <SectionTitle index="02" label="RECENTLY COLLECTED" title={<>Things on<br/>my desk.</>} />
    <div className="project-track">
      {projects.map((project) => <article className={`project-card tone-${project.tone}`} key={project.title}>
        <div className="project-meta"><span>{project.no} / 03</span><span>{project.type}</span></div>
        <div className="project-window"><div className="window-bar"><i/><i/><i/></div><div className="window-art"><span>{project.no}</span><div className="project-shape"/></div></div>
        <h3>{project.title}</h3><p>{project.text}</p><div className="project-bottom"><div className="tag-row">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div><button aria-label={`查看 ${project.title}，示例项目`}><ArrowUpRight/></button></div>
      </article>)}
    </div>
    <p className="placeholder-note">* 这里会慢慢换成真实的作品、实验和最近喜欢的东西。</p>
  </section>
}

function LifeLog() {
  return <section className="section life" id="moments">
    <SectionTitle index="03" label="CURRENT STATUS" title={<>A quiet little<br/>life log.</>} />
    <div className="log-layout">
      <div className="log-list">{logs.map((log, i) => <article className="log-item reveal" key={log.time}><span>0{i+1}</span><div><small>{log.time}</small><h3>{log.title}</h3><p>{log.text}</p></div><ArrowUpRight/></article>)}</div>
      <aside className="now-card currently-card reveal"><div className="now-head"><span className="pulse-dot"/> CURRENTLY</div><div className="currently-mark">水</div><p className="currently-date">WEDNESDAY · 05:20 AM</p><blockquote>“慢一点也没关系。<br/>今天只做一件真正喜欢的事。”</blockquote><div className="currently-tags"><span>天气 / 微凉</span><span>心情 / 平静</span></div><small>POSTED FROM SAKURA'S ROOM</small></aside>
    </div>
  </section>
}

function Memories() {
  const cards = ['late night walk', 'a soft blue world', 'see you again']
  return <section className="section memories">
    <SectionTitle index="04" label="MEMORY FRAGMENTS" title={<>Moments worth<br/>keeping.</>} text="画廊还在慢慢整理。先留三个位置，给未来的世界、朋友和我们笑得很好看的瞬间。" />
    <div className="polaroid-stage">{cards.map((caption, i) => <figure className={`polaroid photo-${i+1}`} key={caption}><div className="photo-art"><span>0{i+1}</span></div><figcaption>{caption}<small>MEMORY // 2026</small></figcaption></figure>)}</div>
    <div className="gallery-coming reveal"><Users/><span>FULL GALLERY</span><strong>COMING SOON</strong><ArrowUpRight/></div>
  </section>
}

function Contact() {
  return <footer className="contact" id="contact"><div className="contact-grid" aria-hidden="true"/>
    <p className="eyebrow single reveal">LET'S CONNECT</p><h2 className="reveal">Meet me<br/><span>somewhere.</span></h2><p className="contact-copy reveal">如果你觉得这里有一点熟悉，或者只是想找个人聊聊天、一起散步——都欢迎来打个招呼。</p>
    <div className="contact-links reveal"><a className="magnetic" href="https://github.com/" target="_blank" rel="noreferrer"><Github/> GITHUB <ArrowUpRight/></a><a className="magnetic" href="https://vrchat.com/" target="_blank" rel="noreferrer"><Sparkles/> VRCHAT <ArrowUpRight/></a><a className="magnetic" href="mailto:hello@example.com"><Mail/> EMAIL <ArrowUpRight/></a></div>
    <div className="footer-line"><span>© 2026 SAKURACHIYO</span><span>MADE SLOWLY, WITH SOFT THOUGHTS</span><a href="#top">BACK TO TOP ↑</a></div>
  </footer>
}

export default function App() {
  const root = useRef(null)
  const [isCms, setIsCms] = useState(window.location.pathname === '/cms')

  useEffect(() => {
    const handlePopstate = () => setIsCms(window.location.pathname === '/cms')
    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [])

  if (isCms) {
    return <Cms />
  }

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ desktop: '(min-width: 900px)', reduce: '(prefers-reduced-motion: reduce)' }, ({ conditions }) => {
      const { desktop, reduce } = conditions
      if (reduce) return
      gsap.timeline({ defaults: { ease: 'power3.out' } }).from('.site-header', { y: -24, autoAlpha: 0, duration: .7 }).from('.hero-reveal', { y: 36, autoAlpha: 0, duration: .85, stagger: .09 }, '-=.35').from('.scroll-note', { autoAlpha: 0, duration: .5 }, '-=.2')
      gsap.from('.social-card', { x: 70, rotation: 4, autoAlpha: 0, duration: .75, stagger: .1, ease: 'power3.out', delay: .65 })
      gsap.utils.toArray('.reveal').forEach((el) => gsap.from(el, { y: 44, autoAlpha: 0, duration: .8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 84%', once: true } }))
      gsap.from('.reveal-card', { y: 80, rotation: (i) => i ? 4 : -4, autoAlpha: 0, stagger: .15, scrollTrigger: { trigger: '.identity-cards', start: 'top 78%', end: 'bottom 75%', scrub: 1 } })
      gsap.to('.project-track', { x: () => desktop ? -(document.querySelector('.project-track').scrollWidth - window.innerWidth + 120) : 0, ease: 'none', scrollTrigger: desktop ? { trigger: '.projects', start: 'top top', end: '+=1900', pin: true, scrub: 1, invalidateOnRefresh: true } : undefined })
      gsap.from('.polaroid', { x: 0, y: 70, rotation: 0, stagger: .1, scrollTrigger: { trigger: '.polaroid-stage', start: 'top 78%', end: 'center 55%', scrub: 1 } })
    }, root)
    return () => mm.revert()
  }, { scope: root })

  return <div ref={root}><a className="skip-link" href="#about">跳到主要内容</a><Header/><MusicPlayer/><main><Hero/><Identity/><Projects/><LifeLog/><Memories/></main><Contact/></div>
}
