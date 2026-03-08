"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float, Sphere, MeshDistortMaterial } from "@react-three/drei"
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing"
import * as THREE from "three"

function FloatingOrb({ position, color, speed = 1, distort = 0.3, size = 1 }: {
    position: [number, number, number]
    color: string
    speed?: number
    distort?: number
    size?: number
}) {
    const meshRef = useRef<THREE.Mesh>(null!)

    useFrame(({ clock }) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * speed * 0.3) * 0.2
            meshRef.current.rotation.y += 0.003 * speed
        }
    })

    return (
        <Float speed={speed} rotationIntensity={0.5} floatIntensity={0.8}>
            <Sphere ref={meshRef} args={[size, 64, 64]} position={position}>
                <MeshDistortMaterial
                    color={color}
                    roughness={0.2}
                    metalness={0.8}
                    distort={distort}
                    speed={speed * 2}
                    transparent
                    opacity={0.7}
                />
            </Sphere>
        </Float>
    )
}

function ParticleField() {
    const count = 200
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 20
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20
        }
        return pos
    }, [])

    const pointsRef = useRef<THREE.Points>(null!)

    useFrame(({ clock }) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y = clock.getElapsedTime() * 0.02
            pointsRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.01) * 0.1
        }
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                color="#E5E6DA"
                size={0.03}
                transparent
                opacity={0.4}
                sizeAttenuation
            />
        </points>
    )
}

export default function SceneBackground() {
    return (
        <div className="fixed inset-0 -z-5 pointer-events-none" style={{ opacity: 0.7 }}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: "transparent" }}
            >
                <ambientLight intensity={0.3} />
                <directionalLight position={[5, 5, 5]} intensity={0.5} color="#E5E6DA" />
                <pointLight position={[-3, 2, 4]} intensity={0.8} color="#DF6C42" />

                {/* Main orbs */}
                <FloatingOrb position={[-3, 1.5, -2]} color="#DF6C42" speed={0.8} distort={0.4} size={1.2} />
                <FloatingOrb position={[3.5, -1, -3]} color="#E5E6DA" speed={0.5} distort={0.2} size={0.8} />
                <FloatingOrb position={[0, -2.5, -4]} color="#DF6C42" speed={0.6} distort={0.3} size={0.5} />

                {/* Particle field */}
                <ParticleField />

                {/* Post-processing */}
                <EffectComposer>
                    <Bloom
                        intensity={0.8}
                        luminanceThreshold={0.6}
                        luminanceSmoothing={0.9}
                        mipmapBlur
                    />
                    <Vignette eskil={false} offset={0.1} darkness={0.6} />
                </EffectComposer>
            </Canvas>
        </div>
    )
}
