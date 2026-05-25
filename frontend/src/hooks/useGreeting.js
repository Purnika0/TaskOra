// src/hooks/useGreeting.js
import { useState, useEffect } from 'react'

const STUDENT_SUBS = [
    "Ready to tackle your assignments today?",
    "One task at a time. You've got this.",
    "Debug, deploy, dominate. 🚀",
    "Push to main. Carpe diem.",
    ]

const TEACHER_SUBS = [
    "Your students are counting on you.",
    "Shape the next generation of developers.",
    "Another day, another great lecture.",
]

function greeting(h) {
    if (h < 12) return 'Good Morning'
    if (h < 18) return 'Good Afternoon'
    return 'Good Evening'
}

export function useGreeting(role = 'student') {
    const [text, setText] = useState('')
    const [sub,  setSub]  = useState('')

    useEffect(() => {
    function update() {
        setText(greeting(new Date().getHours()))
        const pool = role === 'teacher' ? TEACHER_SUBS : STUDENT_SUBS
      setSub(pool[Math.floor(Math.random() * pool.length)])
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
    }, [role])

    return { greeting: text, subtitle: sub }
    }
