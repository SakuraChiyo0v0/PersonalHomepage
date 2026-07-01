import { useCallback, useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const frameDefaults = {
  fade: .7,
  hold: .62,
  trail: .2,
  scaleFrom: 1.02,
  scaleTo: 1,
  objectPosition: 'center',
  flash: false,
}

const frames = [
  { src: '/intro/01-sitting.webp', label: '坐姿背影', hold: 0 },
  { src: '/intro/02-far.webp', label: '远处背影' },
  { src: '/intro/03-back.webp', label: '右侧背影' },
  { src: '/intro/04-front.webp', label: '正面中景' },
  { src: '/intro/05-close.webp', label: '正面近景', fade: .48, hold: .4 },
  { src: '/intro/06-closer.webp', label: '超近景', fade: .48, hold: .4, flash: true },
]

const getFrame = (index) => ({ ...frameDefaults, ...frames[index] })

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
    const firstFrame = getFrame(0)
    gsap.set(images, { autoAlpha: 0, scale: frameDefaults.scaleFrom })
    gsap.set(images[0], { autoAlpha: 1, scale: firstFrame.scaleTo })

    tl.fromTo('.intro-copy', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .7 })
      .to('.intro-copy', { autoAlpha: 0, duration: .35 }, '+=.35')
      .to({}, { duration: firstFrame.hold })

    images.slice(1).forEach((image, index) => {
      const previous = images[index]
      const previousFrame = getFrame(index)
      const frame = getFrame(index + 1)
      const label = `frame-${index + 2}`

      tl.addLabel(label)
        .to(previous, {
          autoAlpha: frame.trail,
          scale: previousFrame.scaleTo * 1.012,
          duration: frame.fade,
        }, label)
        .fromTo(image,
          { autoAlpha: 0, scale: frame.scaleFrom },
          { autoAlpha: 1, scale: frame.scaleTo, duration: frame.fade },
          `${label}+=.08`,
        )
        .to(previous, { autoAlpha: 0, duration: .35 }, `${label}+=${frame.fade + .05}`)
        .to({}, { duration: frame.hold })

      if (frame.flash) {
        tl.to('.intro-flash', { autoAlpha: 1, duration: .07, ease: 'power4.in' })
          .to('.intro-flash', { autoAlpha: 0, duration: .38, ease: 'power2.out' })
      }
    })

    tl.to(root.current, { autoAlpha: 0, duration: .8, ease: 'power2.inOut' }, '-=.08')

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
        {frames.map((frame, index) => (
          <img
            className="intro-frame"
            src={frame.src}
            alt=""
            key={frame.src}
            style={{ objectPosition: frame.objectPosition || frameDefaults.objectPosition }}
            data-frame-label={frame.label}
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
