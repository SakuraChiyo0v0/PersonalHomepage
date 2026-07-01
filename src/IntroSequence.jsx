import { useCallback, useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const frames = [
  '/intro/01-sitting.webp',
  '/intro/02-far.webp',
  '/intro/03-back.webp',
  '/intro/04-front.webp',
  '/intro/05-close.webp',
  '/intro/06-closer.webp',
]

export default function IntroSequence() {
  const root = useRef(null)
  const timeline = useRef(null)
  const [visible, setVisible] = useState(true)

  const finish = useCallback(() => {
    document.documentElement.classList.remove('intro-is-playing')
    setVisible(false)
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('intro-is-playing')
    return () => document.documentElement.classList.remove('intro-is-playing')
  }, [])

  useGSAP(() => {
    if (!visible) return

    const images = gsap.utils.toArray('.intro-frame')
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: finish,
    })

    timeline.current = tl
    gsap.set(images, { autoAlpha: 0, scale: 1.018 })
    gsap.set(images[0], { autoAlpha: 1, scale: 1 })

    tl.fromTo('.intro-copy', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .7 })
      .to('.intro-copy', { autoAlpha: 0, duration: .35 }, '+=.35')

    images.slice(1).forEach((image, index) => {
      const previous = images[index]
      const isCloseUp = index >= 3
      const fadeDuration = isCloseUp ? .48 : .7
      const hold = isCloseUp ? .4 : .62

      tl.addLabel(`frame-${index + 2}`)
        .to(previous, { autoAlpha: .2, scale: 1.012, duration: fadeDuration }, `frame-${index + 2}`)
        .fromTo(image,
          { autoAlpha: 0, scale: 1.02 },
          { autoAlpha: 1, scale: 1, duration: fadeDuration },
          `frame-${index + 2}+=.08`,
        )
        .to(previous, { autoAlpha: 0, duration: .35 }, `frame-${index + 2}+=${fadeDuration + .05}`)
        .to({}, { duration: hold })
    })

    tl.to('.intro-flash', { autoAlpha: 1, duration: .07, ease: 'power4.in' })
      .to('.intro-flash', { autoAlpha: 0, duration: .38, ease: 'power2.out' })
      .to(root.current, { autoAlpha: 0, duration: .8, ease: 'power2.inOut' }, '-=.08')

    return () => tl.kill()
  }, { scope: root, dependencies: [visible, finish] })

  const skip = () => {
    timeline.current?.kill()
    gsap.to(root.current, { autoAlpha: 0, duration: .35, ease: 'power2.out', onComplete: finish })
  }

  if (!visible) return null

  return (
    <section ref={root} className="intro-sequence" aria-label="网站开场动画">
      <div className="intro-stage" aria-hidden="true">
        {frames.map((src, index) => (
          <img
            className="intro-frame"
            src={src}
            alt=""
            key={src}
            loading={index < 2 ? 'eager' : 'auto'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />
        ))}
      </div>
      <div className="intro-vignette" aria-hidden="true" />
      <p className="intro-copy">A SMALL MEMORY<br/><span>BEFORE WE BEGIN</span></p>
      <button className="intro-skip" type="button" onClick={skip}>跳过 <span>SKIP</span></button>
      <div className="intro-flash" aria-hidden="true" />
    </section>
  )
}
