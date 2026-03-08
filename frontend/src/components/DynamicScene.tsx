"use client"

import dynamic from "next/dynamic"

const SceneBackground = dynamic(() => import("@/components/SceneBackground"), {
    ssr: false,
    loading: () => null,
})

export default function DynamicScene() {
    return <SceneBackground />
}
