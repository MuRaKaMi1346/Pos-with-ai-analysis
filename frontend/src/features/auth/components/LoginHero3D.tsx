import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'

/** Auto-rotation speed in radians per second (pos-ui-motion §4.7). */
const AUTO_ROTATE = 0.3

/** Low-poly cup from primitives — cylinder body, torus rim, cylinder handle. */
function Cup() {
  const ref = useRef<Group>(null)
  const [running, setRunning] = useState(true)

  // Pause the spin while the tab is hidden to save the GPU.
  useEffect(() => {
    function onVisibility(): void {
      setRunning(!document.hidden)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useFrame((_, delta) => {
    if (ref.current && running) ref.current.rotation.y += AUTO_ROTATE * delta
  })

  return (
    <group ref={ref} rotation={[0.25, 0.6, 0]}>
      {/* body */}
      <mesh>
        <cylinderGeometry args={[0.95, 0.72, 1.7, 6]} />
        <meshStandardMaterial color="#7c5a3e" flatShading />
      </mesh>
      {/* rim */}
      <mesh position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.12, 6, 6]} />
        <meshStandardMaterial color="#4b3621" flatShading />
      </mesh>
      {/* handle */}
      <mesh position={[1.05, 0, 0]} rotation={[0, 0, Math.PI / 2.4]}>
        <cylinderGeometry args={[0.11, 0.11, 1.0, 6]} />
        <meshStandardMaterial color="#4b3621" flatShading />
      </mesh>
    </group>
  )
}

/**
 * The optional 3D login hero — the only place R3F is used. Lazy-loaded so the
 * rest of the app never pays for three.js. Bare R3F (no drei) to keep the chunk
 * lean; soft warm lighting over a slowly-rotating low-poly cup.
 */
export default function LoginHero3D() {
  return (
    <Canvas
      className="!absolute inset-0"
      camera={{ position: [0, 0.4, 4.2], fov: 42 }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 2]} intensity={1.2} color="#fff1de" />
      <Cup />
    </Canvas>
  )
}
